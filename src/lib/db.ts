// Local-first database using Dexie (IndexedDB) — stored on the user's device.
// No backend/server. All data lives in the browser/PWA.
import Dexie, { Table } from 'dexie';

export interface Subscriber {
  id: string;
  subscriberNumber: string;
  subscriberName: string;
  meterNumber: string;
  routeNumber: string;
  cabinName: string;
  locationName: string;
  phone: string;
  status: string; // active | inactive
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  cycleNumber: string;
  subscriberId: string;
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
  status: string; // draft | issued | cancelled
  notes: string;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  key: string;
  value: string;
}

class MotechDB extends Dexie {
  subscribers!: Table<Subscriber, string>;
  invoices!: Table<Invoice, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('motech_billing');
    this.version(1).stores({
      subscribers: 'id, subscriberNumber, meterNumber, subscriberName, status, createdAt',
      invoices: 'id, invoiceNumber, subscriberId, status, createdAt',
      settings: 'key',
    });
  }
}

export const db = new MotechDB();

// Generate a simple unique id (no server)
export function genId(): string {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

// ---- Settings helpers ----
const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: 'شركة العباسي',
  company_subtitle: 'لتوليد الطاقة الكهربائية',
  invoice_title: 'فاتورة استهلاك كهرباء',
  footer_note: 'ملاحظة: المحطة غير مسؤولة عن تسليم أي مبلغ بدون سند رسمي',
  default_unit_price: '220',
  currency: 'ريال',
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await db.settings.toArray();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  rows.forEach((r) => { map[r.key] = r.value; });
  return map;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

// ---- Backup / Restore (export-import to device) ----
export async function exportData(): Promise<Blob> {
  const [subscribers, invoices, settings] = await Promise.all([
    db.subscribers.toArray(),
    db.invoices.toArray(),
    db.settings.toArray(),
  ]);
  const payload = {
    app: 'motech-billing',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { subscribers, invoices, settings },
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function importData(json: string): Promise<{ subscribers: number; invoices: number; settings: number }> {
  const parsed = JSON.parse(json);
  if (parsed.app !== 'motech-billing') throw new Error('ملف غير صالح');
  const d = parsed.data || {};
  await db.transaction('rw', db.subscribers, db.invoices, db.settings, async () => {
    if (Array.isArray(d.subscribers)) await db.subscribers.bulkPut(d.subscribers);
    if (Array.isArray(d.invoices)) await db.invoices.bulkPut(d.invoices);
    if (Array.isArray(d.settings)) await db.settings.bulkPut(d.settings);
  });
  return {
    subscribers: d.subscribers?.length || 0,
    invoices: d.invoices?.length || 0,
    settings: d.settings?.length || 0,
  };
}
