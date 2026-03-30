import { NextRequest, NextResponse } from 'next/server';
import { getProfile, saveProfile } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    try {
        const q = req.nextUrl.searchParams.get('q');
        if (!q) return NextResponse.json({ error: 'Query is required' }, { status: 400 });

        const profile = await getProfile(q);
        return NextResponse.json({ profile });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const res = await saveProfile(body);
        return NextResponse.json(res);
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
