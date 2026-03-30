import axios from 'axios';
import { getTGSettings } from './gas-client';


export type NotificationType =
    | 'new_checkin'
    | 'new_leave_request'
    | 'leave_result'
    | 'weekly_attendance_all'
    | 'weekly_attendance_personal'
    | 'new_visit'
    | 'weekly_visit_all'
    | 'weekly_visit_personal';

export async function sendTelegramMessage(chatId: string, message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) { console.error('[TG] TELEGRAM_BOT_TOKEN not set'); return; }
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
        });
    } catch (err) {
        console.error('[TG] Failed to send message to', chatId, ':', err);
    }
}

export async function notifyByType(type: NotificationType, message: string, targetAgcode?: string) {
    const settings = await getTGSettings();
    const targets = settings.filter(s => {
        if (!s.chatId) return false;
        const types = s.notificationTypes.split(',').map(t => t.trim());
        if (!types.includes(type)) return false;
        // personal notifications only go to the specific person
        if (type === 'leave_result' || type === 'weekly_attendance_personal' || type === 'weekly_visit_personal') {
            return targetAgcode ? s.agcode === targetAgcode : false;
        }
        return true;
    });

    await Promise.all(targets.map(t => sendTelegramMessage(t.chatId, message)));
}

// ─── Notification Templates ───────────────────────────────────────────────────

export function buildCheckinMessage(name: string, agcode: string, type: string, time: string, isFieldWork: boolean): string {
    const icon = isFieldWork ? '🏃' : '✅';
    const label = isFieldWork ? '外勤簽到' : '一般簽到';
    return `${icon} <b>新簽到通知</b>\n👤 ${name}（${agcode}）\n📋 類型：${label}\n🕐 時間：${time}`;
}

export function buildLeaveRequestMessage(name: string, agcode: string, date: string, reason: string): string {
    return `📬 <b>新請假審核申請</b>\n👤 ${name}（${agcode}）\n📅 請假日期：${date}\n📝 原因：${reason}`;
}

export function buildLeaveResultMessage(name: string, date: string, status: string, reviewer: string): string {
    const icon = status === 'approved' ? '✅' : '❌';
    const label = status === 'approved' ? '已核准' : '已拒絕';
    return `${icon} <b>請假結果通知</b>\n👤 ${name}\n📅 請假日期：${date}\n📋 結果：${label}\n👨‍💼 審核人：${reviewer}`;
}

export function buildVisitMessage(name: string, agcode: string, purpose: string, client: string, time: string): string {
    return `📍 <b>新拜訪紀錄</b>\n👤 ${name}（${agcode}）\n🎯 事由：${purpose}\n👥 客戶：${client}\n🕐 時間：${time}`;
}
