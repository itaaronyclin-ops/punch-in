import { getMembers, getAttendance, getLeaveRequests, getVisitRecords, getTGSettings, addNotification } from './gas-client';
import { notifyByType } from './telegram';
import { format, startOfWeek, endOfWeek, subDays } from 'date-fns';

/**
 * Generate and send weekly statistics reports via Telegram.
 * 預設發送上週一至上週日的統計。
 */
export async function generateWeeklyReports() {
    const today = new Date();
    // 上週一 (Monday)
    const startDate = format(startOfWeek(subDays(today, 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    // 上週日 (Sunday)
    const endDate = format(endOfWeek(subDays(today, 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    const [members, attendance, leaves, visits, tgSettings] = await Promise.all([
        getMembers(),
        getAttendance({ startDate, endDate }),
        getLeaveRequests({ startDate, endDate }),
        getVisitRecords({ startDate, endDate }),
        getTGSettings()
    ]);

    // ─── 1. 發送全體統計給管理員 (Role: admin) ──────────────────────────────────
    const adminTargets = tgSettings.filter(s => s.role === 'admin' && s.notificationTypes.includes('weekly_attendance_all'));
    
    if (adminTargets.length > 0) {
        let msg = `📊 <b>每週全體統計報告</b>\n📅 指標日期：${startDate} 至 ${endDate}\n\n`;
        
        const summary = members.map(m => {
            const myAtt = attendance.filter(a => a.agcode === m.agcode);
            const myLeaves = leaves.filter(l => l.agcode === m.agcode && l.status === 'approved');
            const myVisits = visits.filter(v => v.agcode === m.agcode);
            return {
                name: m.name,
                checkins: myAtt.length,
                fieldWorks: myAtt.filter(a => a.isFieldWork).length,
                leaves: myLeaves.length,
                visits: myVisits.length
            };
        });

        summary.forEach(s => {
            msg += `👤 <b>${s.name}</b>\n   ✅ 簽到：${s.checkins} (外勤 ${s.fieldWorks})\n   🌴 假單：${s.leaves}\n   📍 拜訪：${s.visits}\n\n`;
        });

        for (const target of adminTargets) {
            await notifyByType('weekly_attendance_all', msg, target.agcode);
        }
    }

    // ─── 2. 發送個人統計給每位同仁 ───────────────────────────────────────────
    const personalTargets = tgSettings.filter(s => s.notificationTypes.includes('weekly_attendance_personal'));
    
    for (const target of personalTargets) {
        const member = members.find(m => m.agcode === target.agcode);
        if (!member) continue;

        const myAtt = attendance.filter(a => a.agcode === member.agcode);
        const myLeaves = leaves.filter(l => l.agcode === member.agcode && l.status === 'approved');
        const myVisits = visits.filter(v => v.agcode === member.agcode);

        const msg = `📊 <b>您的每週個人報告</b>\n📅 指標日期：${startDate} 至 ${endDate}\n\n` +
                    `👤 同仁：${member.name}\n` +
                    `✅ 總簽到次數：${myAtt.length}\n` +
                    `🏃 其中外勤次數：${myAtt.filter(a => a.isFieldWork).length}\n` +
                    `🌴 已核准請假：${myLeaves.length} 天\n` +
                    `📍 客戶拜訪次數：${myVisits.length}\n\n` +
                    `繼續保持，祝您本週工作愉快！`;

        await notifyByType('weekly_attendance_personal', msg, target.agcode);
        
        // 同時寫入系統通知
        await addNotification({
            agcode: target.agcode,
            type: 'weekly_attendance_personal',
            title: '📜 每週出席統計報告',
            content: `📅 ${startDate} ~ ${endDate}\n✅ 簽到：${myAtt.length} 次\n🏃 外勤：${myAtt.filter(a => a.isFieldWork).length} 次\n🌴 假單：${myLeaves.length} 天\n📍 拜訪：${myVisits.length} 次`
        });
    }

    return { success: true, count: personalTargets.length + adminTargets.length };
}

/**
 * Generate Monthly Attendance Reports
 */
export async function generateMonthlyReports() {
    const today = new Date();
    // 上個月
    const lastMonth = subDays(today, today.getDate() + 1);
    const startDate = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1), 'yyyy-MM-dd');
    const endDate = format(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0), 'yyyy-MM-dd');

    const [members, attendance, leaves, visits, tgSettings] = await Promise.all([
        getMembers(),
        getAttendance({ startDate, endDate }),
        getLeaveRequests({ startDate, endDate }),
        getVisitRecords({ startDate, endDate }),
        getTGSettings()
    ]);

    const personalTargets = tgSettings.filter(s => s.notificationTypes.includes('weekly_attendance_personal'));

    for (const target of personalTargets) {
        const member = members.find(m => m.agcode === target.agcode);
        if (!member) continue;

        const myAtt = attendance.filter(a => a.agcode === member.agcode);
        const myLeaves = leaves.filter(l => l.agcode === member.agcode && l.status === 'approved');
        const myVisits = visits.filter(v => v.agcode === member.agcode);

        await addNotification({
            agcode: target.agcode,
            type: 'monthly_attendance_personal',
            title: '📅 每個月份統計報告',
            content: `🗓️ ${startDate} ~ ${endDate}\n✅ 簽到：${myAtt.length} 次\n🏃 外勤：${myAtt.filter(a => a.isFieldWork).length} 次\n🌴 假單：${myLeaves.length} 天\n📍 拜訪：${myVisits.length} 次`
        });
    }
    return { success: true, count: personalTargets.length };
}

/**
 * Generate Daily/Weekly Visit Reports
 */
export async function generateDailyVisitReports() {
    const today = format(new Date(), 'yyyy-MM-dd');

    const [members, visits, tgSettings] = await Promise.all([
        getMembers(),
        getVisitRecords({ startDate: today, endDate: today }),
        getTGSettings()
    ]);

    const personalTargets = tgSettings.filter(s => !!s.chatId);

    for (const target of personalTargets) {
        const member = members.find(m => m.agcode === target.agcode);
        if (!member) continue;

        const myVisits = visits.filter(v => v.agcode === member.agcode);
        if (myVisits.length === 0) continue;

        await addNotification({
            agcode: target.agcode,
            type: 'daily_visit_personal',
            title: '📍 今日拜訪統計',
            content: `📅 ${today}\n👥 您今日一共拜訪了 ${myVisits.length} 位客戶。`
        });
    }
    return { success: true, count: personalTargets.length };
}
