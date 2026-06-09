'use client';

import { useState, useEffect } from 'react';

interface Invoice {
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
  subscriber: {
    subscriberNumber: string;
    subscriberName: string;
    meterNumber: string;
  };
  issuedBy?: { fullName: string } | null;
}

export default function InvoiceArchive() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/billing/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.invoices) {
        setInvoices(data.invoices);
        setTotal(data.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الدورة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">المشترك</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الفترة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الاستهلاك</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">المبلغ المستحق</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">الحالة</th>
                <th className="text-right p-3 text-sm font-semibold text-gray-600">إجراءات</th>
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
                      <td className="p-3 text-sm text-center">{inv.cycleNumber || '-'}</td>
                      <td className="p-3 text-sm">
                        <div className="font-medium">{inv.subscriber.subscriberName}</div>
                        <div className="text-xs text-gray-500">{inv.subscriber.subscriberNumber}</div>
                      </td>
                      <td className="p-3 text-sm">{inv.periodFrom} - {inv.periodTo}</td>
                      <td className="p-3 text-sm" dir="ltr">{inv.consumptionKwh.toLocaleString()} k.w</td>
                      <td className="p-3 text-sm font-bold">{inv.netDue.toLocaleString()} {inv.currency}</td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${st.cls}`}>{st.text}</span>
                      </td>
                      <td className="p-3 text-sm">
                        <a
                          href={`/api/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100 inline-block"
                        >
                          📥 PDF
                        </a>
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
