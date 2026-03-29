
import { NextRequest, NextResponse } from 'next/server';
import { getMemberByAgcode, getSetting, getRequiredDays, getLeaveRequests, addAttendance, updateAttendance, getAttendance } from '@/lib/gas-client';
import {
    notifyByType, buildCheckinMessage
} from '@/lib/telegram';
import { format } from 'date-fns';

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { agcode, type, lat, lng, forceField } = body;

        if (!agcode || !type) {
            return NextResponse.json({ error: '參數不完整' }, { status: 400 });
        }

        const member = await getMemberByAgcode(agcode.trim().toUpperCase());
        if (!member) return NextResponse.json({ error: '找不到此業務代號' }, { status: 404 });

        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const timeStr = format(now, 'yyyy-MM-dd HH:mm:ss');

        // Check if already checked in today
        const myLogs = await getAttendance(member.agcode);
        const existingRecord = myLogs.find(r => {
            // Use local date format to avoid UTC timezone shift
            try { return format(new Date(r.date), 'yyyy-MM-dd') === today; } catch { return r.date === today; }
        });

        if (existingRecord && !body.forceDuplicate) {
            return NextResponse.json({
                error: '您今日稍早已經成功打過卡囉！是否要再次打卡？',
                needDuplicateConfirm: true
            }, { status: 400 });
        }

        const checkinLat = await getSetting('checkin_lat');
        const checkinLng = await getSetting('checkin_lng');
        const checkinRadius = await getSetting('checkin_radius');

        const requiredDays = await getRequiredDays();

        // Check if today is a required day for this member
        const isRequiredDay = requiredDays.some(r => (r.agcode === member.agcode || r.agcode === 'ALL') && r.date === today);

        let isFieldWork = false;
        let locationValid = false;

        if (lat && lng) {
            const centerLat = parseFloat(checkinLat || '0');
            const centerLng = parseFloat(checkinLng || '0');
            const radius = parseFloat(checkinRadius || '200');

            if (centerLat && centerLng) {
                const distance = getDistance(lat, lng, centerLat, centerLng);
                locationValid = distance <= radius;
            }
        }

        if (type === 'normal') {
            if (!locationValid && !forceField) {
                return NextResponse.json({
                    error: '您不在公司位置範圍內，請執行外勤簽到',
                    needFieldWork: true
                }, { status: 400 });
            }
            if (isRequiredDay && forceField) {
                // Need to check if leave is approved
                const leaveRequests = await getLeaveRequests();
                const approvedLeave = leaveRequests.find(l =>
                    l.agcode === member.agcode && l.leaveDate === today && l.status === 'approved'
                );
                if (!approvedLeave) {
                    return NextResponse.json({
                        error: '今天為必要出席日，外勤簽到需先申請請假並核准',
                        needLeave: true
                    }, { status: 400 });
                }
            }
            isFieldWork = !locationValid || forceField;
        } else if (type === 'field') {
            isFieldWork = true;
            if (isRequiredDay) {
                const leaveRequests = await getLeaveRequests();
                const approvedLeave = leaveRequests.find(l =>
                    l.agcode === member.agcode && l.leaveDate === today && l.status === 'approved'
                );
                if (!approvedLeave) {
                    return NextResponse.json({
                        error: '今天為必要出席日，外勤簽到需先申請請假並核准',
                        needLeave: true
                    }, { status: 400 });
                }
            }
        }

        // Get IP
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

        if (existingRecord) {
            await updateAttendance({
                ...existingRecord,
                type,
                checkinTime: timeStr,
                ip,
                lat: lat?.toString() || '',
                lng: lng?.toString() || '',
                isFieldWork: type === 'field',
            });
        } else {
            await addAttendance({
                agcode: member.agcode,
                name: member.name,
                type,
                checkinTime: timeStr,
                date: today,
                ip,
                lat: lat?.toString() || '',
                lng: lng?.toString() || '',
                isFieldWork: type === 'field',
                notes: ''
            });
        }

        // Send TG notification in background (fire-and-forget)
        try {
            const msg = buildCheckinMessage(member.name, member.agcode, type, timeStr, isFieldWork);
            notifyByType('new_checkin', msg); // intentionally not awaited
        } catch (e) {
            console.error('[TG] Notification launch failed:', e);
        }

        return NextResponse.json({ success: true, isFieldWork, timeStr });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || '伺服器內部錯誤' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const agcode = req.nextUrl.searchParams.get('agcode') || undefined;
        const attendance = await getAttendance({ agcode });
        return NextResponse.json({ records: attendance });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || '伺服器內部錯誤' }, { status: 500 });
    }
}
