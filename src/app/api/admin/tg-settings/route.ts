import { NextRequest, NextResponse } from 'next/server';
import { getTGSettings, addTGSetting, updateTGSetting, deleteTGSetting } from '@/lib/gas-client';

function checkAdminAuth(req: NextRequest): boolean {
    const token = req.headers.get('x-admin-token');
    return token === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await getTGSettings();
    return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
        if (!body.agcode || !body.chatId) return NextResponse.json({ error: '參數不完整' }, { status: 400 });
        await addTGSetting({
            agcode: String(body.agcode).toUpperCase(),
            chatId: String(body.chatId),
            notificationTypes: String(body.notificationTypes || ''),
            role: String(body.role || 'ag')
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'edit') {
        if (!body.rowIndex || !body.agcode || !body.chatId) return NextResponse.json({ error: '參數不完整' }, { status: 400 });
        await updateTGSetting({
            rowIndex: Number(body.rowIndex),
            agcode: String(body.agcode).toUpperCase(),
            chatId: String(body.chatId),
            notificationTypes: String(body.notificationTypes || ''),
            role: String(body.role || 'ag')
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
        if (!body.rowIndex) return NextResponse.json({ error: '參數不完整' }, { status: 400 });
        await deleteTGSetting(Number(body.rowIndex));
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: '無效的動作' }, { status: 400 });
}
