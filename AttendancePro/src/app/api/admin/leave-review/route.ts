import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getLeaveRequests, updateLeaveRequest, getMemberByAgcode, addNotification } from '@/lib/gas-client';
import { notifyByType, buildLeaveResultMessage } from '@/lib/telegram';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await getLeaveRequests();
    return NextResponse.json({ records });
}

export async function PATCH(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { rowIndex, status, reviewer, notes } = body;

    if (!rowIndex || !status || !reviewer) {
        return NextResponse.json({ error: '參數不完整' }, { status: 400 });
    }

    // 審核時，reviewer 傳入的是操作者的 AGCODE
    const reqAgcode = reviewer.toUpperCase().trim();
    const reviewerMember = await getMemberByAgcode(reqAgcode);
    if (!reviewerMember) {
        return NextResponse.json({ error: '無效的操作者代號 (找不到此 AGCODE)' }, { status: 400 });
    }

    const validRanks = ['UM', 'SAS', 'ASA'];
    if (!validRanks.includes(reviewerMember.rank.toUpperCase())) {
        return NextResponse.json({ error: `權限不足 (您的職級為 ${reviewerMember.rank}，僅限 ASA/SAS/UM 進行審核)` }, { status: 403 });
    }

    const all = await getLeaveRequests();
    const record = all.find(l => l.rowIndex === rowIndex);
    if (!record) return NextResponse.json({ error: '找不到資料' }, { status: 404 });

    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const reviewerName = reviewerMember.name;

    await updateLeaveRequest({
        ...record,
        status,
        reviewTime: now,
        reviewer: reviewerName,
        notes: notes || record.notes || ''
    });

    const statusText = status === 'approved' ? '已核准' : '已拒絕';
    const msg = buildLeaveResultMessage(record.name, record.leaveDate, status, reviewerName);
    await notifyByType('leave_result', msg, record.agcode);

    await addNotification({
        agcode: record.agcode,
        type: 'leave_result',
        title: status === 'approved' ? '✅ 假單審核已通過' : '❌ 假單審核未通過',
        content: `📅 您的 ${record.leaveDate} 請假申請由 ${reviewerName} 審核完成。\n📋 結果：${statusText}`
    });

    return NextResponse.json({ success: true });
}
