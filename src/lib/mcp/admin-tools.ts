/**
 * Read-only admin tools for the Claude connector (/api/mcp).
 *
 * Every query selects its fields explicitly: password hashes, reset and
 * verification tokens and session versions are never read here. Each call is
 * recorded in McpAuditLog. Amounts are OMR; times are ISO-8601 UTC.
 */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type Ctx = { userId: string; clientId: string };

const STAGES = ['NEW', 'CONTACTED', 'OFFER_SENT', 'FOLLOW_UP', 'NEGOTIATING', 'WON', 'LOST'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const OPEN_STAGES = STAGES.filter((s) => s !== 'WON' && s !== 'LOST');

const since = (days?: number) => (days ? new Date(Date.now() - days * 86_400_000) : undefined);
const name = (u: { firstName?: string | null; lastName?: string | null } | null | undefined) =>
  u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null;
const clip = (s: string | null | undefined, n = 300) => (s && s.length > n ? `${s.slice(0, n)}…` : s ?? null);
const round3 = (n: number | null | undefined) => Math.round((n ?? 0) * 1000) / 1000;

/** Each word must match one of the fields ("musab al" finds Musab Al Sabahi). */
function wordsMatch(query: string, fields: string[]) {
  const words = query.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  return words.map((w) => ({ OR: fields.map((f) => ({ [f]: { contains: w, mode: 'insensitive' as const } })) }));
}

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export function registerAdminTools(server: McpServer, ctx: Ctx) {
  // Wraps a handler so every call lands in the audit log (best effort, never blocks).
  const audited =
    <A,>(tool: string, fn: (args: A) => Promise<ReturnType<typeof ok>>) =>
    async (args: A) => {
      prisma.mcpAuditLog
        .create({ data: { userId: ctx.userId, clientId: ctx.clientId, tool, args: (args ?? {}) as Prisma.InputJsonValue } })
        .catch(() => {});
      return fn(args);
    };

  server.registerTool(
    'get_overview',
    {
      title: 'Business overview',
      description:
        'Snapshot of FutureLine for a period: new users, leads by stage, follow-ups due, orders and revenue (OMR), enrolments and emails sent. Use first for questions like "how are we doing this month?".',
      inputSchema: { days: z.number().int().min(1).max(3650).default(30).describe('Look back this many days (default 30)') },
      annotations: { title: 'Business overview', ...READ_ONLY },
    },
    audited('get_overview', async ({ days }: { days: number }) => {
      const from = since(days)!;
      const now = new Date();
      const [usersTotal, usersNew, leadsByStage, leadsNew, followUpsDue, ordersPeriod, revenueAll, enrolNew, enrolTotal, emails] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { createdAt: { gte: from } } }),
          prisma.lead.groupBy({ by: ['stage'], _count: { _all: true } }),
          prisma.lead.count({ where: { createdAt: { gte: from } } }),
          prisma.lead.count({ where: { nextFollowUpAt: { lte: now }, stage: { in: [...OPEN_STAGES] } } }),
          prisma.order.groupBy({ by: ['paymentStatus'], where: { createdAt: { gte: from } }, _count: { _all: true }, _sum: { amount: true } }),
          prisma.order.aggregate({ where: { paymentStatus: 'COMPLETED' }, _sum: { amount: true }, _count: { _all: true } }),
          prisma.enrollment.count({ where: { createdAt: { gte: from } } }),
          prisma.enrollment.count(),
          prisma.emailLog.groupBy({ by: ['status'], where: { createdAt: { gte: from } }, _count: { _all: true } }),
        ]);
      const completed = ordersPeriod.find((o) => o.paymentStatus === 'COMPLETED');
      return ok({
        period: { days, from: from.toISOString(), to: now.toISOString() },
        currency: 'OMR',
        users: { total: usersTotal, newInPeriod: usersNew },
        leads: {
          newInPeriod: leadsNew,
          followUpsDueNow: followUpsDue,
          byStage: Object.fromEntries(leadsByStage.map((l) => [l.stage, l._count._all])),
        },
        orders: {
          inPeriodByStatus: Object.fromEntries(
            ordersPeriod.map((o) => [o.paymentStatus, { count: o._count._all, amount: round3(o._sum.amount) }]),
          ),
          revenueInPeriod: round3(completed?._sum.amount),
          revenueAllTime: round3(revenueAll._sum.amount),
          completedOrdersAllTime: revenueAll._count._all,
        },
        enrolments: { newInPeriod: enrolNew, total: enrolTotal },
        emailsSentInPeriodByStatus: Object.fromEntries(emails.map((e) => [e.status, e._count._all])),
        note: 'Email counts start from when the email log was added.',
      });
    }),
  );

  server.registerTool(
    'search_people',
    {
      title: 'Search clients and leads',
      description: 'Finds registered users (clients, instructors, admins) and leads by name, email, phone or company. Every word must match.',
      inputSchema: {
        query: z.string().min(2).max(100).describe('Name, email, phone or company'),
        limit: z.number().int().min(1).max(50).default(15),
      },
      annotations: { title: 'Search clients and leads', ...READ_ONLY },
    },
    audited('search_people', async ({ query, limit }: { query: string; limit: number }) => {
      const [users, leads] = await Promise.all([
        prisma.user.findMany({
          where: { AND: wordsMatch(query, ['firstName', 'lastName', 'email']) },
          select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
        prisma.lead.findMany({
          where: { AND: wordsMatch(query, ['firstName', 'lastName', 'email', 'phone', 'company']) },
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, stage: true, priority: true, source: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: limit,
        }),
      ]);
      return ok({
        users: users.map((u) => ({ id: u.id, name: name(u), email: u.email, role: u.role, active: u.isActive, joined: u.createdAt })),
        leads: leads.map((l) => ({ id: l.id, name: name(l), email: l.email, phone: l.phone, company: l.company, stage: l.stage, priority: l.priority, source: l.source, created: l.createdAt })),
      });
    }),
  );

  server.registerTool(
    'list_users',
    {
      title: 'List users',
      description: 'Registered accounts, newest first, optionally by role or sign-up date. Includes how many orders and enrolments each has.',
      inputSchema: {
        role: z.enum(['ADMIN', 'INSTRUCTOR', 'CUSTOMER']).optional(),
        days: z.number().int().min(1).max(3650).optional().describe('Only users who joined in the last N days'),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { title: 'List users', ...READ_ONLY },
    },
    audited('list_users', async ({ role, days, limit, offset }: { role?: 'ADMIN' | 'INSTRUCTOR' | 'CUSTOMER'; days?: number; limit: number; offset: number }) => {
      const where: Prisma.UserWhereInput = { ...(role ? { role } : {}), ...(days ? { createdAt: { gte: since(days) } } : {}) };
      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, emailVerified: true, createdAt: true,
            _count: { select: { orders: true, enrollments: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
      ]);
      return ok({
        total,
        users: users.map((u) => ({
          id: u.id, name: name(u), email: u.email, role: u.role, active: u.isActive, emailVerified: !!u.emailVerified,
          joined: u.createdAt, orders: u._count.orders, enrolments: u._count.enrollments,
        })),
      });
    }),
  );

  server.registerTool(
    'get_client',
    {
      title: 'Client profile',
      description:
        'Everything about one person: account, orders and payments, enrolments with progress, leads with the same email, and recent emails sent to them. Give an email or a user id.',
      inputSchema: {
        email: z.string().email().optional(),
        userId: z.string().min(5).max(40).optional(),
      },
      annotations: { title: 'Client profile', ...READ_ONLY },
    },
    audited('get_client', async ({ email, userId }: { email?: string; userId?: string }) => {
      if (!email && !userId) return ok({ error: 'Give an email or a userId.' });
      const user = await prisma.user.findFirst({
        where: userId ? { id: userId } : { email: { equals: email!, mode: 'insensitive' } },
        select: {
          id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, emailVerified: true, createdAt: true, bio: true,
          orders: {
            select: { id: true, amount: true, paymentStatus: true, paymentMethod: true, gatewayReference: true, paidAt: true, createdAt: true, course: { select: { title: true, slug: true } } },
            orderBy: { createdAt: 'desc' },
          },
          enrollments: {
            select: { progressPercentage: true, completed: true, createdAt: true, course: { select: { title: true, slug: true } }, _count: { select: { lessonProgress: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      const address = user?.email ?? email!;
      const [leads, emails] = await Promise.all([
        prisma.lead.findMany({
          where: { email: { equals: address, mode: 'insensitive' } },
          select: { id: true, stage: true, priority: true, source: true, tourType: true, createdAt: true, nextFollowUpAt: true, lastContactedAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.emailLog.findMany({
          where: { to: { equals: address, mode: 'insensitive' } },
          select: { subject: true, type: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);
      if (!user && leads.length === 0) return ok({ found: false, message: `No user or lead with ${address}.` });
      return ok({
        user: user
          ? {
              id: user.id, name: name(user), email: user.email, role: user.role, active: user.isActive,
              emailVerified: !!user.emailVerified, joined: user.createdAt, bio: clip(user.bio),
            }
          : null,
        orders: user?.orders.map((o) => ({
          id: o.id, course: o.course.title, amount: o.amount, status: o.paymentStatus, method: o.paymentMethod,
          reference: o.gatewayReference, paidAt: o.paidAt, created: o.createdAt,
        })) ?? [],
        enrolments: user?.enrollments.map((e) => ({
          course: e.course.title, progressPercent: e.progressPercentage, completed: e.completed, lessonsDone: e._count.lessonProgress, enrolled: e.createdAt,
        })) ?? [],
        leads: leads.map((l) => ({ id: l.id, stage: l.stage, priority: l.priority, source: l.source, topic: l.tourType, created: l.createdAt, nextFollowUp: l.nextFollowUpAt, lastContacted: l.lastContactedAt })),
        recentEmails: emails,
      });
    }),
  );

  server.registerTool(
    'list_leads',
    {
      title: 'List leads',
      description: 'The sales pipeline, newest first. Filter by stage, priority, source, a search word, how recent, or only those whose follow-up date has passed.',
      inputSchema: {
        stage: z.enum(STAGES).optional(),
        priority: z.enum(PRIORITIES).optional(),
        source: z.string().max(60).optional(),
        followUpDue: z.boolean().optional().describe('Only open leads whose follow-up date has passed'),
        search: z.string().max(100).optional(),
        days: z.number().int().min(1).max(3650).optional().describe('Only leads created in the last N days'),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { title: 'List leads', ...READ_ONLY },
    },
    audited('list_leads', async (a: { stage?: (typeof STAGES)[number]; priority?: (typeof PRIORITIES)[number]; source?: string; followUpDue?: boolean; search?: string; days?: number; limit: number; offset: number }) => {
      const where: Prisma.LeadWhereInput = {
        ...(a.stage ? { stage: a.stage } : {}),
        ...(a.priority ? { priority: a.priority } : {}),
        ...(a.source ? { source: { contains: a.source, mode: 'insensitive' } } : {}),
        ...(a.days ? { createdAt: { gte: since(a.days) } } : {}),
        ...(a.followUpDue ? { nextFollowUpAt: { lte: new Date() }, stage: { in: [...OPEN_STAGES] } } : {}),
        ...(a.search ? { AND: wordsMatch(a.search, ['firstName', 'lastName', 'email', 'company', 'message']) } : {}),
      };
      const [total, leads] = await Promise.all([
        prisma.lead.count({ where }),
        prisma.lead.findMany({
          where,
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true, company: true, tourType: true, message: true, source: true,
            stage: true, priority: true, value: true, tags: true, lastContactedAt: true, nextFollowUpAt: true, createdAt: true,
            assignee: { select: { firstName: true, lastName: true } },
          },
          orderBy: a.followUpDue ? { nextFollowUpAt: 'asc' } : { createdAt: 'desc' },
          take: a.limit,
          skip: a.offset,
        }),
      ]);
      return ok({
        total,
        leads: leads.map((l) => ({
          id: l.id, name: name(l), email: l.email, phone: l.phone, company: l.company, topic: l.tourType, message: clip(l.message),
          source: l.source, stage: l.stage, priority: l.priority, value: l.value, tags: l.tags, assignedTo: name(l.assignee),
          lastContacted: l.lastContactedAt, nextFollowUp: l.nextFollowUpAt, created: l.createdAt,
        })),
      });
    }),
  );

  server.registerTool(
    'get_lead',
    {
      title: 'Lead details',
      description: 'One lead in full: contact details, message, stage, assignee, activity history and notes.',
      inputSchema: { id: z.string().min(5).max(40) },
      annotations: { title: 'Lead details', ...READ_ONLY },
    },
    audited('get_lead', async ({ id }: { id: string }) => {
      const l = await prisma.lead.findUnique({
        where: { id },
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true, company: true, tourType: true, message: true, source: true,
          stage: true, priority: true, value: true, tags: true, lastContactedAt: true, nextFollowUpAt: true, createdAt: true, updatedAt: true,
          assignee: { select: { firstName: true, lastName: true, email: true } },
          activities: { select: { type: true, description: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 },
          notes: { select: { content: true, createdAt: true, author: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
        },
      });
      if (!l) return ok({ found: false });
      return ok({
        ...l,
        name: name(l),
        assignee: l.assignee ? { name: name(l.assignee), email: l.assignee.email } : null,
        notes: l.notes.map((n) => ({ content: n.content, by: name(n.author), at: n.createdAt })),
      });
    }),
  );

  server.registerTool(
    'list_orders',
    {
      title: 'List orders',
      description: 'Course orders and payments, newest first. Filter by status, payment method or how recent. Amounts in OMR.',
      inputSchema: {
        status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
        method: z.enum(['OMPAY', 'BANK_TRANSFER']).optional(),
        days: z.number().int().min(1).max(3650).optional(),
        limit: z.number().int().min(1).max(100).default(25),
        offset: z.number().int().min(0).default(0),
      },
      annotations: { title: 'List orders', ...READ_ONLY },
    },
    audited('list_orders', async (a: { status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED'; method?: 'OMPAY' | 'BANK_TRANSFER'; days?: number; limit: number; offset: number }) => {
      const where: Prisma.OrderWhereInput = {
        ...(a.status ? { paymentStatus: a.status } : {}),
        ...(a.method ? { paymentMethod: a.method } : {}),
        ...(a.days ? { createdAt: { gte: since(a.days) } } : {}),
      };
      const [total, sum, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.aggregate({ where, _sum: { amount: true } }),
        prisma.order.findMany({
          where,
          select: {
            id: true, amount: true, paymentStatus: true, paymentMethod: true, gatewayReference: true, gatewayStatus: true, paidAt: true, createdAt: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            course: { select: { title: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: a.limit,
          skip: a.offset,
        }),
      ]);
      return ok({
        total,
        amountTotal: round3(sum._sum.amount),
        currency: 'OMR',
        orders: orders.map((o) => ({
          id: o.id, client: name(o.user), email: o.user.email, userId: o.user.id, course: o.course.title, amount: o.amount,
          status: o.paymentStatus, method: o.paymentMethod, reference: o.gatewayReference, gatewayStatus: o.gatewayStatus, paidAt: o.paidAt, created: o.createdAt,
        })),
      });
    }),
  );

  server.registerTool(
    'get_course_stats',
    {
      title: 'Course statistics',
      description: 'Per course: status, price, lessons, enrolments, completions, average progress, paid orders and revenue (OMR).',
      inputSchema: {},
      annotations: { title: 'Course statistics', ...READ_ONLY },
    },
    audited('get_course_stats', async () => {
      const [courses, revenue, progress, completed] = await Promise.all([
        prisma.course.findMany({
          select: {
            id: true, title: true, slug: true, status: true, approvalStatus: true, courseFormat: true, price: true, discountPrice: true, createdAt: true,
            _count: { select: { lessons: true, enrollments: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.order.groupBy({ by: ['courseId'], where: { paymentStatus: 'COMPLETED' }, _sum: { amount: true }, _count: { _all: true } }),
        prisma.enrollment.groupBy({ by: ['courseId'], _avg: { progressPercentage: true } }),
        prisma.enrollment.groupBy({ by: ['courseId'], where: { completed: true }, _count: { _all: true } }),
      ]);
      const by = <T extends { courseId: string }>(rows: T[]) => new Map(rows.map((r) => [r.courseId, r]));
      const rev = by(revenue), prog = by(progress), done = by(completed);
      return ok({
        currency: 'OMR',
        courses: courses.map((c) => ({
          title: c.title, slug: c.slug, status: c.status, approval: c.approvalStatus, format: c.courseFormat,
          price: c.price, discountPrice: c.discountPrice, lessons: c._count.lessons, enrolments: c._count.enrollments,
          completedEnrolments: done.get(c.id)?._count._all ?? 0,
          averageProgressPercent: Math.round(prog.get(c.id)?._avg.progressPercentage ?? 0),
          paidOrders: rev.get(c.id)?._count._all ?? 0, revenue: round3(rev.get(c.id)?._sum.amount),
          created: c.createdAt,
        })),
      });
    }),
  );

  server.registerTool(
    'list_emails',
    {
      title: 'Sent emails',
      description:
        'Log of emails the site sent (subject, type, delivery status), newest first. Message bodies are not stored. Covers emails sent since the log was added.',
      inputSchema: {
        to: z.string().max(200).optional().describe('Recipient address, or part of it'),
        type: z.string().max(60).optional().describe('e.g. welcome, new_enrollment, admin_new_lead, lead_confirmation'),
        status: z.enum(['SENT', 'FAILED', 'NOT_SENT', 'LOGGED']).optional(),
        days: z.number().int().min(1).max(3650).optional(),
        limit: z.number().int().min(1).max(200).default(50),
      },
      annotations: { title: 'Sent emails', ...READ_ONLY },
    },
    audited('list_emails', async (a: { to?: string; type?: string; status?: 'SENT' | 'FAILED' | 'NOT_SENT' | 'LOGGED'; days?: number; limit: number }) => {
      const where: Prisma.EmailLogWhereInput = {
        ...(a.to ? { to: { contains: a.to, mode: 'insensitive' } } : {}),
        ...(a.type ? { type: a.type } : {}),
        ...(a.status ? { status: a.status } : {}),
        ...(a.days ? { createdAt: { gte: since(a.days) } } : {}),
      };
      const [total, emails] = await Promise.all([
        prisma.emailLog.count({ where }),
        prisma.emailLog.findMany({
          where,
          select: { to: true, subject: true, type: true, status: true, error: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: a.limit,
        }),
      ]);
      return ok({ total, emails });
    }),
  );
}
