import { NextRequest, NextResponse } from 'next/server';
import { getContacts, addContact, deleteContact } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    try {
        const type = req.nextUrl.searchParams.get('type') as any;
        const agcode = req.nextUrl.searchParams.get('agcode');
        if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 });
        const records = await getContacts(type, agcode || undefined);
        return NextResponse.json({ records });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, ...contact } = body;
        if (!type) return NextResponse.json({ error: 'type is required' }, { status: 400 });
        const result = await addContact(type, contact);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const type = req.nextUrl.searchParams.get('type') as any;
        const rowIndex = req.nextUrl.searchParams.get('rowIndex');
        if (!type || !rowIndex) return NextResponse.json({ error: 'type and rowIndex are required' }, { status: 400 });
        const result = await deleteContact(type, parseInt(rowIndex));
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
