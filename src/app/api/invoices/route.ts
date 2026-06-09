import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { calculateInvoice, generateInvoiceNumber, numberToArabicWords } from '@/lib/invoice-utils';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const subscriberId = searchParams.get('subscriberId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    // Data isolation: clerk sees only their own issued invoices; admin sees all
    if (user.role !== 'admin') {
      where.issuedById = user.id;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { subscriber: { subscriberName: { contains: search } } },
        { subscriber: { subscriberNumber: { contains: search } } },
      ];
    }

    if (status) where.status = status;
    if (subscriberId) where.subscriberId = subscriberId;

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { subscriber: true, issuedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({ invoices, total, page, limit });
  } catch (error) {
    console.error('Invoices GET error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const data = await request.json();
    const {
      subscriberId,
      cycleNumber = '',
      periodFrom,
      periodTo,
      previousReading,
      currentReading,
      unitPrice,
      servicesAmount = 0,
      arrearsAmount = 0,
      paidDuringPeriod = 0,
      notes = '',
      statusAction = 'issue', // 'draft' or 'issue'
    } = data;

    // Validations
    if (!subscriberId || !periodFrom || !periodTo) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    if (currentReading < previousReading) {
      return NextResponse.json(
        { error: 'القراءة الحالية لا يمكن أن تكون أقل من القراءة السابقة' },
        { status: 400 }
      );
    }

    if (unitPrice <= 0) {
      return NextResponse.json({ error: 'سعر الكيلووات يجب أن يكون رقماً موجباً' }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.findUnique({ where: { id: subscriberId } });
    if (!subscriber) {
      return NextResponse.json({ error: 'المشترك غير موجود' }, { status: 404 });
    }

    // Check duplicate period
    const existingInvoice = await prisma.invoice.findFirst({
      where: { subscriberId, periodFrom, periodTo, status: { not: 'cancelled' } },
    });
    if (existingInvoice) {
      return NextResponse.json(
        { error: 'توجد فاتورة مسبقة لنفس المشترك ونفس الفترة' },
        { status: 400 }
      );
    }

    // Server-side calculation
    const calc = calculateInvoice({
      previousReading,
      currentReading,
      unitPrice,
      servicesAmount,
      arrearsAmount,
      paidDuringPeriod,
    });

    // Get currency from settings
    const currencySetting = await prisma.setting.findUnique({ where: { key: 'currency' } });
    const currency = currencySetting?.value || 'ريال';
    const netDueWords = numberToArabicWords(calc.netDue, currency);

    const invoiceStatus = statusAction === 'draft' ? 'draft' : 'issued';
    const invoiceNumber = generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        cycleNumber: String(cycleNumber || ''),
        subscriberId,
        periodFrom,
        periodTo,
        previousReading,
        currentReading,
        consumptionKwh: calc.consumptionKwh,
        unitPrice,
        baseValue: calc.baseValue,
        servicesAmount,
        arrearsAmount,
        paidDuringPeriod,
        grossAmount: calc.grossAmount,
        netDue: calc.netDue,
        netDueWords,
        currency,
        status: invoiceStatus,
        notes,
        issuedById: user.id,
        issuedAt: invoiceStatus === 'issued' ? new Date() : null,
      },
      include: { subscriber: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: 'invoice',
        entityId: invoice.id,
        action: 'create',
        newValues: JSON.stringify({ invoiceNumber, status: invoiceStatus }),
      },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Invoice POST error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
