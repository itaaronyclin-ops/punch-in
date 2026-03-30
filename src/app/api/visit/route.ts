import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode, getVisitRecords, addVisitRecord } from '@/lib/gas-client';
import { notifyByType, buildVisitMessage } from '@/lib/telegram';
import { format } from 'date-fns';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { agcode, purpose, clientName, notes, lat, lng } = body;

    if (!agcode || !purpose || !clientName) {
        return NextResponse.json({ error: '參數不完整' }, { status: 400 });
    }

    const member = await getMemberByAgcode(agcode.trim().toUpperCase());
    if (!member) return NextResponse.json({ error: '找不到此業務代號' }, { status: 404 });

    const now = new Date();
    const timeStr = format(now, 'yyyy-MM-dd HH:mm:ss');
    const today = format(now, 'yyyy-MM-dd');
    const id = generateId();

    await addVisitRecord({
        agcode: member.agcode,
        name: member.name,
        purpose,
        clientName,
        notes: notes || '',
        lat: lat?.toString() || '',
        lng: lng?.toString() || ''
    });

    const msg = buildVisitMessage(member.name, member.agcode, purpose, clientName, timeStr);
    await notifyByType('new_visit', msg);

    return NextResponse.json({ success: true, id });
}

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode') || undefined;
    const startDate = req.nextUrl.searchParams.get('startDate') || undefined;
    const endDate = req.nextUrl.searchParams.get('endDate') || undefined;
    const records = await getVisitRecords({ agcode, startDate, endDate });
    return NextResponse.json({ records });
}

