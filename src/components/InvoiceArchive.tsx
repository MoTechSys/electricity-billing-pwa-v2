'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';

interface Row {
  id: string;
  invoiceNumber: string;
  cycleNumber?: string;
  periodFrom: string;
  periodTo: string;
  consumptionKwh: number;
  netDue: number;
  currency: string;
  status: string;
  createdAt: string;
  subscriber: { subscriberNumber: string; subscriberName: string; meterNumber: string };
}

export default function InvoiceArchive() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => { if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) setMenuId(null); };
    const close = () => setMenuId(null);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', close, true); };
  }, [menuId]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const all = await db.invoices.orderBy('createdAt').reverse().toArray();
      const subs = await db.subscribers.toArray();
      const subMap = new Map(subs.map(s => [s.id, s]));
      const q = search.trim().toLowerCase();
      const rows: Row[] = all
        .filter(inv => !statusFilter || inv.status === statusFilter)
        .map(inv => {
          const s = subMap.get(inv.subscriberId);
          return { ...inv, subscriber: { subscriberNumber: s?.subscriberNumber || '', subscriberName: s?.subscriberName || 'محذوف', meterNumber: s?.meterNumber || '' } };
        })
        .filter(r => !q || r.invoiceNumber.toLowerCase().includes(q) || r.subscriber.subscriberName.toLowerCase().includes(q) || r.subscriber.subscriberNumber.toLowerCase().includes(q));
      setInvoices(rows);
      setTotal(rows.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const deleteInvoice = async (id: string, num: string) => {
    if (!confirm(`حذف الفاتورة رقم ${num}؟`)) return;
    try {
      await db.invoices.delete(id);
      fetchInvoices();
    } catch (err) {
      console.error(err);
      alert('تعذّر الحذف');
    }
  };

  const statusLabels: Record<string, { text: string; cls: string }> = {
    issued: { text: 'صادرة', cls: 'bg-green-100 text-green-700' },
    draft: { text: 'مسودة', cls: 'bg-yellow-100 text-yellow-700' },
    cancelled: { text: 'ملغاة', cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">أرشيف الفواتير ({total})</h1>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الفاتورة أو اسم المشترك أو رقمه..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm"
          >
            <option value="">كل الحالات</option>
            <option value="issued">صادرة</option>
            <option value="draft">مسودة</option>
            <option value="cancelled">ملغاة</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">رقم الفاتورة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600 hidden sm:table-cell">الدورة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">المشترك</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600 hidden md:table-cell">الفترة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600 hidden md:table-cell">الاستهلاك</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">المبلغ</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-600 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">لا توجد فواتير</td></tr>
              ) : (
                invoices.map((inv) => {
                  const st = statusLabels[inv.status] || { text: inv.status, cls: 'bg-gray-100 text-gray-700' };
                  return (
                    <tr key={inv.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 text-sm font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3 text-sm text-center hidden sm:table-cell">{inv.cycleNumber || '-'}</td>
                      <td className="p-3 text-sm">
                        <div className="font-medium">{inv.subscriber.subscriberName}</div>
                        <div className="text-xs text-gray-500">{inv.subscriber.subscriberNumber}</div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell">{inv.periodFrom} - {inv.periodTo}</td>
                      <td className="p-3 text-sm hidden md:table-cell" dir="ltr">{inv.consumptionKwh.toLocaleString()} k.w</td>
                      <td className="p-3 text-sm font-bold whitespace-nowrap">{inv.netDue.toLocaleString()} {inv.currency}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="p-3 text-sm text-center relative">
                        <button
                          onClick={() => setMenuId(menuId === inv.id ? null : inv.id)}
                          aria-label="إجراءات"
                          className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-xl leading-none"
                        >⋮</button>
                        {menuId === inv.id && (
                          <div ref={menuWrapRef} className="absolute left-2 top-12 z-20 w-44 bg-white rounded-xl shadow-xl border py-1 text-right">
                            <button onClick={() => { setMenuId(null); router.push(`/invoices/${inv.id}/print`); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" strokeLinejoin="round"/></svg>
                              عرض / طباعة
                            </button>
                            <div className="border-t my-1" />
                            <button onClick={() => { setMenuId(null); deleteInvoice(inv.id, inv.invoiceNumber); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              حذف
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
