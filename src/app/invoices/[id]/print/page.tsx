'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, getSettings, Invoice, Subscriber } from '@/lib/db';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}

// Shared invoice layout CSS (used both on-screen and in the standalone print window).
const INVOICE_CSS = `
  .invoice { width:297mm; height:210mm; box-sizing:border-box; margin:0 auto; background:#fff; border:1.5px solid #000; border-radius:14px 14px 4px 4px; padding:12mm 18mm; display:flex; flex-direction:column; overflow:hidden; }
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
  .bottom-bar { border-bottom:2px solid #000; margin-top:auto; }
`;

export default function InvoicePrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);

  // Scale the fixed-width A4 invoice DOWN to fit the screen width (no side scroll).
  useEffect(() => {
    if (loading) return;
    function fit() {
      const scaler = scalerRef.current;
      const inv = invoiceRef.current;
      const fitEl = fitRef.current;
      if (!scaler || !inv || !fitEl) return;
      const natW = inv.offsetWidth;   // ~1123px (297mm)
      const natH = inv.offsetHeight;  // ~794px (210mm)
      if (!natW) return;
      const avail = scaler.clientWidth;
      const scale = Math.min(1, avail / natW);
      fitEl.style.setProperty('--inv-scale', String(scale));
      // reserve the scaled height so there is no huge empty gap below
      fitEl.style.height = natH * scale + 'px';
    }
    fit();
    const t1 = setTimeout(fit, 250);   // after fonts/layout settle
    const t2 = setTimeout(fit, 800);
    window.addEventListener('resize', fit);
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('resize', fit); };
  }, [loading, invoice, subscriber]);

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

  function buildCopyText(): string {
    return [
      `${company1} - ${company2}`,
      title,
      `رقم الفاتورة: ${invDisplay}`,
      `رقم الدورة: ${invoice!.cycleNumber || subscriber!.routeNumber || ''}`,
      `اسم المشترك: ${subscriber!.subscriberName}`,
      `رقم العداد: ${subscriber!.meterNumber || ''}`,
      `الفترة: من ${invoice!.periodFrom} حتى ${invoice!.periodTo}`,
      `القراءة السابقة: ${fmt(invoice!.previousReading)}`,
      `القراءة الحالية: ${fmt(invoice!.currentReading)}`,
      `الاستهلاك: ${fmt(invoice!.consumptionKwh)}`,
      `القيمة: ${fmt(invoice!.baseValue)}`,
      `المبلغ المستحق: ${fmt(invoice!.netDue)}`,
      `(${invoice!.netDueWords})`,
    ].join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('تعذّر النسخ');
    }
  }

  // Build a standalone, self-contained HTML document of the invoice.
  // Used for printing in a clean window (text stays selectable -> real text PDF,
  // not an image). Avoids the PWA shell / service-worker quirks that produced
  // a blank print on some phones.
  // One reliable path for a REAL TEXT PDF (selectable/copyable, Arabic correct):
  // open a clean standalone window and let the browser print -> "Save as PDF".
  // jsPDF/html-to-image/jsPDF.html() all rasterize Arabic to an image, so the
  // browser's own print engine is the only thing that yields true Arabic text.
  function buildStandaloneHtml(banner: string): string {
    const inv = invoiceRef.current!;
    const invoiceHtml = inv.outerHTML;
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>فاتورة ${invDisplay}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
  html,body{ margin:0; padding:0; font-family:'Cairo','Tahoma',sans-serif; background:#fff; }
  ${INVOICE_CSS}
  .invoice{ transform:none !important; border:none !important; border-radius:0 !important; margin:0 auto !important; }
  @page { size: 297mm 210mm; margin: 0; }
  .pbar{ position:sticky; top:0; z-index:10; background:#0f1941; color:#fff; padding:12px; text-align:center; font-family:'Cairo',sans-serif; font-weight:700; }
  .pbar button{ font-family:'Cairo',sans-serif; font-weight:800; border:none; border-radius:10px; padding:10px 22px; font-size:15px; cursor:pointer; background:linear-gradient(180deg,#f0d066,#d4af37,#b8941f); color:#2a2102; }
  @media screen { body{ background:#e8e8e8; } .invoice{ box-shadow:0 4px 24px rgba(0,0,0,.2); margin:16px auto !important; } }
  @media print { .pbar{ display:none !important; } }
</style></head>
<body>
<div class="pbar">${banner}<br><button onclick="window.print()">📄 حفظ / طباعة PDF</button></div>
${invoiceHtml}
<script>
  function go(){ window.focus(); window.print(); }
  if (document.readyState === 'complete') { setTimeout(go, 450); }
  else { window.addEventListener('load', function(){ setTimeout(go, 450); }); }
<\/script>
</body></html>`;
  }

  function openPrintWindow(banner: string) {
    const html = buildStandaloneHtml(banner);
    const w = window.open('', '_blank');
    if (!w) { window.print(); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function handlePrint() {
    openPrintWindow('اختر الوجهة «حفظ كـ PDF» للحصول على ملف نصي');
  }

  function handleShare() {
    openPrintWindow('اختر «حفظ كـ PDF» ثم شارك الملف عبر الواتساب أو أي تطبيق');
  }

  return (
    <div className="print-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        .print-root { font-family: 'Cairo','Tahoma',sans-serif; background:#e8e8e8; min-height:100vh; padding:20px 12px; }
        /* keep background colors when printing (orange header etc.) */
        .invoice, .invoice * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
        .toolbar { max-width: 297mm; margin: 0 auto 14px; display:flex; gap:10px; justify-content:center; }
        .toolbar button { font-family:'Cairo',sans-serif; font-weight:700; border:none; border-radius:10px; padding:10px 18px; cursor:pointer; font-size:14px; }
        .btn-print { background:linear-gradient(180deg,#e7c65a,#c9a227,#a8851a); color:#2a2102; box-shadow:0 4px 12px -3px rgba(168,133,26,.6); }
        .btn-share { background:linear-gradient(180deg,#34d399,#10b981,#059669); color:#fff; box-shadow:0 4px 12px -3px rgba(5,150,105,.5); }
        .btn-share:disabled { opacity:.6; cursor:default; }
        .btn-copy { background:linear-gradient(180deg,#60a5fa,#3b82f6,#2563eb); color:#fff; box-shadow:0 4px 12px -3px rgba(37,99,235,.5); }
        .btn-back { background:#fff; color:#333; border:1px solid #ddd; }
        /* Invoice keeps its fixed A4-landscape width (297mm). On screen it is
           scaled DOWN with a CSS variable so it fits the viewport (no side-scroll). */
        .invoice-scaler { width:100%; display:flex; justify-content:center; }
        .invoice-fit { transform: scale(var(--inv-scale, 1)); transform-origin: top center; }
        ${INVOICE_CSS}
        @media print {
          /* explicit dimensions: Chrome Android ignores the bare "landscape" keyword */
          @page { size: 297mm 210mm; margin: 0; }
          html, body { margin:0 !important; padding:0 !important; }
          .print-root { background:#fff; padding:0; min-height:0; }
          .toolbar { display:none !important; }
          .invoice-scaler { display:block !important; width:auto !important; }
          .invoice-fit { transform:none !important; }
          /* exactly one A4 page: fixed 297x210mm, no overflow, no second page */
          .invoice { border:none; width:297mm; height:210mm; margin:0; padding:12mm 18mm; border-radius:0; overflow:hidden; page-break-after:avoid; page-break-inside:avoid; }
        }
      `}</style>

      <div className="toolbar">
        <button className="btn-print" onClick={handlePrint}>📄 حفظ PDF / طباعة</button>
        <button className="btn-share" onClick={handleShare}>📤 مشاركة PDF</button>
        <button className="btn-copy" onClick={handleCopy}>{copied ? '✅ تم النسخ' : '📋 نسخ البيانات'}</button>
        <button className="btn-back" onClick={() => router.back()}>رجوع</button>
      </div>

      <div className="invoice-scaler" ref={scalerRef}>
      <div className="invoice-fit" ref={fitRef}>
      <div className="invoice" dir="rtl" ref={invoiceRef}>
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
      </div>
    </div>
  );
}
