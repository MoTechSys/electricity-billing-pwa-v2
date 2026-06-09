'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { db } from '@/lib/db';
import { IconUsers, IconUserCheck, IconDoc, IconClipboard, IconEdit } from '@/components/Icons';

export default function DashboardPage() {
  const [stats, setStats] = useState({ subs: 0, active: 0, invoices: 0, issued: 0, draft: 0, revenue: 0 });
  const [chart, setChart] = useState<{ label: string; total: number }[]>([]);

  useEffect(() => {
    (async () => {
      // Use indexed counts where possible (fast even with many rows).
      const [subsTotal, activeCount, invTotal, issuedCount, draftCount] = await Promise.all([
        db.subscribers.count(),
        db.subscribers.where('status').equals('active').count(),
        db.invoices.count(),
        db.invoices.where('status').equals('issued').count(),
        db.invoices.where('status').equals('draft').count(),
      ]);

      // Revenue + 7-day chart: only scan issued invoices from the last 7 days.
      const now = new Date();
      const buckets: { label: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        buckets.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, total: 0 });
      }
      const issuedInvoices = await db.invoices.where('status').equals('issued').toArray();
      let revenue = 0;
      for (const inv of issuedInvoices) {
        revenue += inv.netDue || 0;
        const d = new Date(inv.createdAt);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        const b = buckets.find(x => x.label === key);
        if (b) b.total += inv.netDue || 0;
      }
      setStats({ subs: subsTotal, active: activeCount, invoices: invTotal, issued: issuedCount, draft: draftCount, revenue });
      setChart(buckets);
    })();
  }, []);

  const cards = [
    { label: 'إجمالي المشتركين', value: stats.subs, color: 'bg-blue-500', Icon: IconUsers },
    { label: 'المشتركون النشطون', value: stats.active, color: 'bg-green-500', Icon: IconUserCheck },
    { label: 'إجمالي الفواتير', value: stats.invoices, color: 'bg-purple-500', Icon: IconDoc },
    { label: 'فواتير صادرة', value: stats.issued, color: 'bg-orange-500', Icon: IconClipboard },
    { label: 'مسودات', value: stats.draft, color: 'bg-yellow-500', Icon: IconEdit },
    { label: 'إجمالي المستحقات', value: Math.round(stats.revenue).toLocaleString('en-US'), color: 'bg-emerald-600', Icon: IconClipboard },
  ];

  const maxТotal = Math.max(1, ...chart.map(c => c.total));

  return (
    <AppShell>
      <div className="space-y-6 has-bottom-nav">
        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">لوحة التحكم</h1>

        {/* Stats — 3x2 compact grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cards.map((c) => (
            <div key={c.label} className="card-luxe flex flex-col items-center justify-center text-center p-3">
              <span className={`${c.color} text-white w-10 h-10 flex items-center justify-center rounded-2xl shadow-md mb-1.5`}>
                <c.Icon className="w-5 h-5" />
              </span>
              <span className="text-lg font-extrabold text-gray-800 leading-none" dir="ltr">{c.value}</span>
              <p className="text-[11px] sm:text-xs text-gray-600 font-semibold leading-tight mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="card-luxe p-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">المستحقات — آخر 7 أيام</h2>
          <div className="flex items-end justify-between gap-2 h-32">
            {chart.map((c, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400"
                  style={{ height: `${Math.max(4, (c.total / maxТotal) * 100)}%` }}
                  title={c.total.toLocaleString()}
                />
                <span className="text-[10px] text-gray-500 mt-1" dir="ltr">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
