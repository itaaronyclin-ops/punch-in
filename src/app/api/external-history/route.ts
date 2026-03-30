
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    if (!agcode) return NextResponse.json({ error: 'Missing agcode' }, { status: 400 });

    try {
        const EXTERNAL_API = 'https://script.google.com/macros/s/AKfycbz4kiWGCG96zZHAJgc-wOAaCxOkS7WXf5IriAEKk0StXYFNVlME7x2SjaSva3Rp8obX/exec';
        
        const res = await fetch(EXTERNAL_API, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getPersonHistory',
                args: [agcode]
            }),
            headers: { 'Content-Type': 'application/json' },
            redirect: 'follow'
        });

        if (!res.ok) throw new Error('External API error');
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
