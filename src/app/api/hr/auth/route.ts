import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const gasUrl = process.env.GAS_URL;
    if (!gasUrl) return NextResponse.json({ error: 'GAS_URL not configured' }, { status: 500 });

    try {
        const res = await fetch(`${gasUrl}?action=getAuthSession&id=${id}`, { cache: 'no-store' });
        const data = await res.json();
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

        const res = await fetch(gasUrl, {
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
