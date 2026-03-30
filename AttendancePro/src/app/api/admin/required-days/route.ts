import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getRequiredDays, addRequiredDay, deleteRequiredDay } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await getRequiredDays();
    return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
        await addRequiredDay({
            agcode: String(body.agcode).toUpperCase(),
            date: String(body.date),
            lateThreshold: String(body.lateThreshold || '09:00')
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
        await deleteRequiredDay(Number(body.rowIndex));
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
