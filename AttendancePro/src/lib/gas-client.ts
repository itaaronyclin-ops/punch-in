/**
 * GAS Client — 透過 Google Apps Script Web App 存取 Google Sheets
 * 環境變數：GAS_URL（GAS 部署後的 Web App URL）
 */

const GAS_URL = process.env.GAS_URL; // Remove ! to handle check manually

// ─── Base Fetch ────────────────────────────────────────────────────────────

async function gasGet<T>(action: string, params: Record<string, string> = {}, cacheSeconds = 0): Promise<T> {
    if (!GAS_URL) {
        console.error('❌ [GAS CLIENT ERROR]: GAS_URL environment variable is missing on server!');
        throw new Error('系統設定錯誤：缺少 GAS_URL 環境變數，請檢查 Vercel 設定。');
    }

    try {
        const url = new URL(GAS_URL);
        url.searchParams.set('action', action);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                url.searchParams.set(k, String(v));
            }
        });
        // Use Next.js extended fetch options for fine-grained revalidation
        const fetchOptions: RequestInit = cacheSeconds > 0
            ? { method: 'GET', next: { revalidate: cacheSeconds } }
            : { method: 'GET', cache: 'no-store' };

        const res = await fetch(url.toString(), fetchOptions);
        const data = await res.json() as Record<string, unknown>;
        if (data.error) throw new Error(data.error as string);
        return data as T;
    } catch (err: any) {
        console.error(`❌ [GAS GET FAILED]: action=${action}, error=${err.message}`);
        throw err;
    }
}

async function gasPost<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    if (!GAS_URL) {
        console.error('❌ [GAS CLIENT ERROR]: GAS_URL environment variable is missing on server!');
        throw new Error('系統設定錯誤：缺少 GAS_URL 環境變數，請檢查 Vercel 設定。');
    }

    try {
        const url = new URL(GAS_URL);
        url.searchParams.set('action', action);
        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        const data = await res.json() as Record<string, unknown>;
        if (data.error) throw new Error(data.error as string);
        return data as T;
    } catch (err: any) {
        console.error(`❌ [GAS POST FAILED]: action=${action}, error=${err.message}`);
        throw err;
    }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Member {
    agcode: string;
    name: string;
    rank: string;
    group: string;
    supervisor: string;
    createdAt: string;
    rowIndex?: number;
}

export interface AttendanceRecord {
    id: string;
    agcode: string;
    name: string;
    type: 'normal' | 'field';
    checkinTime: string;
    date: string;
    ip: string;
    lat: string;
    lng: string;
    isFieldWork: boolean;
    notes: string;
    rowIndex?: number;
}

export interface LeaveRequest {
    id: string;
    agcode: string;
    name: string;
    leaveDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestTime: string;
    reviewTime: string;
    reviewer: string;
    notes: string;
    rowIndex?: number;
}

export interface VisitRecord {
    id: string;
    agcode: string;
    name: string;
    visitTime: string;
    date: string;
    purpose: string;
    clientName: string;
    notes: string;
    lat: string;
    lng: string;
    rowIndex?: number;
}

export interface RequiredDay {
    agcode: string;
    date: string;
    lateThreshold: string;
    rowIndex?: number;
}

export interface TGSetting {
    agcode: string;
    chatId: string;
    notificationTypes: string;
    role: string;
    rowIndex?: number;
}

export interface NotificationRecord {
    id: string;
    agcode: string;
    type: string;
    title: string;
    content: string;
    createdAt: string;
    isRead: boolean;
    rowIndex: number;
}

// ─── Members ───────────────────────────────────────────────────────────────

const normalizeMember = (m: any): Member => ({
    agcode: m.agcode || m.AGCODE || m.Agcode || '',
    name: m.name || m.NAME || m.Name || '',
    rank: m.rank || m.RANK || m.Rank || 'AG',
    group: m.group || m.GROUP || m.Group || '',
    supervisor: m.supervisor || m.SUPERVISOR || m.Supervisor || '',
    createdAt: m.createdAt || m.CREATEDAT || m.CreatedAt || '',
    rowIndex: m.rowIndex
});

export async function getMembers(): Promise<Member[]> {
    // HR employee setup changes very rarely, we can cache efficiently for 30 seconds
    const data = await gasGet<{ members: any[] }>('getMembers', {}, 30);
    return (data.members || []).map(normalizeMember);
}

export async function getMemberByAgcode(agcode: string): Promise<Member | null> {
    const data = await gasGet<{ member: any }>('getMemberByAgcode', { agcode }, 30);
    return data.member ? normalizeMember(data.member) : null;
}

export async function addMember(m: Omit<Member, 'createdAt' | 'rowIndex'>) {
    return gasPost('addMember', m as unknown as Record<string, unknown>);
}

export async function updateMember(m: Member) {
    return gasPost('updateMember', m as unknown as Record<string, unknown>);
}

export async function deleteMember(rowIndex: number) {
    return gasPost('deleteMember', { rowIndex });
}

// ─── Attendance ────────────────────────────────────────────────────────────

export async function getAttendance(params: { agcode?: string; startDate?: string; endDate?: string } = {}): Promise<AttendanceRecord[]> {
    const data = await gasGet<{ records: AttendanceRecord[] }>('getAttendance', params as Record<string, string>);
    return data.records;
}

export async function addAttendance(record: Omit<AttendanceRecord, 'id' | 'rowIndex'>) {
    return gasPost('addAttendance', record as unknown as Record<string, unknown>);
}

export async function updateAttendance(record: AttendanceRecord) {
    return gasPost('updateAttendance', record as unknown as Record<string, unknown>);
}

// ─── Leave Requests ────────────────────────────────────────────────────────

export async function getLeaveRequests(params: { agcode?: string; startDate?: string; endDate?: string } = {}): Promise<LeaveRequest[]> {
    const data = await gasGet<{ records: LeaveRequest[] }>('getLeaveRequests', params as Record<string, string>);
    return data.records;
}

export async function addLeaveRequest(r: { agcode: string; name: string; leaveDate: string; reason: string }) {
    return gasPost('addLeaveRequest', r);
}

export async function updateLeaveRequest(r: LeaveRequest) {
    return gasPost('updateLeaveRequest', r as unknown as Record<string, unknown>);
}

// ─── Visit Records ─────────────────────────────────────────────────────────

export async function getVisitRecords(params: { agcode?: string; startDate?: string; endDate?: string } = {}): Promise<VisitRecord[]> {
    const data = await gasGet<{ records: VisitRecord[] }>('getVisitRecords', params as Record<string, string>);
    return data.records;
}

export async function addVisitRecord(r: Omit<VisitRecord, 'id' | 'visitTime' | 'date' | 'rowIndex'>) {
    return gasPost('addVisitRecord', r as unknown as Record<string, unknown>);
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<Record<string, string>> {
    // Cache global settings closely for up to 60 seconds
    const data = await gasGet<{ settings: Record<string, string> }>('getAllSettings', {}, 60);
    return data.settings;
}

export async function getSetting(key: string): Promise<string> {
    const settings = await getAllSettings();
    return settings[key] || '';
}

export async function setSetting(key: string, value: string) {
    return gasPost('setSetting', { key, value });
}

// ─── Required Days ──────────────────────────────────────────────────────────

export async function getRequiredDays(): Promise<RequiredDay[]> {
    // Cache required days efficiently for 30s
    const data = await gasGet<{ records: RequiredDay[] }>('getRequiredDays', {}, 30);
    return data.records;
}

export async function addRequiredDay(r: RequiredDay) {
    return gasPost('addRequiredDay', r as unknown as Record<string, unknown>);
}

export async function deleteRequiredDay(rowIndex: number) {
    return gasPost('deleteRequiredDay', { rowIndex });
}

// ─── TG Settings ────────────────────────────────────────────────────────────

export async function getTGSettings(): Promise<TGSetting[]> {
    const data = await gasGet<{ records: TGSetting[] }>('getTGSettings');
    return data.records;
}

export async function addTGSetting(r: TGSetting) {
    return gasPost('addTGSetting', r as unknown as Record<string, unknown>);
}

export async function updateTGSetting(r: TGSetting) {
    return gasPost('updateTGSetting', r as unknown as Record<string, unknown>);
}

export async function deleteTGSetting(rowIndex: number) {
    return gasPost('deleteTGSetting', { rowIndex });
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function getNotifications(agcode: string): Promise<NotificationRecord[]> {
    const data = await gasGet<{ records: NotificationRecord[] }>('getNotifications', { agcode });
    return data.records;
}

export async function addNotification(n: Omit<NotificationRecord, 'id' | 'createdAt' | 'isRead' | 'rowIndex'>) {
    return gasPost('addNotification', n as unknown as Record<string, unknown>);
}

export async function markNotificationRead(rowIndex: number) {
    return gasPost('markNotificationRead', { rowIndex });
}

// ─── Init ───────────────────────────────────────────────────────────────────

export async function initializeSheets() {
    return gasPost('initSheets');
}
