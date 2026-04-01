import { NextRequest, NextResponse } from 'next/server';
import { getRequiredDays } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    
    const all = await getRequiredDays();
    
    // If agcode provided, filter to that user + ALL; otherwise return everything (admin view)
    const records = agcode
        ? all.filter(r => r.agcode === 'ALL' || r.agcode === agcode.toUpperCase())
        : all;

    records.sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ records });
}
