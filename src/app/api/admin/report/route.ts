import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { generateWeeklyReports, generateMonthlyReports, generateDailyVisitReports } from '@/lib/reports';

/**
 * API Route to trigger weekly statistics reports.
 * Used for manual testing or Vercel Cron.
 */
export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { type = 'weekly' } = await req.json().catch(() => ({}));
        let result;
        
        if (type === 'monthly') {
            result = await generateMonthlyReports();
        } else if (type === 'daily') {
            result = await generateDailyVisitReports();
        } else {
            result = await generateWeeklyReports();
        }

        return NextResponse.json({ success: true, count: result.count });
    } catch (err: any) {
        console.error('[REPORT API ERROR]', err);
        return NextResponse.json({ error: err.message || '報表生成失敗' }, { status: 500 });
    }
}
