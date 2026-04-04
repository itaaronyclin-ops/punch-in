import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    // 允許所有人讀取設定（用於顯示分機圖片與外播線路），但只有管理員能修改
    const settings = await getAllSettings();
    return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: '參數不完整' }, { status: 400 });
    await setSetting(key, value);
    return NextResponse.json({ success: true });
}
