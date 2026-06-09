'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewSubscriberForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    subscriberNumber: '',
    subscriberName: '',
    meterNumber: '',
    routeNumber: '',
    cabinName: '',
    locationName: '',
    phone: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/billing/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }

      router.push('/subscribers');
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'subscriberNumber', label: 'رقم المشترك', required: true, type: 'text' },
    { name: 'subscriberName', label: 'اسم المشترك', required: true, type: 'text' },
    { name: 'meterNumber', label: 'رقم العداد', required: true, type: 'text' },
    { name: 'routeNumber', label: 'رقم خط السير', required: true, type: 'text' },
    { name: 'cabinName', label: 'الكبينة', required: true, type: 'text' },
    { name: 'locationName', label: 'الموقع / العنوان', required: false, type: 'text' },
    { name: 'phone', label: 'الهاتف', required: false, type: 'text' },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إضافة مشترك جديد</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {field.label} {field.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={(form as Record<string, string>)[field.name]}
                onChange={handleChange}
                required={field.required}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-luxe text-sm"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ المشترك'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition text-sm"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
