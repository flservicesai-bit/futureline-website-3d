import { requireAuth } from '@/lib/requireAuth';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/routing';
import { formatPrice } from '@/lib/utils';
import { BookOpen, CheckCircle, ShoppingCart, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await requireAuth();
  const locale = await getLocale();

  // Keep the active locale on role-based redirects (localePrefix 'always').
  if (session.user.role === 'ADMIN') {
    redirect(`/${locale}/admin`);
  }

  if (session.user.role === 'INSTRUCTOR') {
    redirect(`/${locale}/instructor`);
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id },
    include: {
      course: {
        include: {
          lessons: true,
          instructor: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    include: { course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <Header />
      <div className="min-h-screen bg-canvas">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-navy">
              Welcome,{' '}
              <span
                style={{
                  background: 'linear-gradient(to right, #22a6f7, #3b82f6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {session.user.firstName}
              </span>
            </h1>
            <p className="text-ink-muted mt-1">Manage your courses and track your progress</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <BookOpen className="text-teal-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-navy">{enrollments.length}</div>
                  <div className="text-sm text-ink-muted">Enrolled Courses</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                  <CheckCircle className="text-green-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-navy">
                    {enrollments.filter((e) => e.completed).length}
                  </div>
                  <div className="text-sm text-ink-muted">Completed</div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ShoppingCart className="text-blue-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-navy">{orders.length}</div>
                  <div className="text-sm text-ink-muted">Orders</div>
                </div>
              </div>
            </div>
          </div>

          {/* My Courses */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-navy mb-6">My Courses</h2>
            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm p-12 text-center">
                <BookOpen className="text-ink-muted mx-auto mb-4" size={48} />
                <h3 className="text-lg font-semibold text-ink-muted mb-2">No courses yet</h3>
                <p className="text-ink-muted mb-6">Browse our catalogue to get started</p>
                <Link
                  href="/courses"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-navy text-sm font-bold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Explore Courses <ArrowRight size={18} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enrollment) => (
                  <Link
                    href={`/dashboard/course/${enrollment.course.slug}`}
                    key={enrollment.id}
                    className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm overflow-hidden group hover:border-teal-500/30 transition-colors"
                  >
                    <div className="h-32 bg-gradient-to-br from-teal-500/20 to-blue-600/20 flex items-center justify-center border-b border-hairline">
                      <BookOpen className="text-ink-muted" size={32} />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-ink mb-2 group-hover:text-teal-400 transition-colors">
                        {enrollment.course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-ink-muted mb-3">
                        <span>{enrollment.course.deliveryType.replace('_', ' ')}</span>
                        <span>&bull;</span>
                        <span>{enrollment.course.lessons.length} lessons</span>
                      </div>
                      <div className="w-full bg-canvas-card rounded-full h-2 mb-2">
                        <div
                          className="bg-teal-500 rounded-full h-2 transition-all"
                          style={{ width: `${enrollment.progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ink-muted">
                          {Math.round(enrollment.progressPercentage)}% complete
                        </span>
                        {enrollment.completed && (
                          <span className="text-teal-400 flex items-center gap-1">
                            <CheckCircle size={12} /> Done
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Order History */}
          <div>
            <h2 className="text-xl font-bold text-navy mb-6">Order History</h2>
            {orders.length === 0 ? (
              <p className="text-ink-muted">No orders yet.</p>
            ) : (
              <div className="rounded-xl border border-hairline bg-canvas-card backdrop-blur-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Course
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-canvas-card transition-colors">
                        <td className="px-6 py-4 text-sm text-ink-muted font-medium">
                          {order.course.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-muted">
                          {formatPrice(order.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              order.paymentStatus === 'COMPLETED'
                                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            }`}
                          >
                            {order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-ink-muted">
                          {new Date(order.createdAt).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
