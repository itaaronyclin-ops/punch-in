import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getTGSettings, addNotification } from '@/lib/gas-client';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * 手動發送 TG 通知 API
 */
export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { message, targetAgcode } = await req.json();
        if (!message) return NextResponse.json({ error: '訊息內容不可為空' }, { status: 400 });

        const settings = await getTGSettings();
        let targets = settings.filter(s => !!s.chatId);

        if (targetAgcode) {
            targets = targets.filter(s => s.agcode === targetAgcode.toUpperCase());
        }

        if (targets.length === 0) {
            return NextResponse.json({ error: '找不到可接收通知的對象' }, { status: 404 });
        }

        await Promise.all(targets.map(t => sendTelegramMessage(t.chatId, message)));
        
        // 同時寫入前端系統通知
        await Promise.all(targets.map(t => addNotification({
            agcode: t.agcode,
            type: 'manual_broadcast',
            title: '📢 系統重要通知',
            content: message
        })));

        return NextResponse.json({ success: true, count: targets.length });
    } catch (err: any) {
        console.error('[MANUAL NOTIFY API ERROR]', err);
        return NextResponse.json({ error: err.message || '發送失敗' }, { status: 500 });
    }
}
