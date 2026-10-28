import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCommissionRate } from '@/lib/validations';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    if (data.commissionRate !== undefined && parseCommissionRate(data.commissionRate) === null) {
      return NextResponse.json({ error: 'Commission rate must be a number from 0 to 100' }, { status: 400 });
    }
    const user = await prisma.user.update({
      where: { id: id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role,
        ...(data.commissionRate !== undefined ? { commissionRate: data.commissionRate } : {}),
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, commissionRate: true },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: "An error occurred" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const userToDelete = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    
    if (userToDelete?.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last remaining administrator' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[USER-DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 400 });
  }
}
