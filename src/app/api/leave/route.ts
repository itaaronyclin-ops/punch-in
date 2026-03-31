
import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode, getLeaveRequests, addLeaveRequest, addNotification } from '@/lib/gas-client';
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
    }) as { error?: string, status?: string, notes?: string, id?: string };

    if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
    }

    if (result.status === 'approved' || result.status === 'rejected') {
        const isApprove = result.status === 'approved';
        const msg = buildLeaveResultMessage(member.name, member.agcode, leaveDate, isApprove ? '✅ 已核准' : '❌ 已退件', result.notes || '系統自動代理審核');
        await notifyByType('leave_result', msg);

        await addNotification({
            agcode: member.agcode,
            type: 'leave_result',
            title: isApprove ? '✅ 系統已自動核准假單' : '❌ 系統已代理退件',
            content: `📅 您送出的 ${leaveDate} 請假申請，已被系統自動${isApprove ? '核准' : '退件'}。`
        });
    } else {
        const msg = buildLeaveRequestMessage(member.name, member.agcode, leaveDate, reason);
        await notifyByType('new_leave_request', msg);

        await addNotification({
            agcode: member.agcode,
            type: 'new_leave_request',
            title: '📬 假單申請已送出',
            content: `📅 您已送出 ${leaveDate} 的請假申請，目前狀態為待審核。`
        });
    }

    return NextResponse.json({ success: true, id: result.id });
}

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode') || undefined;
    const records = await getLeaveRequests({ agcode });
    return NextResponse.json({ records });
}

