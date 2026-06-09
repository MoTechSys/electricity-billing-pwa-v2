// Real selectable Arabic-text PDF generator (client-side, no backend).
// Pipeline proven to work: arabic-reshaper (letter shaping) -> bidi-js (RTL reorder,
// keeps Latin digits in order) -> pdf-lib drawText with an embedded Arabic TTF
// (subset:false, otherwise presentation-form glyphs get dropped).
//
// Produces a single A4-landscape page that mirrors the invoice layout, with
// REAL selectable/copyable Arabic text (not a rasterized image).

import { PDFDocument, rgb, PDFFont, RGB } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { convertArabic } from 'arabic-reshaper';
import type { Invoice, Subscriber } from './db';

// Proven pipeline (verified visually with IBM Plex Sans Arabic, which has full
// presentation-form coverage): apply Arabic letter shaping with arabic-reshaper
// and right-align. With this font, Latin digits/dates/money already render in the
// correct order — NO digit reversal and NO bidi reorder needed.
function shape(text: string): string {
  if (!text) return '';
  return convertArabic(text);
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });
}

// mm -> pt
const MM = 72 / 25.4;

export interface InvoicePdfInput {
  invoice: Invoice;
  subscriber: Subscriber;
  settings: Record<string, string>;
  logoPngBytes?: Uint8Array | null;
}

export async function generateInvoicePdfBytes(input: InvoicePdfInput): Promise<Uint8Array> {
  const { invoice, subscriber, settings } = input;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const [regBytes, boldBytes] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts/IBMPlexSansArabic-Regular.ttf`).then(r => r.arrayBuffer()),
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/fonts/IBMPlexSansArabic-Bold.ttf`).then(r => r.arrayBuffer()),
  ]);
  const reg = await doc.embedFont(regBytes, { subset: false });
  const bold = await doc.embedFont(boldBytes, { subset: false });

  // A4 landscape in points
  const W = 297 * MM;
  const H = 210 * MM;
  const page = doc.addPage([W, H]);

  const navy = rgb(0x0e / 255, 0x10 / 255, 0xb3 / 255);
  const black = rgb(0, 0, 0);
  const blue = rgb(0x1f / 255, 0x9c / 255, 0xf0 / 255);
  const orange = rgb(0xfc / 255, 0xd5 / 255, 0xb4 / 255);

  const ML = 16 * MM;   // left margin
  const MR = 16 * MM;   // right margin
  const contentW = W - ML - MR;
  const rightX = W - MR;

  // Right-aligned Arabic text helper
  function drawR(text: string, y: number, size: number, font: PDFFont, color: RGB = black, x = rightX) {
    const v = shape(text);
    const w = font.widthOfTextAtSize(v, size);
    page.drawText(v, { x: x - w, y, size, font, color });
  }
  function drawC(text: string, cx: number, y: number, size: number, font: PDFFont, color: RGB = black) {
    const v = shape(text);
    const w = font.widthOfTextAtSize(v, size);
    page.drawText(v, { x: cx - w / 2, y, size, font, color });
  }


  const company1 = settings.company_name || 'شركة العباسي';
  const company2 = settings.company_subtitle || 'لتوليد الطاقة الكهربائية';
  const title = settings.invoice_title || 'فاتورة استهلاك كهرباء';
  const footerNote = settings.footer_note || 'ملاحظة: المحطة غير مسؤولة عن تسليم أي مبلغ بدون سند رسمي';
  const invDisplay = invoice.invoiceNumber.replace(/^INV-\d{4}-\d{2}-/, '') || invoice.invoiceNumber;

  let y = H - 18 * MM;

  // Header box
  const headTop = H - 12 * MM;
  const headH = 22 * MM;
  page.drawRectangle({ x: ML, y: headTop - headH, width: contentW, height: headH, borderColor: black, borderWidth: 1 });
  drawR(company1, headTop - 9 * MM, 15, bold);
  drawR(company2, headTop - 16 * MM, 13, reg);

  // Logo (embedded if provided)
  if (input.logoPngBytes) {
    try {
      const img = await doc.embedPng(input.logoPngBytes);
      const ls = 18 * MM;
      page.drawImage(img, { x: W / 2 - ls / 2, y: headTop - headH / 2 - ls / 2, width: ls, height: ls });
    } catch { /* ignore logo errors */ }
  }

  y = headTop - headH - 9 * MM;
  // Title
  drawC(title, W / 2, y, 20, bold, navy);
  y -= 9 * MM;

  // Info rows (two columns)
  const infoSize = 12;
  const lineGap = 7 * MM;
  const col2X = W / 2 - 6 * MM; // right edge of the 2nd (left) column
  const info: [string, string, number][] = [
    [`رقم الفاتورة: ${invDisplay}`, `رقم الدورة: ${invoice.cycleNumber || subscriber.routeNumber || ''}`, 0],
    [`اسم المشترك: ${subscriber.subscriberName}${subscriber.subscriberNumber ? ' / ' + subscriber.subscriberNumber : ''}`, `رقم العداد: ${subscriber.meterNumber || ''}`, 1],
    [`الفترة: من ${invoice.periodFrom} حتى ${invoice.periodTo}`, `الكبينة: ${subscriber.cabinName || ''}`, 2],
  ];
  for (const [r1, r2] of info) {
    drawR(r1, y, infoSize, reg, black, rightX);
    drawR(r2, y, infoSize, reg, black, col2X);
    y -= lineGap;
  }
  y -= 3 * MM;

  // Table
  const headers = ['القراءة السابقة', 'القراءة الحالية', 'الاستهلاك', 'القيمة', 'خدمات', 'المتأخرات', 'مدفوع خلال الفترة', 'المبلغ المستحق'];
  const weights = [11.5, 11.5, 11.5, 14, 8, 8, 14, 14];
  const totalW = weights.reduce((a, b) => a + b, 0);
  const colW = weights.map(w => (w / totalW) * contentW);
  // columns laid out RIGHT to LEFT
  const colRightX: number[] = [];
  let acc = rightX;
  for (let i = 0; i < colW.length; i++) { colRightX.push(acc); acc -= colW[i]; }
  const rowH = 11 * MM;
  const tableTop = y;

  // header row bg
  page.drawRectangle({ x: ML, y: tableTop - rowH, width: contentW, height: rowH, color: orange });
  // grid + header text
  for (let i = 0; i < headers.length; i++) {
    const cx = colRightX[i] - colW[i] / 2;
    // cell borders (header)
    page.drawRectangle({ x: colRightX[i] - colW[i], y: tableTop - rowH, width: colW[i], height: rowH, borderColor: black, borderWidth: 1 });
    drawC(headers[i], cx, tableTop - rowH / 2 - 4, 9.5, bold, black);
  }
  // value row
  const vals = [
    fmt(invoice.previousReading), fmt(invoice.currentReading), fmt(invoice.consumptionKwh), fmt(invoice.baseValue),
    invoice.servicesAmount === 0 ? '0' : fmt(invoice.servicesAmount),
    invoice.arrearsAmount === 0 ? '0' : fmt(invoice.arrearsAmount),
    invoice.paidDuringPeriod === 0 ? '' : fmt(invoice.paidDuringPeriod),
    fmt(invoice.netDue),
  ];
  const vTop = tableTop - rowH;
  for (let i = 0; i < vals.length; i++) {
    const cx = colRightX[i] - colW[i] / 2;
    page.drawRectangle({ x: colRightX[i] - colW[i], y: vTop - rowH, width: colW[i], height: rowH, borderColor: black, borderWidth: 1 });
    const isDue = i === vals.length - 1;
    drawC(vals[i], cx, vTop - rowH / 2 - 5, isDue ? 13 : 11, isDue ? bold : reg, isDue ? blue : black);
  }
  y = vTop - rowH - 9 * MM;

  // Written amount
  drawR(`المبلغ المستحق كتابةً هو :- ${invoice.netDueWords}`, y, 12, reg, black, rightX);
  y -= 10 * MM;

  // Footer line
  page.drawLine({ start: { x: ML, y: y + 5 * MM }, end: { x: rightX, y: y + 5 * MM }, thickness: 1.2, color: black });
  drawR(footerNote, y, 11, bold, navy, rightX);
  // "الحسابات" on the far left
  {
    const v = shape('الحسابات');
    page.drawText(v, { x: ML, y, size: 12, font: bold, color: black });
  }
  page.drawLine({ start: { x: ML, y: y - 6 * MM }, end: { x: rightX, y: y - 6 * MM }, thickness: 1.6, color: black });

  return await doc.save();
}

export async function generateInvoicePdfBlob(input: InvoicePdfInput): Promise<Blob> {
  const bytes = await generateInvoicePdfBytes(input);
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
