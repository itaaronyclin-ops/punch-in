import { NextRequest, NextResponse } from 'next/server';
import { initializeSheets } from '@/lib/gas-client';

function checkAdminAuth(req: NextRequest): boolean {
    const token = req.headers.get('x-admin-token');
    return token === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await initializeSheets();
    return NextResponse.json({ success: true, message: 'Sheets initialized successfully' });
}
