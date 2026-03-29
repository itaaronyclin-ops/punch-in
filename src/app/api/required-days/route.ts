import { NextRequest, NextResponse } from 'next/server';
import { getRequiredDays } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    const agcode = req.nextUrl.searchParams.get('agcode');
    if (!agcode) return NextResponse.json({ records: [] });
    
    const all = await getRequiredDays();
    const filtered = all.filter(r => r.agcode === 'ALL' || r.agcode === agcode.toUpperCase());
    
    // 只取今天以後（或今天）的必要出席日？
    // 或者乾脆全部回傳，讓前端自己決定是否要過濾？
    // 通常請假都是針對未來，避免雜亂，在這裡順便照日期排序
    filtered.sort((a,b) => a.date.localeCompare(b.date));
    
    return NextResponse.json({ records: filtered });
}
