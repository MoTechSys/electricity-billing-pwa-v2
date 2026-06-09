'use client';

import { useState, useEffect } from 'react';

export default function SettingsForm() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/billing/api/settings');
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/billing/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('تم حفظ الإعدادات بنجاح');
      } else {
        setMessage(data.error || 'حدث خطأ');
      }
    } catch {
      setMessage('خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'organization_name', label: 'اسم الجهة / المحطة' },
    { key: 'invoice_title', label: 'عنوان الفاتورة' },
    { key: 'currency', label: 'العملة' },
    { key: 'default_unit_price', label: 'سعر الكيلووات الافتراضي' },
    { key: 'footer_note', label: 'ملاحظة الفاتورة (أسفل)' },
  ];

  if (loading) return <div className="text-center p-8 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">الإعدادات</h1>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{field.label}</label>
            <input
              type="text"
              value={settings[field.key] || ''}
              onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm"
            />
          </div>
        ))}

        {message && (
          <div className={`p-3 rounded-xl text-sm font-medium ${message.includes('خطأ') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-luxe text-sm"
        >
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
}
