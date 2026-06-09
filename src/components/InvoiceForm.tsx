'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db, genId, getSettings } from '@/lib/db';
import { calculateInvoice, generateInvoiceNumber } from '@/lib/invoice-utils';

interface Subscriber {
  id: string;
  subscriberNumber: string;
  subscriberName: string;
  meterNumber: string;
  routeNumber: string;
  cabinName: string;
}

interface CalcResult {
  consumptionKwh: number;
  baseValue: number;
  grossAmount: number;
  netDue: number;
  netDueWords: string;
}

export default function InvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('subscriberId') || '';

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [search, setSearch] = useState('');
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdInvoiceId, setCreatedInvoiceId] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastReadingNote, setLastReadingNote] = useState('');

  const [form, setForm] = useState({
    cycleNumber: '',
    periodFrom: '',
    periodTo: '',
    previousReading: '',
    currentReading: '',
    unitPrice: '220',
    servicesAmount: '0',
    arrearsAmount: '0',
    paidDuringPeriod: '0',
    notes: '',
  });

  const [calc, setCalc] = useState<CalcResult | null>(null);

  const [currency, setCurrency] = useState('ريال');

  // Load subscribers for search (local DB)
  useEffect(() => {
    const fetchSubs = async () => {
      const all = await db.subscribers.orderBy('createdAt').reverse().toArray();
      const q = search.trim().toLowerCase();
      const filtered = q
        ? all.filter(s => s.subscriberName.toLowerCase().includes(q) || s.subscriberNumber.toLowerCase().includes(q) || s.meterNumber.toLowerCase().includes(q))
        : all;
      setSubscribers(filtered.slice(0, 20));
    };
    fetchSubs();
  }, [search]);

  // helper: fetch last invoice reading for a subscriber from local DB
  const fillPrevReading = useCallback(async (subId: string) => {
    const invs = await db.invoices.where('subscriberId').equals(subId).reverse().sortBy('createdAt');
    if (invs.length > 0) {
      const lastReading = invs[invs.length - 1] ? invs[0].currentReading : invs[0].currentReading;
      setForm(prev => ({ ...prev, previousReading: String(invs[0].currentReading) }));
      setLastReadingNote(`تم جلب القراءة السابقة (${invs[0].currentReading}) تلقائياً من آخر فاتورة`);
      void lastReading;
    } else {
      setLastReadingNote('لا توجد فواتير سابقة — أدخل القراءة السابقة يدوياً');
    }
  }, []);

  // Select subscriber + auto-fill previous reading
  const selectSubscriber = useCallback(async (sub: Subscriber) => {
    setSelectedSub(sub);
    setShowDropdown(false);
    setSearch('');
    setLastReadingNote('');
    await fillPrevReading(sub.id);
  }, [fillPrevReading]);

  // Preselect subscriber
  useEffect(() => {
    if (preselectedId) {
      const fetchSub = async () => {
        const sub = await db.subscribers.get(preselectedId);
        if (sub) {
          setSelectedSub(sub);
          await fillPrevReading(sub.id);
        }
      };
      fetchSub();
    }
  }, [preselectedId, fillPrevReading]);

  // Load default unit price + currency from settings (local)
  useEffect(() => {
    const load = async () => {
      const s = await getSettings();
      if (s.default_unit_price) setForm(prev => ({ ...prev, unitPrice: s.default_unit_price }));
      if (s.currency) setCurrency(s.currency);
    };
    load();
  }, []);

  // Auto-calculate locally (no server)
  const doCalculate = useCallback(() => {
    const prev = parseFloat(form.previousReading) || 0;
    const curr = parseFloat(form.currentReading) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    const services = parseFloat(form.servicesAmount) || 0;
    const arrears = parseFloat(form.arrearsAmount) || 0;
    const paid = parseFloat(form.paidDuringPeriod) || 0;

    if (curr >= prev && price > 0) {
      const r = calculateInvoice({
        previousReading: prev,
        currentReading: curr,
        unitPrice: price,
        servicesAmount: services,
        arrearsAmount: arrears,
        paidDuringPeriod: paid,
      });
      setCalc(r);
    } else {
      setCalc(null);
    }
  }, [form.previousReading, form.currentReading, form.unitPrice, form.servicesAmount, form.arrearsAmount, form.paidDuringPeriod, currency]);

  useEffect(() => {
    const timer = setTimeout(doCalculate, 300);
    return () => clearTimeout(timer);
  }, [doCalculate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (statusAction: 'draft' | 'issue') => {
    if (!selectedSub) { setError('يرجى اختيار مشترك'); return; }
    if (!form.periodFrom || !form.periodTo) { setError('يرجى تحديد الفترة'); return; }
    if (!form.previousReading || !form.currentReading) { setError('يرجى إدخال القراءات'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const prev = parseFloat(form.previousReading);
      const curr = parseFloat(form.currentReading);
      const price = parseFloat(form.unitPrice);
      const services = parseFloat(form.servicesAmount) || 0;
      const arrears = parseFloat(form.arrearsAmount) || 0;
      const paid = parseFloat(form.paidDuringPeriod) || 0;
      if (curr < prev) { setError('القراءة الحالية أقل من السابقة'); return; }

      const r = calculateInvoice({ previousReading: prev, currentReading: curr, unitPrice: price, servicesAmount: services, arrearsAmount: arrears, paidDuringPeriod: paid });
      const now = new Date().toISOString();
      const id = genId();
      await db.invoices.add({
        id,
        invoiceNumber: generateInvoiceNumber(),
        cycleNumber: form.cycleNumber || '',
        subscriberId: selectedSub.id,
        periodFrom: form.periodFrom.replace(/-/g, '/'),
        periodTo: form.periodTo.replace(/-/g, '/'),
        previousReading: prev,
        currentReading: curr,
        consumptionKwh: r.consumptionKwh,
        unitPrice: price,
        baseValue: r.baseValue,
        servicesAmount: services,
        arrearsAmount: arrears,
        paidDuringPeriod: paid,
        grossAmount: r.grossAmount,
        netDue: r.netDue,
        netDueWords: r.netDueWords,
        currency,
        status: statusAction === 'issue' ? 'issued' : 'draft',
        notes: form.notes || '',
        issuedAt: statusAction === 'issue' ? now : null,
        createdAt: now,
        updatedAt: now,
      });

      setSuccess(statusAction === 'issue' ? 'تم إصدار الفاتورة بنجاح!' : 'تم حفظ المسودة بنجاح!');
      setCreatedInvoiceId(id);
    } catch {
      setError('خطأ في حفظ الفاتورة محلياً');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      <h1 className="text-2xl font-bold text-gray-800">إصدار فاتورة جديدة</h1>

      {/* Section 1: Subscriber Selection */}
      <div className="bg-white rounded-xl shadow-sm border p-3.5">
        <h2 className="text-sm font-bold text-gray-600 mb-2.5">📋 بيانات المشترك</h2>

        {!selectedSub ? (
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="اختر العميل: ابحث بالاسم أو الرقم..."
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none"
            />
            {showDropdown && subscribers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {subscribers.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => selectSubscriber(sub)}
                    className="w-full text-right p-3 hover:bg-blue-50 border-b last:border-0 transition"
                  >
                    <div className="font-medium text-sm">{sub.subscriberName}</div>
                    <div className="text-xs text-gray-500">رقم المشترك: {sub.subscriberNumber} | العداد: {sub.meterNumber}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-2 gap-3 text-sm flex-1">
                <div><span className="text-gray-500">رقم المشترك:</span> <span className="font-bold">{selectedSub.subscriberNumber}</span></div>
                <div><span className="text-gray-500">رقم العداد:</span> <span className="font-bold">{selectedSub.meterNumber}</span></div>
                <div><span className="text-gray-500">الاسم:</span> <span className="font-bold">{selectedSub.subscriberName}</span></div>
                <div><span className="text-gray-500">خط السير:</span> <span className="font-bold">{selectedSub.routeNumber}</span></div>
                <div><span className="text-gray-500">الكبينة:</span> <span className="font-bold">{selectedSub.cabinName}</span></div>
              </div>
              <button onClick={() => setSelectedSub(null)} className="text-red-500 hover:text-red-700 text-sm font-bold mr-2">✕ تغيير</button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Invoice Data */}
      <div className="bg-white rounded-xl shadow-sm border p-5">
        <h2 className="text-lg font-bold text-gray-700 mb-4">📊 بيانات الفاتورة</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الفترة من <span className="text-red-500">*</span></label>
            <input type="date" name="periodFrom" value={form.periodFrom} onChange={handleChange} style={{ direction: 'ltr', textAlign: 'left' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">الفترة إلى <span className="text-red-500">*</span></label>
            <input type="date" name="periodTo" value={form.periodTo} onChange={handleChange} style={{ direction: 'ltr', textAlign: 'left' }} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">القراءة السابقة <span className="text-red-500">*</span></label>
            <input type="number" name="previousReading" value={form.previousReading} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">القراءة الحالية <span className="text-red-500">*</span></label>
            <input type="number" name="currentReading" value={form.currentReading} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">سعر الكيلووات <span className="text-red-500">*</span></label>
            <input type="number" name="unitPrice" value={form.unitPrice} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">خدمات</label>
            <input type="number" name="servicesAmount" value={form.servicesAmount} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
          </div>
        </div>

        {lastReadingNote && (
          <p className="mt-3 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 inline-block">ℹ️ {lastReadingNote}</p>
        )}

        {/* Advanced settings toggle */}
        <button type="button" onClick={() => setShowAdvanced(v => !v)}
          className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
          <span>⚙️ إعدادات إضافية</span>
          <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">رقم الدورة</label>
              <input type="text" name="cycleNumber" value={form.cycleNumber} onChange={handleChange} placeholder="مثال: 19" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">المتأخرات</label>
              <input type="number" name="arrearsAmount" value={form.arrearsAmount} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">مدفوع خلال الفترة</label>
              <input type="number" name="paidDuringPeriod" value={form.paidDuringPeriod} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" dir="ltr" />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ملاحظات</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition outline-none text-sm" />
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Calculation Results */}
      {calc && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-5">
          <h2 className="text-lg font-bold text-green-800 mb-4">💰 النتائج المحسوبة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xs text-gray-500 mb-1">فرق الاستهلاك (k.w)</div>
              <div className="text-xl font-bold text-gray-800" dir="ltr">{fmt(calc.consumptionKwh)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xs text-gray-500 mb-1">القيمة</div>
              <div className="text-xl font-bold text-gray-800" dir="ltr">{fmt(calc.baseValue)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm">
              <div className="text-xs text-gray-500 mb-1">المبلغ الإجمالي</div>
              <div className="text-xl font-bold text-gray-800" dir="ltr">{fmt(calc.grossAmount)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center shadow-sm border-2 border-green-400">
              <div className="text-xs text-green-600 mb-1 font-bold">المبلغ المستحق</div>
              <div className="text-xl font-bold text-green-700" dir="ltr">{fmt(calc.netDue)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">المبلغ المستحق كتابةً:</div>
            <div className="text-lg font-bold text-gray-800">{calc.netDueWords}</div>
          </div>
        </div>
      )}

      {/* Error / Success */}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium">{error}</div>}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl font-medium">
          <div>{success}</div>
          {createdInvoiceId && (
            <div className="flex gap-3 mt-3">
              <button onClick={() => router.push(`/invoices/${createdInvoiceId}/print`)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">
                📥 عرض / طباعة PDF
              </button>
              <button onClick={() => { setSuccess(''); setCreatedInvoiceId(''); setSelectedSub(null); setForm({ ...form, cycleNumber: '', previousReading: '', currentReading: '', servicesAmount: '0', arrearsAmount: '0', paidDuringPeriod: '0', notes: '' }); setCalc(null); }}
                className="btn-luxe text-sm">
                فاتورة جديدة
              </button>
              <button onClick={() => router.push('/invoices/archive')}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200">
                📁 الأرشيف
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!success && (
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleSubmit('issue')} disabled={loading || !selectedSub || !calc}
            className="btn-luxe btn-gold text-sm">
            {loading ? 'جاري الإصدار...' : '📋 إصدار الفاتورة'}
          </button>
          <button onClick={() => handleSubmit('draft')} disabled={loading || !selectedSub || !calc}
            className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 transition disabled:opacity-50 text-sm">
            💾 حفظ كمسودة
          </button>
          <button onClick={() => router.back()}
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
            إلغاء
          </button>
        </div>
      )}

    </div>
  );
}
