import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    // Data isolation: clerk sees only their own subscribers; admin sees all
    if (user.role !== 'admin') {
      where.createdById = user.id;
    }

    if (search) {
      where.OR = [
        { subscriberName: { contains: search } },
        { subscriberNumber: { contains: search } },
        { meterNumber: { contains: search } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({ subscribers, total, page, limit });
  } catch (error) {
    console.error('Subscribers GET error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

    const data = await request.json();
    const { subscriberNumber, subscriberName, meterNumber, routeNumber, cabinName, locationName, phone, notes } = data;

    if (!subscriberNumber || !subscriberName || !meterNumber || !routeNumber || !cabinName) {
      return NextResponse.json({ error: 'جميع الحقول الأساسية مطلوبة' }, { status: 400 });
    }

    // Check uniqueness
    const existingNumber = await prisma.subscriber.findUnique({ where: { subscriberNumber } });
    if (existingNumber) {
      return NextResponse.json({ error: 'رقم المشترك موجود مسبقاً' }, { status: 400 });
    }

    const existingMeter = await prisma.subscriber.findUnique({ where: { meterNumber } });
    if (existingMeter) {
      return NextResponse.json({ error: 'رقم العداد موجود مسبقاً' }, { status: 400 });
    }

    const subscriber = await prisma.subscriber.create({
      data: {
        subscriberNumber,
        subscriberName,
        meterNumber,
        routeNumber,
        cabinName,
        locationName: locationName || '',
        phone: phone || '',
        notes: notes || '',
        createdById: user.id,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entityType: 'subscriber',
        entityId: subscriber.id,
        action: 'create',
        newValues: JSON.stringify(subscriber),
      },
    });

    return NextResponse.json({ subscriber }, { status: 201 });
  } catch (error) {
    console.error('Subscribers POST error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
