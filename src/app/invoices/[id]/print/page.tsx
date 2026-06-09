'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, getSettings, Invoice, Subscriber } from '@/lib/db';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    (async () => {
      const inv = await db.invoices.get(id);
      if (inv) {
        setInvoice(inv);
        const sub = await db.subscribers.get(inv.subscriberId);
        setSubscriber(sub || null);
      }
      setSettings(await getSettings());
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-gray-500">جاري التحميل...</div>;
  if (!invoice || !subscriber) return <div className="p-8 text-center text-red-500">الفاتورة غير موجودة</div>;

  const company1 = settings.company_name || 'شركة العباسي';
  const company2 = settings.company_subtitle || 'لتوليد الطاقة الكهربائية';
  const title = settings.invoice_title || 'فاتورة استهلاك كهرباء';
  const footerNote = settings.footer_note || 'ملاحظة: المحطة غير مسؤولة عن تسليم أي مبلغ بدون سند رسمي';
  const invDisplay = invoice.invoiceNumber.replace(/^INV-\d{4}-\d{2}-/, '') || invoice.invoiceNumber;

  function buildShareText(): string {
    const lines = [
      `*${company1}* - ${company2}`,
      `*${title}*`,
      `رقم الفاتورة: ${invDisplay}`,
      `المشترك: ${subscriber!.subscriberName}`,
      `الفترة: من ${invoice!.periodFrom} حتى ${invoice!.periodTo}`,
      `القراءة السابقة: ${fmt(invoice!.previousReading)}`,
      `القراءة الحالية: ${fmt(invoice!.currentReading)}`,
      `الاستهلاك: ${fmt(invoice!.consumptionKwh)} ك.و.س`,
      `المبلغ المستحق: ${fmt(invoice!.netDue)}`,
      `(${invoice!.netDueWords})`,
    ];
    return lines.join('\n');
  }

  async function handleShare() {
    const text = buildShareText();
    try {
      setSharing(true);
      // Try sharing an image of the invoice (best experience), fall back to text.
      let shared = false;
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (typeof (nav as Navigator).share === 'function') {
        try {
          const node = document.querySelector('.invoice') as HTMLElement | null;
          // Lazy-load html-to-image only when sharing an image
          if (node && nav.canShare) {
            const mod = await import('html-to-image');
            const dataUrl = await mod.toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `فاتورة-${invDisplay}.png`, { type: 'image/png' });
            if (nav.canShare({ files: [file] })) {
              await (nav as Navigator).share({ files: [file], title: `فاتورة ${invDisplay}`, text });
              shared = true;
            }
          }
          if (!shared) {
            await (nav as Navigator).share({ title: `فاتورة ${invDisplay}`, text });
            shared = true;
          }
        } catch {
          /* user cancelled or share failed -> fall through */
        }
      }
      if (!shared) {
        // Desktop / no Web Share: open WhatsApp with the text.
        const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(wa, '_blank');
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="print-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .print-root { font-family: 'Cairo','Tahoma',sans-serif; background:#e8e8e8; min-height:100vh; padding:20px 12px; }
        .toolbar { max-width: 297mm; margin: 0 auto 14px; display:flex; gap:10px; justify-content:center; }
        .toolbar button { font-family:'Cairo',sans-serif; font-weight:700; border:none; border-radius:10px; padding:10px 18px; cursor:pointer; font-size:14px; }
        .btn-print { background:linear-gradient(180deg,#e7c65a,#c9a227,#a8851a); color:#2a2102; box-shadow:0 4px 12px -3px rgba(168,133,26,.6); }
        .btn-share { background:linear-gradient(180deg,#34d399,#10b981,#059669); color:#fff; box-shadow:0 4px 12px -3px rgba(5,150,105,.5); }
        .btn-share:disabled { opacity:.6; cursor:default; }
        .btn-back { background:#fff; color:#333; border:1px solid #ddd; }
        .invoice { width:297mm; min-height:200mm; max-width:100%; margin:0 auto; background:#fff; border:1.5px solid #000; border-radius:14px 14px 4px 4px; padding:14mm 18mm; }
        @media (max-width:1180px){ .invoice{ width:100%; padding:18px 16px; } }
        .header { display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:20px; margin-bottom:10px; border:1px solid #000; border-radius:10px; padding:14px 22px; }
        .company-name { text-align:right; font-weight:800; font-size:19px; line-height:1.45; }
        .logo { width:80px; height:80px; display:flex; align-items:center; justify-content:center; }
        .logo img { width:80px; height:80px; object-fit:contain; }
        .title { text-align:center; color:#0e10b3; font-weight:800; font-size:26px; margin:4px 0 14px; }
        .info { display:grid; grid-template-columns:1.7fr 1fr; gap:8px 30px; margin-bottom:14px; font-size:15px; font-weight:600; padding:0 6px; }
        .info .row { display:grid; grid-template-columns:100px 10px 1fr; align-items:baseline; }
        .info .label { font-weight:700; }
        table.bill { width:100%; border-collapse:collapse; margin-bottom:10px; font-size:15px; table-layout:fixed; }
        table.bill th, table.bill td { border:1px solid #000; padding:9px 4px; text-align:center; height:36px; word-wrap:break-word; }
        table.bill thead th { background:#fcd5b4; font-weight:700; font-size:14px; }
        table.bill tbody td { font-weight:600; }
        table.bill tbody td.amount-due { color:#1f9cf0; font-weight:800; font-size:17px; }
        .written { font-size:15px; font-weight:600; margin:10px 4px 14px; line-height:1.6; }
        .written .lbl { font-weight:700; }
        .footer-line { border-top:1.5px solid #000; margin-top:6px; padding-top:12px; padding-bottom:6px; display:flex; justify-content:space-between; align-items:center; }
        .footer-line .note { color:#0e10b3; font-weight:700; font-size:14px; }
        .footer-line .accounts { font-weight:800; font-size:15px; }
        .bottom-bar { border-bottom:2px solid #000; margin-top:8px; }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          .print-root { background:#fff; padding:0; }
          .toolbar { display:none !important; }
          .invoice { border:1.5px solid #000; width:297mm; min-height:200mm; margin:0; padding:14mm 18mm; border-radius:0; }
        }
      `}</style>

      <div className="toolbar">
        <button className="btn-print" onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</button>
        <button className="btn-share" onClick={handleShare} disabled={sharing}>{sharing ? '... جاري التحضير' : '📤 مشاركة'}</button>
        <button className="btn-back" onClick={() => router.back()}>رجوع</button>
      </div>

      <div className="invoice" dir="rtl">
        <div className="header">
          <div className="company-name">{company1}<br />{company2}</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icons/logo.png`} alt="الشعار" />
            </div>
          </div>
          <div />
        </div>

        <div className="title">{title}</div>

        <div className="info">
          <div className="row"><span className="label">رقم الفاتورة</span><span>:</span><span>{invDisplay}</span></div>
          <div className="row"><span className="label">رقم الدورة</span><span>:</span><span>{invoice.cycleNumber || subscriber.routeNumber}</span></div>
          <div className="row"><span className="label">اسم المشترك</span><span>:</span><span>{subscriber.subscriberName} {subscriber.cabinName ? `— ${subscriber.cabinName}` : ''} {subscriber.subscriberNumber ? `/ ${subscriber.subscriberNumber}` : ''}</span></div>
          <div className="row"><span className="label">رقم العداد</span><span>:</span><span>{subscriber.meterNumber}</span></div>
          <div className="row"><span className="label">الفترة</span><span>:</span><span>من {invoice.periodFrom} حتى {invoice.periodTo}</span></div>
          <div className="row"><span className="label">الكبينة</span><span>:</span><span>{subscriber.cabinName}</span></div>
        </div>

        <table className="bill">
          <colgroup>
            <col style={{ width: '11.5%' }} /><col style={{ width: '11.5%' }} /><col style={{ width: '11.5%' }} /><col style={{ width: '14%' }} />
            <col style={{ width: '8%' }} /><col style={{ width: '8%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>القراءة السابقة</th><th>القراءة الحالية</th><th>الاستهلاك</th><th>القيمة</th>
              <th>خدمات</th><th>المتأخرات</th><th>مدفوع خلال الفترة</th><th>المبلغ المستحق</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{fmt(invoice.previousReading)}</td>
              <td>{fmt(invoice.currentReading)}</td>
              <td>{fmt(invoice.consumptionKwh)}</td>
              <td>{fmt(invoice.baseValue)}</td>
              <td>{invoice.servicesAmount === 0 ? '0' : fmt(invoice.servicesAmount)}</td>
              <td>{invoice.arrearsAmount === 0 ? '0' : fmt(invoice.arrearsAmount)}</td>
              <td>{invoice.paidDuringPeriod === 0 ? '' : fmt(invoice.paidDuringPeriod)}</td>
              <td className="amount-due">{fmt(invoice.netDue)}</td>
            </tr>
          </tbody>
        </table>

        <div className="written"><span className="lbl">المبلغ المستحق كتابةً هو :-</span> {invoice.netDueWords}</div>

        <div className="footer-line">
          <div className="note">{footerNote}</div>
          <div className="accounts">الحسابات</div>
        </div>
        <div className="bottom-bar" />
      </div>
    </div>
  );
}
