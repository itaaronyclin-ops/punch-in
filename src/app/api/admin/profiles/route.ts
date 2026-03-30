import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getAllProfiles, saveProfile } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const records = await getAllProfiles();
    return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action } = body;

    // This is optional if Admin wants to delete/upsert things directly
    if (action === 'save') {
        const res = await saveProfile(body.data);
        return NextResponse.json(res);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
