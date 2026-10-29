import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: id },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { stage, priority, assignedTo, tags, value, nextFollowUpAt, lastContactedAt } = body;

    const oldLead = await prisma.lead.findUnique({ where: { id: id } });
    if (!oldLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const updateData: any = {};
    if (stage !== undefined) updateData.stage = stage;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (tags !== undefined) updateData.tags = tags;
    if (value !== undefined) updateData.value = value;
    if (nextFollowUpAt !== undefined) updateData.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
    if (lastContactedAt !== undefined) updateData.lastContactedAt = lastContactedAt ? new Date(lastContactedAt) : null;

    const lead = await prisma.lead.update({
      where: { id: id },
      data: updateData,
    });

    if (stage && stage !== oldLead.stage) {
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: 'STAGE_CHANGE',
          description: `Stage changed from ${oldLead.stage} to ${stage}`,
          performedBy: (session.user as any).id,
        },
      });
      // Pipeline stages are internal (NEGOTIATING, LOST…), so the prospect is
      // not emailed about them; the activity log above records the change.
    }

    if (priority && priority !== oldLead.priority) {
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: 'PRIORITY_CHANGE',
          description: `Priority changed from ${oldLead.priority} to ${priority}`,
          performedBy: (session.user as any).id,
        },
      });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Failed to update lead:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.lead.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }
}
