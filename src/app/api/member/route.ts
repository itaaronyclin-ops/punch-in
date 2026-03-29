import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    if (!agcode) return NextResponse.json({ error: 'AGCODE is required' }, { status: 400 });

    const member = await getMemberByAgcode(agcode.trim().toUpperCase());
    if (!member) return NextResponse.json({ error: '找不到此業務代號' }, { status: 404 });

    return NextResponse.json({ member });
}
