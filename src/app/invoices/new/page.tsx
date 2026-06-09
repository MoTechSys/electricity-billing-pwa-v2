import AppShell from '@/components/AppShell';
import InvoiceForm from '@/components/InvoiceForm';
import { Suspense } from 'react';

export default function NewInvoicePage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
        <InvoiceForm />
      </Suspense>
    </AppShell>
  );
}
