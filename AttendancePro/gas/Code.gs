/**
 * 打卡系統 - Google Apps Script Web App
 * 部署方式：Extensions → Apps Script → Deploy → New deployment → Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * 部署後取得 Web App URL，填入 Vercel 環境變數 GAS_URL
 */

// ─── 工作表名稱常數 ────────────────────────────────────────────────────────
const SHEET = {
  MEMBERS:       'Members',
  ATTENDANCE:    'Attendance',
  LEAVE:         'LeaveRequests',
  VISIT:         'VisitRecords',
  SETTINGS:      'Settings',
  REQUIRED_DAYS: 'RequiredDays',
  TG_SETTINGS:   'TGSettings',
  NOTIFICATIONS: 'Notifications',
};

// ─── Entry Points ──────────────────────────────────────────────────────────

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter || {};
    const action = params.action;
    const body   = e.postData ? JSON.parse(e.postData.contents || '{}') : {};

    // 合併 GET params 與 POST body
    const data = Object.assign({}, params, body);
    delete data.action;

    let result;

    switch (action) {
      // ── Members ──────────────────────────────────────────────────────────
      case 'getMembers':        result = getMembers();                break;
      case 'getMemberByAgcode': result = getMemberByAgcode(data.agcode); break;
      case 'addMember':         result = addMember(data);             break;
      case 'updateMember':      result = updateMember(data);          break;
      case 'deleteMember':      result = deleteMember(data.rowIndex); break;

      // ── Attendance ────────────────────────────────────────────────────────
      case 'getAttendance':     result = getAttendance(data);         break;
      case 'addAttendance':     result = addAttendance(data);         break;
      case 'updateAttendance':  result = updateAttendance(data);      break;
      case 'deleteAttendance':  result = deleteAttendance(data.rowIndex); break;

      // ── Leave ─────────────────────────────────────────────────────────────
      case 'getLeaveRequests':  result = getLeaveRequests(data);      break;
      case 'addLeaveRequest':   result = addLeaveRequest(data);        break;
      case 'updateLeaveRequest':result = updateLeaveRequest(data);     break;

      // ── Visit ─────────────────────────────────────────────────────────────
      case 'getVisitRecords':   result = getVisitRecords(data);       break;
      case 'addVisitRecord':    result = addVisitRecord(data);         break;

      // ── Settings ──────────────────────────────────────────────────────────
      case 'getAllSettings':    result = getAllSettings();             break;
      case 'setSetting':        result = setSetting(data.key, data.value); break;

      // ── Required Days ─────────────────────────────────────────────────────
      case 'getRequiredDays':   result = getRequiredDays();           break;
      case 'addRequiredDay':    result = addRequiredDay(data);        break;
      case 'deleteRequiredDay': result = deleteRequiredDay(data.rowIndex); break;

      // ── TG Settings ───────────────────────────────────────────────────────
      case 'getTGSettings':     result = getTGSettings();             break;
      case 'addTGSetting':      result = addTGSetting(data);          break;
      case 'updateTGSetting':   result = updateTGSetting(data);       break;
      case 'deleteTGSetting':   result = deleteTGSetting(data.rowIndex); break;

      // ── Notifications ─────────────────────────────────────────────────────
      case 'getNotifications':  result = getNotifications(data); break;
      case 'addNotification':   result = addNotification(data);        break;
      case 'markNotificationRead': result = markNotificationRead(data.rowIndex); break;

      // ── Init ──────────────────────────────────────────────────────────────
      case 'initSheets':        result = initSheets();                break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message, stack: err.stack });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Spreadsheet Helper ────────────────────────────────────────────────────

function getSpreadsheet() {
  // 自動綁定您提供的 Google Sheet ID
  return SpreadsheetApp.openById('1YjR1d4o84GHFV-CehMxVSI50TvOYdnxBBFaBWjndXj0');
}

function getSheet(name) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const rawHeaders = data[0];
  const pad = n => String(n).padStart(2, '0');
  
  return data.slice(1).map((row, i) => {
    const obj = { rowIndex: i + 2 };
    rawHeaders.forEach((h, j) => {
      const val = row[j];
      let value = '';
      if (val instanceof Date) {
        if (val.getFullYear() === 1899 && val.getMonth() === 11 && val.getDate() === 30) {
          value = `${pad(val.getHours())}:${pad(val.getMinutes())}`;
        } else {
          // 格式化為 YYYY-MM-DD HH:mm:ss
          const dateStr = `${val.getFullYear()}-${pad(val.getMonth()+1)}-${pad(val.getDate())}`;
          const timeStr = `${pad(val.getHours())}:${pad(val.getMinutes())}:${pad(val.getSeconds())}`;
          // 如果時間是 00:00:00，則只回傳日期
          value = (timeStr === '00:00:00') ? dateStr : `${dateStr} ${timeStr}`;
        }
      } else {
        value = val !== undefined && val !== null ? String(val) : '';
      }
      
      const k = String(h).trim();
      obj[k] = value;
      obj[k.toLowerCase()] = value;
    });
    return obj;
  });
}



function appendRow(sheetName, values) {
  const sheet = getSheet(sheetName);
  sheet.appendRow(values);
}

function updateRow(sheetName, rowIndex, values) {
  const sheet = getSheet(sheetName);
  const range = sheet.getRange(rowIndex, 1, 1, values.length);
  range.setValues([values]);
}

function deleteRow(sheetName, rowIndex) {
  const sheet = getSheet(sheetName);
  sheet.deleteRow(parseInt(rowIndex));
}

function generateId() {
  return new Date().getTime().toString(36) + Math.random().toString(36).slice(2);
}

function nowStr() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function todayStr() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
}

// ─── Members ───────────────────────────────────────────────────────────────

function getMembers() {
  const sheet = getSheet(SHEET.MEMBERS);
  const rows = sheetToObjects(sheet);
  return { members: rows };
}

function getMemberByAgcode(agcode) {
  if (!agcode) return { error: 'agcode required' };
  const { members } = getMembers();
  const m = members.find(x => x.agcode === agcode.toUpperCase().trim());
  if (!m) return { error: '找不到此業務代號' };
  return {
    member: {
      agcode: m.agcode,
      name: m.name,
      rank: m.rank,
      group: m.group,
      supervisor: m.supervisor,
      createdAt: m.createdat,
      rowIndex: m.rowIndex,
    }
  };
}

function addMember(data) {
  const { agcode, name, rank, group, supervisor } = data;
  if (!agcode || !name || !rank) return { error: '參數不完整' };
  // 檢查重複
  const { members } = getMembers();
  if (members.find(m => m.AGCODE === agcode.toUpperCase())) return { error: '此 AGCODE 已存在' };
  appendRow(SHEET.MEMBERS, [agcode.toUpperCase(), name, rank, group || '', supervisor || '', nowStr()]);
  return { success: true };
}

function updateMember(data) {
  const { rowIndex, agcode, name, rank, group, supervisor, createdAt } = data;
  if (!rowIndex) return { error: '參數不完整' };
  updateRow(SHEET.MEMBERS, parseInt(rowIndex), [agcode || '', name || '', rank || '', group || '', supervisor || '', createdAt || '']);
  return { success: true };
}

function deleteMember(rowIndex) {
  if (!rowIndex) return { error: '參數不完整' };
  deleteRow(SHEET.MEMBERS, rowIndex);
  return { success: true };
}

// ─── Attendance ────────────────────────────────────────────────────────────

function getAttendance(data) {
  const { agcode, startDate, endDate } = data;
  const sheet = getSheet(SHEET.ATTENDANCE);
  const rows = sheetToObjects(sheet);

  let filtered = rows;
  if (startDate) {
    filtered = filtered.filter(r => r.date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(r => r.date <= endDate);
  }

  // 如果都沒有帶日期，預設 30 天
  if (!startDate && !endDate) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    filtered = filtered.filter(r => r.date >= cutoffStr);
  }

  if (agcode) filtered = filtered.filter(r => r.agcode === agcode.toUpperCase());

  return {
    records: filtered.map(r => ({
      id: r.id,
      agcode: r.agcode,
      name: r.name,
      type: r.type,
      checkinTime: r.checkintime,
      date: r.date,
      ip: r.ip,
      lat: r.lat,
      lng: r.lng,
      isFieldWork: String(r.isfieldwork).toUpperCase() === 'TRUE',
      notes: r.notes,
      rowIndex: r.rowIndex,
    }))
  };
}

function addAttendance(data) {
  const { agcode, name, type, checkinTime, date, ip, lat, lng, isFieldWork, notes } = data;
  const id = generateId();
  appendRow(SHEET.ATTENDANCE, [
    id, agcode, name, type || 'normal',
    checkinTime || nowStr(), date || todayStr(),
    ip || '', lat || '', lng || '',
    isFieldWork ? 'TRUE' : 'FALSE', notes || ''
  ]);
  return { success: true, id };
}

function updateAttendance(data) {
  const { rowIndex, id, agcode, name, type, checkinTime, date, ip, lat, lng, isFieldWork, notes } = data;
  if (!rowIndex) return { error: '參數不完整rowIndex' };
  updateRow(SHEET.ATTENDANCE, parseInt(rowIndex), [
    id || '', agcode || '', name || '', type || 'normal',
    checkinTime || nowStr(), date || todayStr(),
    ip || '', lat || '', lng || '',
    isFieldWork ? 'TRUE' : 'FALSE', notes || ''
  ]);
  return { success: true };
}

function deleteAttendance(rowIndex) {
  if (!rowIndex) return { error: '參數不完整' };
  deleteRow(SHEET.ATTENDANCE, rowIndex);
  return { success: true };
}

// ─── Leave Requests ────────────────────────────────────────────────────────

function getLeaveRequests(data) {
  const { agcode } = data;
  const sheet = getSheet(SHEET.LEAVE);
  const rows = sheetToObjects(sheet);

  let filtered = rows;
  if (agcode) filtered = filtered.filter(r => r.agcode === agcode.toUpperCase());

  return {
    records: filtered.map(r => ({
      id: r.id,
      agcode: r.agcode,
      name: r.name,
      leaveDate: r.leavedate,
      reason: r.reason,
      status: r.status,
      requestTime: r.requesttime,
      reviewTime: r.reviewtime,
      reviewer: r.reviewer,
      notes: r.notes,
      rowIndex: r.rowIndex,
    }))
  };
}

function addLeaveRequest(data) {
  const { agcode, name, leaveDate, reason } = data;
  if (!agcode || !leaveDate || !reason) return { error: '參數不完整' };
  // Check duplicate
  const { records } = getLeaveRequests({ agcode });
  const dup = records.find(r => r.leaveDate === leaveDate && r.status !== 'rejected');
  if (dup) return { error: `該日期已有請假申請（狀態：${dup.status === 'pending' ? '待審核' : '已核准'}）` };
  
  // Apply auto approval if enabled
  const { settings } = getAllSettings();
  const autoApprove = settings['auto_approve_leave'] === 'true';
  const autoAgcode = settings['auto_approve_agcode'] || 'SYSTEM';
  const status = autoApprove ? 'approved' : 'pending';
  const reviewer = autoApprove ? autoAgcode : '';
  const reviewTime = autoApprove ? nowStr() : '';
  const notes = autoApprove ? '[系統自動代理審核]' : '';

  const id = generateId();
  appendRow(SHEET.LEAVE, [id, agcode.toUpperCase(), name || '', leaveDate, reason, status, nowStr(), reviewTime, reviewer, notes]);
  return { success: true, id };
}

function updateLeaveRequest(data) {
  const { rowIndex, id, agcode, name, leaveDate, reason, status, requestTime, reviewTime, reviewer, notes } = data;
  if (!rowIndex) return { error: '參數不完整' };
  updateRow(SHEET.LEAVE, parseInt(rowIndex), [
    id || '', agcode || '', name || '', leaveDate || '',
    reason || '', status || 'pending', requestTime || '',
    reviewTime || nowStr(), reviewer || '', notes || ''
  ]);
  return { success: true };
}

// ─── Visit Records ──────────────────────────────────────────────────────────

function getVisitRecords(data) {
  const { agcode, startDate } = data;
  const sheet = getSheet(SHEET.VISIT);
  const rows = sheetToObjects(sheet);

  let filtered = rows;
  if (agcode) filtered = filtered.filter(r => r.agcode === agcode.toUpperCase());
  if (startDate) {
    filtered = filtered.filter(r => r.date >= startDate);
  } else {
    // 預設一週
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    filtered = filtered.filter(r => r.date >= cutoffStr);
  }

  return {
    records: filtered.map(r => ({
      id: r.id,
      agcode: r.agcode,
      name: r.name,
      visitTime: r.visittime,
      date: r.date,
      purpose: r.purpose,
      clientName: r.clientname,
      notes: r.notes,
      lat: r.lat,
      lng: r.lng,
      rowIndex: r.rowIndex,
    }))
  };
}

function addVisitRecord(data) {
  const { agcode, name, purpose, clientName, notes, lat, lng } = data;
  if (!agcode || !purpose || !clientName) return { error: '參數不完整' };
  const id = generateId();
  const now = nowStr();
  const today = todayStr();
  appendRow(SHEET.VISIT, [id, agcode.toUpperCase(), name || '', now, today, purpose, clientName, notes || '', lat || '', lng || '']);
  return { success: true, id };
}

// ─── Settings ──────────────────────────────────────────────────────────────

function getAllSettings() {
  const sheet = getSheet(SHEET.SETTINGS);
  const rows = sheetToObjects(sheet); // sheetToObjects handles key lowercasing
  const settings = {};
  rows.forEach(r => { 
    if (r.key) {
      settings[r.key.toLowerCase().trim()] = r.value || ''; 
    }
  });
  return { settings };
}

function getSetting(key) {
  const { settings } = getAllSettings();
  return { value: settings[key.toLowerCase().trim()] || '' };
}

function setSetting(key, value) {
  if (!key) return { error: '參數不完整' };
  const sheet = getSheet(SHEET.SETTINGS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIndex = headers.indexOf('Key');
  const valueIndex = headers.indexOf('Value');

  if (keyIndex === -1 || valueIndex === -1) return { error: 'Settings 工作表格式錯誤' };

  // Find if key exists
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIndex]) === key) {
      sheet.getRange(i + 1, valueIndex + 1).setValue(value);
      return { success: true };
    }
  }

  // If not found, find first empty row or append
  sheet.appendRow([key, value]);
  return { success: true };
}


// ─── Required Days ──────────────────────────────────────────────────────────

function getRequiredDays() {
  const sheet = getSheet(SHEET.REQUIRED_DAYS);
  const rows = sheetToObjects(sheet);
  return {
    records: rows.map(r => ({
      agcode: r.agcode,
      date: r.date,
      lateThreshold: r.latethreshold,
      rowIndex: r.rowIndex,
    }))
  };
}

function addRequiredDay(data) {
  const { agcode, date, lateThreshold } = data;
  if (!agcode || !date) return { error: '參數不完整' };
  appendRow(SHEET.REQUIRED_DAYS, [agcode.toUpperCase(), date, lateThreshold || '09:00']);
  return { success: true };
}

function deleteRequiredDay(rowIndex) {
  if (!rowIndex) return { error: '參數不完整' };
  deleteRow(SHEET.REQUIRED_DAYS, rowIndex);
  return { success: true };
}

// ─── TG Settings ───────────────────────────────────────────────────────────

function getTGSettings() {
  const sheet = getSheet(SHEET.TG_SETTINGS);
  const rows = sheetToObjects(sheet);
  return {
    records: rows.map(r => ({
      agcode: r.agcode,
      chatId: r.chatid,
      notificationTypes: r.notificationtypes,
      role: r.role,
      rowIndex: r.rowIndex,
    }))
  };
}

function addTGSetting(data) {
  const { agcode, chatId, notificationTypes, role } = data;
  if (!agcode || !chatId) return { error: '參數不完整' };
  appendRow(SHEET.TG_SETTINGS, [agcode.toUpperCase(), chatId, notificationTypes || '', role || 'ag']);
  return { success: true };
}

function updateTGSetting(data) {
  const { rowIndex, agcode, chatId, notificationTypes, role } = data;
  if (!rowIndex) return { error: '參數不完整' };
  updateRow(SHEET.TG_SETTINGS, parseInt(rowIndex), [agcode || '', chatId || '', notificationTypes || '', role || 'ag']);
  return { success: true };
}

function deleteTGSetting(rowIndex) {
  if (!rowIndex) return { error: '參數不完整' };
  deleteRow(SHEET.TG_SETTINGS, rowIndex);
  return { success: true };
}

// ─── Notifications ──────────────────────────────────────────────────────────

function getNotifications(data) {
  const { agcode } = data;
  const sheet = getSheet(SHEET.NOTIFICATIONS);
  const rows = sheetToObjects(sheet);

  // 只取近 60 天通知
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const filtered = rows.filter(r => r.agcode === agcode.toUpperCase() && r.createdat >= cutoffStr);
  
  return {
    records: filtered.map(r => ({
      id: r.id,
      agcode: r.agcode,
      type: r.type,
      title: r.title,
      content: r.content,
      createdAt: r.createdat,
      isRead: String(r.isread).toUpperCase() === 'TRUE',
      rowIndex: r.rowIndex,
    })).reverse() // 顯示最新在最前
  };
}

function addNotification(data) {
  const { agcode, type, title, content } = data;
  if (!agcode || !title || !content) return { error: '參數不完整' };
  const id = generateId();
  appendRow(SHEET.NOTIFICATIONS, [id, agcode.toUpperCase(), type || 'system', title, content, nowStr(), 'FALSE']);
  return { success: true, id };
}

function markNotificationRead(rowIndex) {
  if (!rowIndex) return { error: '參數不完整' };
  const sheet = getSheet(SHEET.NOTIFICATIONS);
  sheet.getRange(rowIndex, 7).setValue('TRUE'); // 第 7 欄是 IsRead
  return { success: true };
}

// ─── Init Sheets ────────────────────────────────────────────────────────────

function initSheets() {
  const ss = getSpreadsheet();
  const sheetDefs = [
    { name: SHEET.MEMBERS,       headers: ['AGCODE', 'Name', 'Rank', 'Group', 'Supervisor', 'CreatedAt'] },
    { name: SHEET.ATTENDANCE,    headers: ['ID', 'AGCODE', 'Name', 'Type', 'CheckinTime', 'Date', 'IP', 'Lat', 'Lng', 'IsFieldWork', 'Notes'] },
    { name: SHEET.LEAVE,         headers: ['ID', 'AGCODE', 'Name', 'LeaveDate', 'Reason', 'Status', 'RequestTime', 'ReviewTime', 'Reviewer', 'Notes'] },
    { name: SHEET.VISIT,         headers: ['ID', 'AGCODE', 'Name', 'VisitTime', 'Date', 'Purpose', 'ClientName', 'Notes', 'Lat', 'Lng'] },
    { name: SHEET.SETTINGS,      headers: ['Key', 'Value'] },
    { name: SHEET.REQUIRED_DAYS, headers: ['AGCODE', 'Date', 'LateThreshold'] },
    { name: SHEET.TG_SETTINGS,   headers: ['AGCODE', 'ChatId', 'NotificationTypes', 'Role'] },
    { name: SHEET.NOTIFICATIONS, headers: ['ID', 'AGCODE', 'Type', 'Title', 'Content', 'CreatedAt', 'IsRead'] },
  ];

  sheetDefs.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
      sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
      // 設定標題列格式
      const headerRange = sheet.getRange(1, 1, 1, def.headers.length);
      headerRange.setBackground('#4a4a4a');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
      Logger.log('Created sheet: ' + def.name);
    } else {
      Logger.log('Sheet already exists: ' + def.name);
    }
  });
}

// ─── Automatic Triggers (Option A) ──────────────────────────────────────────

/**
 * 每日報表自動觸發 (建議設定為每天晚上 21:00 ~ 22:00)
 */
function autoSendDailyReports() {
  triggerReportApi('daily');
}

/**
 * 每週報表自動觸發 (建議設定為每週一早上 08:00 ~ 09:00)
 */
function autoSendWeeklyReports() {
  triggerReportApi('weekly');
}

/**
 * 每月報表自動觸發 (建議設定為每月 1 號中午 12:00)
 */
function autoSendMonthlyReports() {
  triggerReportApi('monthly');
}

function triggerReportApi(type) {
  const settings = getAllSettings();
  const gasUrl = settings.GAS_URL || ''; 
  // 注意：此處需要 Next.js 的完整網址，通常可以從 Settings 讀取或手動定義
  const baseUrl = 'https://attendance-pro-final-v14.vercel.app'; // ⚠️ 請確保此網址正確或從設定讀取
  const url = `${baseUrl}/api/admin/report`;
  const cronSecret = 'attendance_cron_secret_79358'; // 這是我們定義的內部密鑰
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-cron-token': cronSecret
    },
    payload: JSON.stringify({ type: type }),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`[${type}] Report Trigger Status: ${response.getResponseCode()}`);
    Logger.log(response.getContentText());
  } catch (e) {
    Logger.log(`[${type}] Report Trigger Failed: ${e.message}`);
  }
}
