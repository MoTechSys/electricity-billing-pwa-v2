'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Subscriber {
  id: string;
  subscriberNumber: string;
  subscriberName: string;
  meterNumber: string;
  routeNumber: string;
  cabinName: string;
  status: string;
  phone: string;
}

export default function SubscribersClient() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSubscribers();
  }, [search]);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/billing/api/subscribers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.subscribers) {
        setSubscribers(data.subscribers);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await fetch(`/billing/api/subscribers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
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
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition text-sm"
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
                <th className="text-right p-3 text-sm font-semibold text-gray-600">خط السير</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الكبينة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">إجراءات</th>
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
                    <td className="p-3 text-sm">{sub.routeNumber}</td>
                    <td className="p-3 text-sm">{sub.cabinName}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {sub.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/invoices/new?subscriberId=${sub.id}`}
                          className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-100"
                        >
                          إصدار فاتورة
                        </Link>
                        <button
                          onClick={() => toggleStatus(sub.id, sub.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            sub.status === 'active'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {sub.status === 'active' ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
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
