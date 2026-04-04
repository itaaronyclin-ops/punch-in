import { NextRequest, NextResponse } from 'next/server';
import { getTodos, addTodo, updateTodo, deleteTodo } from '@/lib/gas-client';

export async function GET(req: NextRequest) {
    try {
        const agcode = req.nextUrl.searchParams.get('agcode');
        if (!agcode) return NextResponse.json({ error: 'AGCODE is required' }, { status: 400 });
        const records = await getTodos(agcode);
        return NextResponse.json({ records });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await addTodo(body);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await updateTodo(body);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const rowIndex = req.nextUrl.searchParams.get('rowIndex');
        if (!rowIndex) return NextResponse.json({ error: 'rowIndex is required' }, { status: 400 });
        const result = await deleteTodo(parseInt(rowIndex));
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
