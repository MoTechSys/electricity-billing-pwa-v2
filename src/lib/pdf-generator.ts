import puppeteer from 'puppeteer';

interface InvoiceData {
  invoiceNumber: string;
  cycleNumber?: string;
  periodFrom: string;
  periodTo: string;
  previousReading: number;
  currentReading: number;
  consumptionKwh: number;
  unitPrice: number;
  baseValue: number;
  servicesAmount: number;
  arrearsAmount: number;
  paidDuringPeriod: number;
  grossAmount: number;
  netDue: number;
  netDueWords: string;
  currency: string;
  notes: string;
  issuedAt: Date | null;
}

interface SubscriberData {
  subscriberNumber: string;
  subscriberName: string;
  meterNumber: string;
  routeNumber: string;
  cabinName: string;
}

// Number formatter with thousands separators (e.g. 173,732.00)
function fmt(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function generateInvoicePDF(
  invoice: InvoiceData,
  subscriber: SubscriberData,
  settings: Record<string, string>
): Promise<Buffer> {
  const title = settings['invoice_title'] || 'فاتورة استهلاك كهرباء';
  const footerNote = settings['footer_note'] || 'ملاحظة: المحطة غير مسؤولة عن تسليم أي مبلغ بدون سند رسمي';
  const companyLine1 = settings['company_name'] || 'شركة العباسي';
  const companyLine2 = settings['company_subtitle'] || 'لتوليد الطاقة الكهربائية';

  // Invoice display number (numeric part) + cycle
  const invoiceDisplayNum = invoice.invoiceNumber.replace(/^INV-\d{4}-\d{2}-/, '') || invoice.invoiceNumber;
  const cycleNum = invoice.cycleNumber || subscriber.routeNumber || '';

  const subscriberLine = subscriber.routeNumber
    ? `${escapeHtml(subscriber.subscriberName)} &mdash; ${escapeHtml(subscriber.cabinName)} / ${escapeHtml(subscriber.subscriberNumber)}`
    : escapeHtml(subscriber.subscriberName);

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Cairo', 'Tahoma', sans-serif;
    background: #fff;
    color: #000;
  }
  .invoice {
    width: 297mm;
    min-height: 210mm;
    margin: 0 auto;
    background: #fff;
    border: 1.5px solid #000;
    border-radius: 14px 14px 4px 4px;
    padding: 14mm 18mm;
    position: relative;
  }

  /* ============ HEADER ============ */
  .header {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 20px;
    margin-bottom: 10px;
    border: 1px solid #000;
    border-radius: 10px;
    padding: 14px 22px;
    background: #fff;
  }
  .header .center { display: flex; justify-content: center; }
  .header .company-name {
    text-align: right;
    font-weight: 800;
    font-size: 19px;
    line-height: 1.45;
    color: #000;
  }

  /* ============ LOGO (pure CSS - circular double-ring) ============ */
  .logo {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: #fff;
    border: 3px solid #d5802b;
    box-shadow: inset 0 0 0 1.5px #fff, inset 0 0 0 3.5px #d5802b;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .logo svg { width: 36px; height: 36px; }

  .title {
    text-align: center;
    color: #0e10b3;
    font-weight: 800;
    font-size: 26px;
    margin: 4px 0 14px 0;
    letter-spacing: 0.5px;
  }

  /* ============ INFO ROWS ============ */
  .info {
    display: grid;
    grid-template-columns: 1.7fr 1fr;
    gap: 8px 30px;
    margin-bottom: 14px;
    font-size: 16px;
    font-weight: 600;
    padding: 0 6px;
  }
  .info .row {
    display: grid;
    grid-template-columns: 100px 10px 1fr;
    align-items: baseline;
  }
  .info .label { font-weight: 700; text-align: right; }
  .info .colon { font-weight: 700; text-align: center; }
  .info .value { font-weight: 600; padding-right: 8px; }

  /* ============ TABLE ============ */
  table.bill {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 15px;
    table-layout: fixed;
  }
  table.bill col.c-narrow { width: 8%; }
  table.bill col.c-standard { width: 11.5%; }
  table.bill col.c-wide { width: 14%; }
  table.bill th, table.bill td {
    border: 1px solid #000;
    padding: 9px 4px;
    text-align: center;
    height: 36px;
    word-wrap: break-word;
  }
  table.bill thead th {
    background: #fcd5b4;
    font-weight: 700;
    color: #000;
    font-size: 14.5px;
    line-height: 1.3;
  }
  table.bill tbody td { font-weight: 600; background: #fff; font-size: 15px; }
  table.bill tbody td.amount-due { color: #1f9cf0; font-weight: 800; font-size: 17px; }

  /* ============ WRITTEN AMOUNT ============ */
  .written {
    font-size: 15px;
    font-weight: 600;
    margin: 10px 4px 14px 4px;
    color: #000;
    line-height: 1.6;
  }
  .written .lbl { font-weight: 700; }

  /* ============ FOOTER ============ */
  .footer-line {
    border-top: 1.5px solid #000;
    margin-top: 6px;
    padding-top: 12px;
    padding-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .footer-line .note { color: #0e10b3; font-weight: 700; font-size: 14.5px; }
  .footer-line .accounts { font-weight: 800; font-size: 15px; color: #000; }
  .bottom-bar { border-bottom: 2px solid #000; margin-top: 8px; }

  @page { size: A4 landscape; margin: 0; }
  @media print {
    body { background: #fff; }
    .invoice {
      border: 1.5px solid #000;
      box-shadow: none;
      width: 297mm;
      min-height: 210mm;
      margin: 0;
      padding: 14mm 18mm;
    }
  }
</style>
</head>
<body>

<div class="invoice">

  <!-- HEADER -->
  <div class="header">
    <div class="company-name">
      ${escapeHtml(companyLine1)}<br>
      ${escapeHtml(companyLine2)}
    </div>
    <div class="center">
      <div class="logo">
        <svg viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0 L2 20 L10 20 L8 36 L22 14 L13 14 L16 0 Z"
            fill="#232d62" stroke="#232d62" stroke-width="0.5" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="empty-side"></div>
  </div>

  <!-- TITLE -->
  <div class="title">${escapeHtml(title)}</div>

  <!-- INFO -->
  <div class="info">
    <div class="row">
      <span class="label">رقم الفاتورة</span><span class="colon">:</span>
      <span class="value">${escapeHtml(invoiceDisplayNum)}</span>
    </div>
    <div class="row">
      <span class="label">رقم الدورة</span><span class="colon">:</span>
      <span class="value">${escapeHtml(cycleNum)}</span>
    </div>

    <div class="row">
      <span class="label">اسم المشترك</span><span class="colon">:</span>
      <span class="value">${subscriberLine}</span>
    </div>
    <div class="row">
      <span class="label">رقم العداد</span><span class="colon">:</span>
      <span class="value">${escapeHtml(subscriber.meterNumber)}</span>
    </div>

    <div class="row">
      <span class="label">الفترة</span><span class="colon">:</span>
      <span class="value">من ${escapeHtml(invoice.periodFrom)} حتى ${escapeHtml(invoice.periodTo)}</span>
    </div>
    <div class="row">
      <span class="label">الكبينة</span><span class="colon">:</span>
      <span class="value">${escapeHtml(subscriber.cabinName)}</span>
    </div>
  </div>

  <!-- TABLE -->
  <table class="bill">
    <colgroup>
      <col class="c-standard"><col class="c-standard"><col class="c-standard"><col class="c-wide">
      <col class="c-narrow"><col class="c-narrow"><col class="c-wide"><col class="c-wide">
    </colgroup>
    <thead>
      <tr>
        <th>القراءة السابقة</th>
        <th>القراءة الحالية</th>
        <th>الاستهلاك</th>
        <th>القيمة</th>
        <th>خدمات</th>
        <th>المتأخرات</th>
        <th>مدفوع خلال الفترة</th>
        <th>المبلغ المستحق</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${fmt(invoice.previousReading)}</td>
        <td>${fmt(invoice.currentReading)}</td>
        <td>${fmt(invoice.consumptionKwh)}</td>
        <td>${fmt(invoice.baseValue)}</td>
        <td>${invoice.servicesAmount === 0 ? '0' : fmt(invoice.servicesAmount)}</td>
        <td>${invoice.arrearsAmount === 0 ? '0' : fmt(invoice.arrearsAmount)}</td>
        <td>${invoice.paidDuringPeriod === 0 ? '' : fmt(invoice.paidDuringPeriod)}</td>
        <td class="amount-due">${fmt(invoice.netDue)}</td>
      </tr>
    </tbody>
  </table>

  <!-- WRITTEN AMOUNT -->
  <div class="written">
    <span class="lbl">المبلغ المستحق كتابةً هو :-</span>
    ${escapeHtml(invoice.netDueWords)}
  </div>

  <!-- FOOTER -->
  <div class="footer-line">
    <div class="note">${escapeHtml(footerNote)}</div>
    <div class="accounts">الحسابات</div>
  </div>
  <div class="bottom-bar"></div>

</div>

</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
