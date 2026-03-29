
import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode, getLeaveRequests, addLeaveRequest } from '@/lib/gas-client';
import { notifyByType, buildLeaveRequestMessage, buildLeaveResultMessage } from '@/lib/telegram';
import { format } from 'date-fns';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { agcode, leaveDate, reason } = body;

    if (!agcode || !leaveDate || !reason) {
        return NextResponse.json({ error: '參數不完整' }, { status: 400 });
    }

    const member = await getMemberByAgcode(agcode.trim().toUpperCase());
    if (!member) return NextResponse.json({ error: '找不到此業務代號' }, { status: 404 });

    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const id = generateId();

    const result = await addLeaveRequest({
        agcode: member.agcode,
        name: member.name,
        leaveDate,
        reason
    }) as { error?: string };

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const msg = buildLeaveRequestMessage(member.name, member.agcode, leaveDate, reason);
    await notifyByType('new_leave_request', msg);

    return NextResponse.json({ success: true, id });
}

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    const all = await getLeaveRequests();
    const result = agcode ? all.filter(l => l.agcode === agcode.toUpperCase()) : all;
    return NextResponse.json({ records: result });
}

