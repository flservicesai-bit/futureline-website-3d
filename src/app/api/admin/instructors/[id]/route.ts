import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdmin();
    const data = await req.json();

    const updateData: any = {};
    if (data.commissionRate !== undefined) {
      const rate = data.commissionRate;
      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json({ error: 'Commission rate must be a number from 0 to 100' }, { status: 400 });
      }
      updateData.commissionRate = rate;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;

    const updated = await prisma.user.update({
      // Instructors only: this endpoint must not edit or deactivate an admin.
      where: { id: id, role: 'INSTRUCTOR' },
      data: updateData,
      // Never send the password hash or reset token back to the browser.
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        image: true,
        commissionRate: true,
        isActive: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}
