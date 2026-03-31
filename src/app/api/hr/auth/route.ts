import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode } from '@/lib/gas-client';

// ─── GET: 查詢 session 狀態（電腦端輪詢）──────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) return NextResponse.json({ error: 'GAS_URL not configured' }, { status: 500 });

    try {
        const res = await fetch(`${gasUrl}?action=getAuthSession&id=${id}`, { cache: 'no-store' });
        const data = await res.json() as any;

        // 若 session 已核准，檢查掃描者是否具有 isAdmin 權限 → 回傳 admin token
        if (data.session?.status === 'approved') {
            const supervisorAgcode = (data.session.supervisorAgcode || data.session.supervisoragcode || data.session.SupervisorAgcode || '').trim();
            if (supervisorAgcode) {
                const member = await getMemberByAgcode(supervisorAgcode) as any;
                if (member?.isAdmin) {
                    data.session.adminToken = process.env.ADMIN_PASSWORD;
                }
            }
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── POST: createAuthSession / approveAuthSession ───────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, ...rest } = body;

        if (!action) return NextResponse.json({ error: 'action required' }, { status: 400 });

        const gasUrl = process.env.GAS_URL;
        if (!gasUrl) return NextResponse.json({ error: 'GAS_URL not configured' }, { status: 500 });

        // GAS router reads `action` from e.parameter (URL query string), data from POST body
        const url = new URL(gasUrl);
        url.searchParams.set('action', action);

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rest),
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
