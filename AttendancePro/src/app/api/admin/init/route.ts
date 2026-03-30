import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { initializeSheets } from '@/lib/gas-client';

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await initializeSheets();
    return NextResponse.json({ success: true, message: 'Sheets initialized successfully' });
}
