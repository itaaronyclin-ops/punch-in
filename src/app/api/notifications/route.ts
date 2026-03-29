import { NextRequest, NextResponse } from 'next/server';
import { getNotifications, markNotificationRead } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    if (!agcode) return NextResponse.json({ error: 'Missing agcode' }, { status: 400 });

    try {
        const records = await getNotifications(agcode);
        return NextResponse.json({ records });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { rowIndex } = await req.json();
        if (!rowIndex) return NextResponse.json({ error: 'Missing rowIndex' }, { status: 400 });
        await markNotificationRead(rowIndex);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
