'use client';

import { useState, useEffect, useRef } from 'react';
import { getSettings, setSetting, exportData, importData } from '@/lib/db';

export default function SettingsForm() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setSettings(await getSettings());
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      for (const [k, v] of Object.entries(settings)) {
        await setSetting(k, v);
      }
      setMessage('تم حفظ الإعدادات بنجاح');
    } catch {
      setMessage('خطأ في الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setBackupMsg('');
    try {
      const blob = await exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `motech-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setBackupMsg('تم تصدير نسخة احتياطية بنجاح ✅');
    } catch {
      setBackupMsg('فشل التصدير');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackupMsg('');
    try {
      const text = await file.text();
      const r = await importData(text);
      setBackupMsg(`تم الاستيراد ✅ (${r.subscribers} مشترك، ${r.invoices} فاتورة)`);
      setSettings(await getSettings());
    } catch {
      setBackupMsg('فشل الاستيراد — تأكد من صحة الملف');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fields = [
    { key: 'company_name', label: 'اسم الشركة' },
    { key: 'company_subtitle', label: 'وصف الشركة (سطر ثانٍ)' },
    { key: 'invoice_title', label: 'عنوان الفاتورة' },
    { key: 'currency', label: 'العملة' },
    { key: 'default_unit_price', label: 'سعر الكيلووات الافتراضي' },
    { key: 'footer_note', label: 'ملاحظة الفاتورة (أسفل)' },
  ];

  if (loading) return <div className="text-center p-8 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-6">
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

        <button onClick={handleSave} disabled={saving} className="btn-luxe text-sm">
          {saving ? 'جاري الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
      </div>

      {/* Backup / Restore */}
      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
        <h2 className="text-lg font-bold text-gray-800">النسخ الاحتياطي</h2>
        <p className="text-sm text-gray-500">بياناتك محفوظة في جهازك فقط. صدّر نسخة احتياطية للأمان أو لنقلها لجهاز آخر.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="btn-luxe btn-gold text-sm">⬇️ تصدير نسخة احتياطية</button>
          <button onClick={() => fileRef.current?.click()} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-sm">⬆️ استيراد نسخة</button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
        </div>
        {backupMsg && (
          <div className={`p-3 rounded-xl text-sm font-medium ${backupMsg.includes('فشل') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{backupMsg}</div>
        )}
      </div>
    </div>
  );
}
