import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) return NextResponse.json({ error: 'GAS_URL not configured' }, { status: 500 });

    try {
        const res = await fetch(`${gasUrl}?action=getAuthSession&id=${id}`, { cache: 'no-store' });
        const data = await res.json();
        
        if (data.session && data.session.status === 'approved' && data.session.supervisorAgcode) {
            const member = await getMemberByAgcode(data.session.supervisorAgcode) as any;
            if (member && member.isAdmin) {
                data.session.adminToken = process.env.ADMIN_PASSWORD;
            }
        }
        
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action } = body; // createAuthSession or approveAuthSession

        const gasUrl = process.env.GAS_URL;
        if (!gasUrl) return NextResponse.json({ error: 'GAS_URL not configured' }, { status: 500 });

        const fetchUrl = new URL(gasUrl);
        if (action) fetchUrl.searchParams.set('action', action);
        const res = await fetch(fetchUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...body }),
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
