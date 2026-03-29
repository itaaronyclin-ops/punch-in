import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!;

function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

export async function getSheets() {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

// ─── Generic Helpers ───────────────────────────────────────────────────────

export async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
  });
  return (res.data.values as string[][]) || [];
}

export async function appendRow(sheetName: string, values: string[]) {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

export async function updateRow(sheetName: string, rowIndex: number, values: string[]) {
  const sheets = await getSheets();
  const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

export async function deleteRow(sheetName: string, rowIndex: number) {
  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) throw new Error(`Sheet "${sheetName}" not found`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex,
          },
        },
      }],
    },
  });
}

// ─── Sheet: Members ─────────────────────────────────────────────────────────
// Headers: AGCODE | Name | Rank | Group | Supervisor | CreatedAt

export interface Member {
  agcode: string;
  name: string;
  rank: string;  // UM, SAS, ASA, AG
  group: string;
  supervisor: string;
  createdAt: string;
  rowIndex?: number;
}

export async function getMembers(): Promise<Member[]> {
  const rows = await readSheet('Members');
  return rows.slice(1).map((row, i) => ({
    agcode: row[0] || '',
    name: row[1] || '',
    rank: row[2] || '',
    group: row[3] || '',
    supervisor: row[4] || '',
    createdAt: row[5] || '',
    rowIndex: i + 2,
  }));
}

export async function getMemberByAgcode(agcode: string): Promise<Member | null> {
  const members = await getMembers();
  return members.find(m => m.agcode === agcode) || null;
}

// ─── Sheet: Attendance ──────────────────────────────────────────────────────
// Headers: ID | AGCODE | Name | Type | CheckinTime | Date | IP | Lat | Lng | IsFieldWork | Notes

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

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const rows = await readSheet('Attendance');
  return rows.slice(1).map((row, i) => ({
    id: row[0] || '',
    agcode: row[1] || '',
    name: row[2] || '',
    type: (row[3] as 'normal' | 'field') || 'normal',
    checkinTime: row[4] || '',
    date: row[5] || '',
    ip: row[6] || '',
    lat: row[7] || '',
    lng: row[8] || '',
    isFieldWork: row[9] === 'TRUE',
    notes: row[10] || '',
    rowIndex: i + 2,
  }));
}

// ─── Sheet: LeaveRequests ───────────────────────────────────────────────────
// Headers: ID | AGCODE | Name | LeaveDate | Reason | Status | RequestTime | ReviewTime | Reviewer | Notes

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

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  const rows = await readSheet('LeaveRequests');
  return rows.slice(1).map((row, i) => ({
    id: row[0] || '',
    agcode: row[1] || '',
    name: row[2] || '',
    leaveDate: row[3] || '',
    reason: row[4] || '',
    status: (row[5] as 'pending' | 'approved' | 'rejected') || 'pending',
    requestTime: row[6] || '',
    reviewTime: row[7] || '',
    reviewer: row[8] || '',
    notes: row[9] || '',
    rowIndex: i + 2,
  }));
}

// ─── Sheet: VisitRecords ─────────────────────────────────────────────────────
// Headers: ID | AGCODE | Name | VisitTime | Date | Purpose | ClientName | Notes | Lat | Lng

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

export async function getVisitRecords(): Promise<VisitRecord[]> {
  const rows = await readSheet('VisitRecords');
  return rows.slice(1).map((row, i) => ({
    id: row[0] || '',
    agcode: row[1] || '',
    name: row[2] || '',
    visitTime: row[3] || '',
    date: row[4] || '',
    purpose: row[5] || '',
    clientName: row[6] || '',
    notes: row[7] || '',
    lat: row[8] || '',
    lng: row[9] || '',
    rowIndex: i + 2,
  }));
}

// ─── Sheet: Settings ─────────────────────────────────────────────────────────
// Headers: Key | Value

export async function getSetting(key: string): Promise<string> {
  const rows = await readSheet('Settings');
  const row = rows.slice(1).find(r => r[0] === key);
  return row?.[1] || '';
}

export async function setSetting(key: string, value: string) {
  const rows = await readSheet('Settings');
  const rowIndex = rows.slice(1).findIndex(r => r[0] === key);
  if (rowIndex >= 0) {
    await updateRow('Settings', rowIndex + 2, [key, value]);
  } else {
    await appendRow('Settings', [key, value]);
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await readSheet('Settings');
  const result: Record<string, string> = {};
  rows.slice(1).forEach(row => {
    if (row[0]) result[row[0]] = row[1] || '';
  });
  return result;
}

// ─── Sheet: RequiredDays ─────────────────────────────────────────────────────
// Headers: AGCODE | Date | LateThreshold (HH:MM)

export interface RequiredDay {
  agcode: string;
  date: string;
  lateThreshold: string;
  rowIndex?: number;
}

export async function getRequiredDays(): Promise<RequiredDay[]> {
  const rows = await readSheet('RequiredDays');
  return rows.slice(1).map((row, i) => ({
    agcode: row[0] || '',
    date: row[1] || '',
    lateThreshold: row[2] || '',
    rowIndex: i + 2,
  }));
}

// ─── Sheet: TGSettings ───────────────────────────────────────────────────────
// Headers: AGCODE | ChatId | NotificationTypes | Role

export interface TGSetting {
  agcode: string;
  chatId: string;
  notificationTypes: string; // comma-separated
  role: string; // unit_manager, manager, ag
  rowIndex?: number;
}

export async function getTGSettings(): Promise<TGSetting[]> {
  const rows = await readSheet('TGSettings');
  return rows.slice(1).map((row, i) => ({
    agcode: row[0] || '',
    chatId: row[1] || '',
    notificationTypes: row[2] || '',
    role: row[3] || '',
    rowIndex: i + 2,
  }));
}

// ─── Init Sheets ──────────────────────────────────────────────────────────────

export async function initializeSheets() {
  const sheets = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  const sheetDefs = [
    { title: 'Members', headers: ['AGCODE', 'Name', 'Rank', 'Group', 'Supervisor', 'CreatedAt'] },
    { title: 'Attendance', headers: ['ID', 'AGCODE', 'Name', 'Type', 'CheckinTime', 'Date', 'IP', 'Lat', 'Lng', 'IsFieldWork', 'Notes'] },
    { title: 'LeaveRequests', headers: ['ID', 'AGCODE', 'Name', 'LeaveDate', 'Reason', 'Status', 'RequestTime', 'ReviewTime', 'Reviewer', 'Notes'] },
    { title: 'VisitRecords', headers: ['ID', 'AGCODE', 'Name', 'VisitTime', 'Date', 'Purpose', 'ClientName', 'Notes', 'Lat', 'Lng'] },
    { title: 'Settings', headers: ['Key', 'Value'] },
    { title: 'RequiredDays', headers: ['AGCODE', 'Date', 'LateThreshold'] },
    { title: 'TGSettings', headers: ['AGCODE', 'ChatId', 'NotificationTypes', 'Role'] },
  ];

  const sheetsToCreate = sheetDefs.filter(s => !existingSheets.includes(s.title));
  
  if (sheetsToCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: sheetsToCreate.map(s => ({
          addSheet: { properties: { title: s.title } },
        })),
      },
    });

    for (const s of sheetsToCreate) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${s.title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [s.headers] },
      });
    }
  }
}
