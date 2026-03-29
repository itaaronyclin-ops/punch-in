import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/auth';
import { getMembers, addMember, updateMember, deleteMember } from '@/lib/gas-client';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
    if (!checkAdminAuth(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const members = await getMembers();
    return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
    if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { action } = body;

    if (action === 'add') {
        const agcode = String(body.agcode).toUpperCase();
        await addMember({
            agcode,
            name: String(body.name),
            rank: String(body.rank),
            group: String(body.group || ''),
            supervisor: String(body.supervisor || '')
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'edit') {
        await updateMember({
            rowIndex: Number(body.rowIndex),
            agcode: String(body.agcode).toUpperCase(),
            name: String(body.name),
            rank: String(body.rank),
            group: String(body.group || ''),
            supervisor: String(body.supervisor || ''),
            createdAt: String(body.createdAt || format(new Date(), 'yyyy-MM-dd HH:mm:ss'))
        });
        return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
        await deleteMember(Number(body.rowIndex));
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
