import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/AppShell';
import Link from 'next/link';
import { IconUsers, IconUserCheck, IconDoc, IconClipboard, IconEdit, IconUserPlus, IconArchive } from '@/components/Icons';

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

  const recentInvoices = await prisma.invoice.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { subscriber: true },
  });

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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/subscribers/new" className="card-luxe p-5 group">
            <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><IconUserPlus className="w-6 h-6" /></span>
            <h3 className="text-lg font-bold mt-3 text-gray-800 group-hover:text-blue-600">إضافة مشترك</h3>
            <p className="text-sm text-gray-500 mt-1">تسجيل مشترك جديد في النظام</p>
          </Link>
          <Link href="/invoices/new" className="card-luxe p-5 group">
            <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><IconEdit className="w-6 h-6" /></span>
            <h3 className="text-lg font-bold mt-3 text-gray-800 group-hover:text-blue-600">إصدار فاتورة</h3>
            <p className="text-sm text-gray-500 mt-1">إنشاء فاتورة استهلاك كهرباء</p>
          </Link>
          <Link href="/invoices/archive" className="card-luxe p-5 group">
            <span className="inline-flex w-12 h-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600"><IconArchive className="w-6 h-6" /></span>
            <h3 className="text-lg font-bold mt-3 text-gray-800 group-hover:text-blue-600">أرشيف الفواتير</h3>
            <p className="text-sm text-gray-500 mt-1">البحث وعرض الفواتير السابقة</p>
          </Link>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">آخر الفواتير</h2>
            <Link href="/invoices/archive" className="text-blue-600 text-sm hover:underline">عرض الكل</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">رقم الفاتورة</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">المشترك</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">الفترة</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">المبلغ المستحق</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{inv.invoiceNumber}</td>
                    <td className="p-3 text-sm">{inv.subscriber.subscriberName}</td>
                    <td className="p-3 text-sm">{inv.periodFrom} - {inv.periodTo}</td>
                    <td className="p-3 text-sm font-bold">{inv.netDue.toLocaleString()} {inv.currency}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        inv.status === 'issued' ? 'bg-green-100 text-green-700' :
                        inv.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {inv.status === 'issued' ? 'صادرة' : inv.status === 'draft' ? 'مسودة' : 'ملغاة'}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا توجد فواتير بعد</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
