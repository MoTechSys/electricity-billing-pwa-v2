import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { IconUsers, IconUserCheck, IconDoc, IconClipboard, IconEdit } from '@/components/Icons';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const [totalSubscribers, activeSubscribers, totalInvoices, issuedInvoices, draftInvoices] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: 'active' } }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: 'issued' } }),
    prisma.invoice.count({ where: { status: 'draft' } }),
  ]);

  const stats = [
    { label: 'إجمالي المشتركين', value: totalSubscribers, color: 'bg-blue-500', Icon: IconUsers },
    { label: 'المشتركون النشطون', value: activeSubscribers, color: 'bg-green-500', Icon: IconUserCheck },
    { label: 'إجمالي الفواتير', value: totalInvoices, color: 'bg-purple-500', Icon: IconDoc },
    { label: 'فواتير صادرة', value: issuedInvoices, color: 'bg-orange-500', Icon: IconClipboard },
    { label: 'مسودات', value: draftInvoices, color: 'bg-yellow-500', Icon: IconEdit },
  ];

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">لوحة التحكم</h1>
          <Link
            href="/invoices/new"
            className="btn-luxe btn-gold text-sm"
          >
            + إصدار فاتورة جديدة
          </Link>
        </div>

        {/* Stats Cards — 2x2 square grid on mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {stats.map((stat, i) => (
            <div key={stat.label} className={i === stats.length - 1 && stats.length % 2 === 1 ? 'card-luxe flex flex-col items-center justify-center text-center p-4 col-span-2 lg:col-span-1 lg:[aspect-ratio:auto]' : 'card-luxe stat-square'}>
              <span className={`${stat.color} text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-md mb-2`}>
                <stat.Icon className="w-6 h-6" />
              </span>
              <span className="text-2xl font-extrabold text-gray-800 leading-none">{stat.value}</span>
              <p className="text-xs sm:text-sm text-gray-600 font-semibold leading-tight mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
