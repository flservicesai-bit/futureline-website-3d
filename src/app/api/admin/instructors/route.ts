import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findUserByEmail } from '@/lib/user-email';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function GET() {
  try {
    await requireAdmin();
    const instructors = await prisma.user.findMany({
      where: { role: 'INSTRUCTOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        image: true,
        commissionRate: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const instructorsWithStats = await Promise.all(
      instructors.map(async (instructor) => {
        const enrollmentCount = await prisma.enrollment.count({
          where: { course: { instructorId: instructor.id } },
        });
        return {
          ...instructor,
          totalStudents: enrollmentCount,
        };
      })
    );

    return NextResponse.json(instructorsWithStats);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST — create a new instructor (a.k.a. "Practitioner") record.
// Practitioners surface in the public "Who teaches" band on /courses.
// The role is auto-set to INSTRUCTOR; admin doesn't need to choose.
// A random password is hashed and stored so the User row is valid —
// the instructor can reset it via the standard reset flow if they
// ever need to log in. Email is unique; we surface a clean error
// when a duplicate is attempted.
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const data = await req.json();

    const firstName = typeof data.firstName === 'string' ? data.firstName.trim() : '';
    const lastName = typeof data.lastName === 'string' ? data.lastName.trim() : '';
    const emailInput = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const bio = typeof data.bio === 'string' && data.bio.trim() ? data.bio.trim() : null;
    const image = typeof data.image === 'string' && data.image.trim() ? data.image.trim() : null;
    const commissionRate =
      typeof data.commissionRate === 'number'
        ? data.commissionRate
        : typeof data.commissionRate === 'string' && data.commissionRate.trim()
        ? Number(data.commissionRate)
        : 70;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required.' },
        { status: 400 },
      );
    }

    // Email is optional. The User schema requires email (unique) for
    // potential login, so we auto-generate an internal placeholder when
    // admin doesn't supply one. The placeholder is unique-by-construction
    // (random hex), and the instructor (or admin) can update it later
    // when they actually need to sign in.
    const email = emailInput
      || `practitioner-${randomBytes(6).toString('hex')}@futureline.internal`;

    // Only check uniqueness when admin actually entered an email — the
    // generated placeholder is unique-by-construction.
    if (emailInput) {
      const existing = await findUserByEmail(email);
      if (existing) {
        return NextResponse.json(
          { error: 'A user with that email already exists.' },
          { status: 409 },
        );
      }
    }

    // Random initial password — admin doesn't see it. Instructor uses
    // the standard reset-password flow if they ever need to log in.
    const tempPassword = randomBytes(16).toString('hex');
    const hashed = await bcrypt.hash(tempPassword, 10);

    const created = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashed,
        bio,
        image,
        role: 'INSTRUCTOR',
        commissionRate: Number.isFinite(commissionRate) ? commissionRate : 70,
      },
      select: { id: true, firstName: true, lastName: true, email: true, bio: true, image: true, role: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create instructor' }, { status: 400 });
  }
}
