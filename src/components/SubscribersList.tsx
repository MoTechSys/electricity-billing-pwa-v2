'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, Subscriber } from '@/lib/db';

export default function SubscribersClient() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const router = useRouter();
  const menuWrapRef = useRef<HTMLDivElement>(null);

  // close the actions menu on outside click / scroll
  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    const onDown = (e: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', close, true); };
  }, [menuId]);

  const LIMIT = 200; // cap rendered rows for performance with large data

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim().toLowerCase();
      const all = await db.subscribers.orderBy('createdAt').reverse().toArray();
      const filtered = q
        ? all.filter(s =>
            s.subscriberName.toLowerCase().includes(q) ||
            s.subscriberNumber.toLowerCase().includes(q) ||
            s.meterNumber.toLowerCase().includes(q))
        : all;
      setTotal(filtered.length);
      setSubscribers(filtered.slice(0, LIMIT));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  // debounce search input to avoid re-querying on every keystroke
  useEffect(() => {
    const t = setTimeout(() => { fetchSubscribers(); }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [fetchSubscribers, search]);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await db.subscribers.update(id, { status: newStatus, updatedAt: new Date().toISOString() });
      fetchSubscribers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">المشتركون ({total})</h1>
        <Link
          href="/subscribers/new"
          className="btn-luxe text-sm"
        >
          + إضافة مشترك
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4 border-b">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو رقم المشترك أو رقم العداد..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">رقم المشترك</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الاسم</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">رقم العداد</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600 hidden sm:table-cell">خط السير</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600 hidden sm:table-cell">الكبينة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-center p-3 text-sm font-semibold text-gray-600 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : subscribers.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">لا توجد نتائج</td></tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{sub.subscriberNumber}</td>
                    <td className="p-3 text-sm font-medium">{sub.subscriberName}</td>
                    <td className="p-3 text-sm font-mono">{sub.meterNumber}</td>
                    <td className="p-3 text-sm hidden sm:table-cell">{sub.routeNumber}</td>
                    <td className="p-3 text-sm hidden sm:table-cell">{sub.cabinName}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {sub.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-center relative">
                      <button
                        onClick={() => setMenuId(menuId === sub.id ? null : sub.id)}
                        aria-label="إجراءات"
                        className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 text-xl leading-none"
                      >
                        ⋮
                      </button>
                      {menuId === sub.id && (
                        <div ref={menuWrapRef} className="absolute left-2 top-12 z-20 w-44 bg-white rounded-xl shadow-xl border py-1 text-right">
                          <button
                            onClick={() => { setMenuId(null); router.push(`/invoices/new?subscriberId=${sub.id}`); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 3 14h7v8l11-12h-8z" strokeLinejoin="round"/></svg>
                            إصدار فاتورة
                          </button>
                          <button
                            onClick={() => { setMenuId(null); toggleStatus(sub.id, sub.status); }}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${
                              sub.status === 'active' ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {sub.status === 'active' ? (
                              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>تعطيل</>
                            ) : (
                              <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>تفعيل</>
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
