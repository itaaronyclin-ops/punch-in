import { NextRequest } from 'next/server';

export function checkAdminAuth(req: NextRequest): boolean {
    const token = req.headers.get('x-admin-token');
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return false;
    return token === adminPassword;
}
