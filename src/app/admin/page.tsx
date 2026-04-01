'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    IconGrid, IconUsers, IconClipboard, IconMapPin, IconInbox,
    IconCalendar, IconSettings, IconMessageSquare, IconLogo,
    IconShield, IconLock, IconPlus, IconX, IconEdit, IconTrash,
    IconLogOut, IconDownload, IconAlertTriangle, IconCheck, IconDatabase,
    IconCheckCircle, IconSend, IconClock, IconRefreshCw, IconRun, IconQrcode, IconCamera, IconEye, IconInfo,
    IconUserEdit, IconShieldCheck, LoadingState, SkeletonRows,
} from '@/components/Icons';
import { confirmDialog, toast } from '@/components/GlobalUI';

function formatDateTime(str: string): { date: string; time: string } {
    if (!str) return { date: '—', time: '—' };
    if (str.includes(' ')) {
        const parts = str.split(' ');
        return { 
            date: parts[0].replace(/-/g, '/'), 
            time: parts[1].length > 5 ? parts[1].substring(0, 5) : parts[1]
        };
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return { date: str, time: '—' };
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        date: `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
    };
}

function normalizeDate(str: string): string {
    if (!str) return '';
    let d = str.includes(' ') ? str.split(' ')[0] : str;
    return d.replace(/\//g, '-');
}


function generatePDFReport(title: string, dateRange: string, cols: string[], rows: (string | React.ReactNode)[][]) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body { font-family: 'Helvetica Neue', 'PingFang TC', 'Microsoft JhengHei', sans-serif; color: #111; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
                    h1 { margin: 0 0 10px 0; font-size: 24px; letter-spacing: 2px; }
                    .meta { color: #555; font-size: 13px; display: flex; justify-content: space-between; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
                    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
                    th { background-color: #f4f4f5; font-weight: bold; }
                    tr { page-break-inside: avoid; }
                    .footer { font-size: 11px; color: #888; text-align: center; position: fixed; bottom: 10px; width: 100%; }
                    @media print {
                        @page { margin: 1.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${title}</h1>
                    <div class="meta">
                        <span>統計期間：${dateRange}</span>
                        <span>製表日期：${new Date().toLocaleDateString('zh-TW')}</span>
                    </div>
                </div>
                <table>
                    <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || '—'}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
                <div class="footer">
                    內部專用文件，請妥善保管 | 由 Attendance Pro 系統自動產生
                </div>
            </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 5000);
}

const addressCache = new Map<string, string>();

function AddressCell({ lat, lng }: { lat?: string, lng?: string }) {
    const [address, setAddress] = useState<string>('');

    useEffect(() => {
        if (!lat || !lng) return;
        const key = `${lat},${lng}`;
        if (addressCache.has(key)) {
            setAddress(addressCache.get(key)!);
            return;
        }

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=zh-TW`)
            .then(r => r.json())
            .then(data => {
                const addr = data.display_name || '';
                const parts = addr.split(',').map((s: string) => s.trim());
                // OpenStreetMap logic: e.g. "建國北路二段, 中山區, 臺北市, 104, 臺灣"
                const cleanAddr = parts.slice(0, 3).reverse().join('') || '無法解析';
                addressCache.set(key, cleanAddr);
                setAddress(cleanAddr);
            })
            .catch(() => setAddress('經緯度座標'));
    }, [lat, lng]);

    if (!lat || !lng) return <span style={{ color: 'var(--text-secondary)' }}>—</span>;

    return (
        <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${address} (${lat}, ${lng})`}>
            📍 <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', textDecoration: 'underline' }}>{address || '載入中⋯'}</span>
        </a>
    );
}

type AdminSection =
    | 'overview'
    | 'members'
    | 'attendance'
    | 'leave'
    | 'visit'
    | 'required-days'
    | 'settings'
    | 'tg-settings'
    | 'reports'

function useAdminAuth() {
    const [token, setToken] = useState('');
    const [authed, setAuthed] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const saved = sessionStorage.getItem('admin_token');
        if (saved) { setToken(saved); setAuthed(true); }
        setChecking(false);
    }, []);

    const login = async (pw: string) => {
        const res = await fetch('/api/admin/members', { headers: { 'x-admin-token': pw } });
        if (res.status !== 401) {
            sessionStorage.setItem('admin_token', pw);
            setToken(pw);
            setAuthed(true);
            return true;
        }
        return false;
    };

    const logout = () => {
        sessionStorage.removeItem('admin_token');
        setToken('');
        setAuthed(false);
    };

    return { token, authed, checking, login, logout };
}

import { QRCodeSVG } from 'qrcode.react';

// ─── Login Screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (pw: string) => Promise<boolean> }) {
    const [pw, setPw] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPwForm, setShowPwForm] = useState(false);
    const [qrSessionId, setQrSessionId] = useState('');
    const [qrStatus, setQrStatus] = useState<'IDLE' | 'GENERATING' | 'WAITING' | 'SUCCESS' | 'ERROR'>('IDLE');

    // Auto-generate QR on mount
    useEffect(() => { generateQR(); }, []); // eslint-disable-line

    // Poll for QR login
    useEffect(() => {
        if (!qrSessionId || qrStatus !== 'WAITING') return;
        const check = async () => {
            try {
                const res = await fetch(`/api/hr/auth?id=${qrSessionId}`);
                const data = await res.json();
                if (data.session?.status === 'approved') {
                    if (data.session.adminToken) {
                        setQrStatus('SUCCESS');
                        const ok = await onLogin(data.session.adminToken);
                        if (!ok) { setQrStatus('ERROR'); toast.error('非管理員帳號'); }
                    } else { setQrStatus('ERROR'); toast.error('非管理員權限'); }
                } else if (data.session?.status === 'rejected') {
                    setQrStatus('ERROR'); toast.error('登入請求已被拒絕');
                }
            } catch { /* ignore */ }
        };
        const t = setInterval(check, 2000);
        return () => clearInterval(t);
    }, [qrSessionId, qrStatus, onLogin]);

    const generateQR = async () => {
        setQrStatus('GENERATING');
        // V50: 6-Digit PIN Logic
        const sid = Math.floor(100000 + Math.random() * 900000).toString();
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createAuthSession', id: sid }),
            });
            const data = await res.json();
            if (data.success) { setQrSessionId(sid); setQrStatus('WAITING'); }
            else { setQrStatus('ERROR'); toast.error('無法產生驗證碼'); }
        } catch { setQrStatus('ERROR'); toast.error('網路錯誤'); }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        const ok = await onLogin(pw);
        if (!ok) toast.error('密碼錯誤或權限不足');
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-box">
                <div className="login-icon-wrap" style={{ background: 'rgba(0,122,255,0.1)', color: 'var(--blue)' }}><IconShieldCheck size={36} /></div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>後台管理 <span style={{fontSize: '0.8rem', fontWeight: 400, opacity: 0.5}}>V.64.0</span></h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 28 }}>請使用手機掃描下方 QR Code 登入</p>

                {showPwForm ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ textAlign: 'left' }}>
                            <label className="form-label">管理員密碼</label>
                            <input type="password" className="form-input" value={pw}
                                onChange={e => setPw(e.target.value)} placeholder="••••••••" autoFocus />
                        </div>
                        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                            {loading ? <span className="spinner" /> : null}{loading ? '驗證中⋯' : '登入系統'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-full" style={{ marginTop: 10 }} onClick={() => setShowPwForm(false)}>
                            ← 使用 QR Code 登入
                        </button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        {qrStatus === 'GENERATING' && (
                            <div style={{ padding: '50px 0', color: 'var(--text-secondary)' }}>
                                <span className="spinner spinner-dark" style={{ marginBottom: 12, display: 'inline-block' }} /><br />
                                產生登入驗證碼中⋯
                            </div>
                        )}
                        {qrStatus === 'WAITING' && (
                            <>
                                <div style={{ background: '#fff', padding: 16, borderRadius: 16, display: 'inline-block', border: '1px solid var(--line)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 16 }}>
                                    <QRCodeSVG value={qrSessionId} size={190} />
                                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f2f2f7', fontSize: '1.8rem', fontWeight: 800, letterSpacing: 4, color: '#1d1d1f' }}>
                                        {qrSessionId}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#86868b', marginTop: 4 }}>授權密碼 (5分鐘有效)</div>
                                </div>
                                <button className="btn btn-ghost btn-sm" style={{ display: 'block', margin: '0 auto' }} onClick={generateQR}>重新產生</button>
                            </>
                        )}
                        {qrStatus === 'ERROR' && (
                            <div style={{ padding: '20px 0' }}>
                                <p style={{ color: 'var(--orange)', marginBottom: 16 }}>驗證失敗，請重試</p>
                                <button className="btn btn-primary btn-full" onClick={generateQR}>重新產生 QR Code</button>
                            </div>
                        )}
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--separator)' }}>
                            <button className="btn-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} onClick={() => setShowPwForm(true)}>使用密碼登入</button>
                            &nbsp;·&nbsp;
                            <a href="/" className="btn-text" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>← 返回首頁</a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
const navItems: { key: AdminSection; icon: React.ReactNode; label: string; section: string }[] = [
    { key: 'overview', icon: <IconGrid size={16} />, label: '總覽', section: '主選單' },
    { key: 'members', icon: <IconUsers size={16} />, label: '人員資料維護', section: '主選單' },
    { key: 'attendance', icon: <IconClipboard size={16} />, label: '出席紀錄', section: '紀錄查詢' },
    { key: 'visit', icon: <IconMapPin size={16} />, label: '拜訪紀錄', section: '紀錄查詢' },
    { key: 'leave', icon: <IconInbox size={16} />, label: '請假審核', section: '審核管理' },
    { key: 'reports', icon: <IconAlertTriangle size={16} />, label: '通知與報表', section: '審核管理' },
    { key: 'required-days', icon: <IconCalendar size={16} />, label: '必要出席日', section: '系統設定' },
    { key: 'settings', icon: <IconSettings size={16} />, label: '系統設定', section: '系統設定' },
    { key: 'tg-settings', icon: <IconMessageSquare size={16} />, label: 'TG 通知設定', section: '系統設定' },
];

function Sidebar({
    section,
    setSection,
    onLogout,
}: {
    section: AdminSection;
    setSection: (s: AdminSection) => void;
    onLogout: () => void;
}) {
    const sections = ['主選單', '紀錄查詢', '審核管理', '系統設定'];

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, background: 'var(--accent)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><IconLogo size={16} /></div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>出勤管理</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>後台管理系統</div>
                    </div>
                </div>
            </div>

            <div className="sidebar-items-wrap" id="sidebar-items">
                {sections.map(sec => {
                    const items = navItems.filter(n => n.section === sec);
                    return (
                        <div key={sec}>
                            <div className="sidebar-section-title">{sec}</div>
                            {items.map(item => (
                                <button
                                    key={item.key}
                                    className={`sidebar-item ${section === item.key ? 'active' : ''}`}
                                    onClick={() => setSection(item.key)}
                                >
                                    <span className="sidebar-icon">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    );
                })}
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--separator)', marginTop: 'auto' }}>
                <button className="btn btn-ghost btn-sm btn-full" onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                    <IconLogOut size={14} /> 登出
                </button>
            </div>
        </div>
    );
}

// ─── Overview ─────────────────────────────────────────────────────────────
function OverviewSection({ token }: { token: string }) {
    const [stats, setStats] = useState({ members: 0, todayCheckins: 0, pendingLeaves: 0, todayVisits: 0 });
    const [loading, setLoading] = useState(true);
    const [rawMembers, setRawMembers] = useState<any[]>([]);
    const [rawCheckins, setRawCheckins] = useState<any[]>([]);
    const [rawLeaves, setRawLeaves] = useState<any[]>([]);

    const headers = { 'x-admin-token': token };
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        (async () => {
            try {
                const [mr, ar, lr, vr] = await Promise.all([
                    fetch('/api/admin/members', { headers }),
                    fetch('/api/checkin', { headers }),
                    fetch('/api/admin/leave-review', { headers }),
                    fetch('/api/visit', { headers }),
                ]);
                const [md, ad, ld, vd] = await Promise.all([
                    mr.ok ? mr.json().catch(() => ({})) : {},
                    ar.ok ? ar.json().catch(() => ({})) : {},
                    lr.ok ? lr.json().catch(() => ({})) : {},
                    vr.ok ? vr.json().catch(() => ({})) : {},
                ]) as any[];

                setRawMembers(md.members || []);
                setRawCheckins(ad.records || []);
                setRawLeaves(ld.records || []);

                const _todayMatches = (r: any) => {
                    const d = new Date(r.date);
                    return (!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : r.date) === today;
                };
                setStats({
                    members: md.members?.length ?? 0,
                    todayCheckins: ad.records?.filter(_todayMatches).length ?? 0,
                    pendingLeaves: ld.records?.filter((r: any) => r.status === 'pending').length ?? 0,
                    todayVisits: vd.records?.filter(_todayMatches).length ?? 0,
                });
            } finally { setLoading(false); }
        })();
    }, []);

    const downloadMonthlySummary = () => {
        if (!rawMembers.length) {
            toast.error('無資料可匯出');
            return;
        }

        const rows = [['AGCODE', '姓名', '職級', '組別', '本月出勤天數', '本月已核准請假次數', '本月外勤次數']];

        rawMembers.forEach(m => {
            const myCheckins = rawCheckins.filter(c => c.agcode === m.agcode);
            const myLeaves = rawLeaves.filter(l => l.agcode === m.agcode && l.status === 'approved');

            // Unique checkin days (some might check in twice)
            const checkinDays = new Set(myCheckins.map(c => c.date)).size;
            const fieldCount = myCheckins.filter(c => c.isFieldWork).length;
            const leaveCount = myLeaves.length;

            rows.push([m.agcode, m.name, m.rank || '', m.group || '', checkinDays.toString(), leaveCount.toString(), fieldCount.toString()]);
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `出勤月結報表_${today}.csv`;
        a.click();
        toast.success('報表已匯出');
    };

    const cards = [
        { label: '人員總數', value: stats.members, icon: <IconUsers size={22} />, color: '#007aff' },
        { label: '今日簽到', value: stats.todayCheckins, icon: <IconCheckCircle size={22} />, color: '#30c05d' },
        { label: '待審假單', value: stats.pendingLeaves, icon: <IconInbox size={22} />, color: '#ff9500' },
        { label: '今日拜訪', value: stats.todayVisits, icon: <IconMapPin size={22} />, color: '#af52de' },
    ];

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">總覽</h1>
                    <p className="page-subtitle">{today} 即時資料</p>
                </div>
                <button className="btn btn-primary" onClick={downloadMonthlySummary}><IconCalendar size={16} /> 匯出出勤月報表</button>
            </div>
            <div className="stats-grid">
                {cards.map(c => (
                    <div className="stat-card" key={c.label}>
                        <div style={{ marginBottom: 10, color: c.color }}>{c.icon}</div>
                        <div className="stat-value" style={{ color: c.color }}>{loading ? '—' : c.value}</div>
                        <div className="stat-label">{c.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Attendance Report ─────────────────────────────────────────────────────
function AttendanceSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [requiredDays, setRequiredDays] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterGroup, setFilterGroup] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterStart, setFilterStart] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 6);
        return d.toISOString().split('T')[0];
    });
    const [filterEnd, setFilterEnd] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [attRes, rdRes, lvRes, memRes] = await Promise.all([
                    fetch(`/api/checkin?startDate=${filterStart}&endDate=${filterEnd}`, { headers: { 'x-admin-token': token } }),
                    fetch(`/api/required-days`, { headers: { 'x-admin-token': token } }),
                    fetch(`/api/leave`, { headers: { 'x-admin-token': token } }),
                    fetch(`/api/member`, { headers: { 'x-admin-token': token } }),
                ]);
                if (attRes.ok) { const d = await attRes.json(); setRecords(d.records || []); }
                if (rdRes.ok) { const d = await rdRes.json(); setRequiredDays(d.records || []); }
                if (lvRes.ok) { const d = await lvRes.json(); setLeaves(d.records || []); }
                if (memRes.ok) { const d = await memRes.json(); setAllMembers(d.members || []); }
            } catch (err) { console.error(err); }
            setLoading(false);
        })();
    }, [token, filterStart, filterEnd]);

    const filtered = records.filter(r => {
        const rDate = normalizeDate(r.date);
        const inDate = rDate >= filterStart && rDate <= filterEnd;
        const inName = !filterName || (r.name || '').includes(filterName) || r.agcode.includes(filterName.toUpperCase());
        return inDate && inName;
    });

    const badgeInline = (color: string, text: string) => (
        <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 700, background: color + '22', color, marginLeft: 6 }}>{text}</span>
    );

    // Check if a record is late
    const isLate = (r: any): boolean => {
        const rd = requiredDays.find(d => (d.agcode === r.agcode || d.agcode === 'ALL') && d.date === normalizeDate(r.date));
        if (!rd || !rd.lateThreshold) return false;
        // Normalize: compare HH:mm to ensure formats match
        const checkinTimeOnly = (r.checkinTime || '').split(' ')[1]?.slice(0, 5) || ''; 
        const thresh = rd.lateThreshold.slice(0, 5);
        if (!checkinTimeOnly || !thresh) return false;
        return checkinTimeOnly > thresh;
    };

    // Get absent required days across ALL members
    const getMissingRows = (): { agcode: string; name: string; date: string; hasLeave: boolean }[] => {
        // Build map of (agcode -> Set<date>) for checked-in days
        const checkedMap = new Map<string, Set<string>>();
        records.forEach(r => {
            if (!checkedMap.has(r.agcode)) checkedMap.set(r.agcode, new Set());
            checkedMap.get(r.agcode)!.add(normalizeDate(r.date));
        });

        const result: { agcode: string; name: string; date: string; hasLeave: boolean }[] = [];
        requiredDays.forEach(rd => {
            if (rd.date < filterStart || rd.date > filterEnd) return;
            // For 'ALL', use full member list; otherwise use the specific agcode
            const targets: { agcode: string; name: string }[] = rd.agcode === 'ALL'
                ? allMembers.map((m: any) => ({ agcode: String(m.agcode || m.AGCODE || '').toUpperCase(), name: m.name || m.Name || '' }))
                : [{ agcode: rd.agcode.toUpperCase(), name: allMembers.find((m: any) => String(m.agcode || m.AGCODE || '').toUpperCase() === rd.agcode.toUpperCase())?.name || rd.agcode }];

            targets.forEach(({ agcode: ag, name }) => {
                if (!ag) return;
                // Apply filterName if set
                if (filterName && !name.includes(filterName) && !ag.includes(filterName.toUpperCase())) return;
                if (checkedMap.get(ag)?.has(rd.date)) return; // already checked in
                const hasLeave = leaves.some(
                    (l: any) => l.agcode === ag && l.leaveDate === rd.date && l.status === 'approved'
                );
                result.push({ agcode: ag, name, date: rd.date, hasLeave });
            });
        });
        return result.sort((a, b) => b.date.localeCompare(a.date));
    };

    const exportCSV = () => {
        const rows = [['日期', '姓名', 'AGCODE', '簽到時間', '類型', '遲到', 'IP', '緯度', '經度']];
        filtered.forEach(r => {
            const dt = formatDateTime(r.checkinTime);
            const isField = r.type === 'field' || String(r.isFieldWork).toLowerCase() === 'true';
            rows.push([normalizeDate(r.date), r.name, r.agcode, `${dt.date} ${dt.time}`, isField ? '外勤' : '一般', isLate(r) ? '是' : '', r.ip, r.lat || '', r.lng || '']);
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `attendance_${filterStart}_${filterEnd}.csv`;
        a.click();
    };

    const exportPDF = () => {
        const rows = filtered.map(r => {
            const dt = formatDateTime(r.checkinTime);
            const isField = r.type === 'field' || String(r.isFieldWork).toLowerCase() === 'true';
            return [normalizeDate(r.date), r.name, r.agcode, dt.time, isField ? '外勤' : '一般', (r.lat && r.lng) ? `${parseFloat(r.lat).toFixed(4)}, ${parseFloat(r.lng).toFixed(4)}` : '—', r.ip];
        });
        generatePDFReport(
            '業務人員出席紀錄報表',
            `${filterStart} 至 ${filterEnd}`,
            ['日期', '姓名', '代號', '打卡時間', '類型', 'GPS 座標', '來源 IP'],
            rows
        );
    };

    const missingRows = getMissingRows();

    return (
        <div className="printable-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">出席紀錄</h1>
                    <p className="page-subtitle">查詢與匯出出席資料</p>
                </div>
                <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={exportPDF}>📄 匯出 PDF</button>
                    <button className="btn btn-ghost" onClick={exportCSV}>⬇ 匯出 CSV</button>
                </div>
            </div>

            <div className="filter-bar no-print">
                <div className="filter-group">
                    <div className="filter-label">開始日期</div>
                    <input type="date" className="form-input" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                </div>
                <div className="filter-group">
                    <div className="filter-label">結束日期</div>
                    <input type="date" className="form-input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                </div>
                <div className="filter-group">
                    <div className="filter-label">姓名 / AGCODE</div>
                    <input type="text" className="form-input" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="輸入搜尋" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '12px 0' }}>共 {filtered.length} 筆</span>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr><th>日期</th><th>姓名</th><th>AGCODE</th><th>時間</th><th>類型</th><th style={{ textAlign: 'center' }}>位置</th><th>IP</th></tr></thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={7} rows={5} /> : filtered.length === 0 && missingRows.length === 0
                            ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">無符合的紀錄</div></div></td></tr>
                            : <>
                                {filtered.sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date))).map((r, i) => {
                                    const checkinDt = formatDateTime(r.checkinTime);
                                    const isField = r.type === 'field' || String(r.isFieldWork).toLowerCase() === 'true';
                                    const late = isLate(r);
                                    return (
                                        <tr key={i}>
                                            <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(r.date).date}</td>
                                            <td style={{ fontWeight: 600 }}>{r.name}</td>
                                            <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{r.agcode}</code></td>
                                        <td>{late && badgeInline('#FF9500', '遲到')}
                                            {checkinDt.time}
                                            </td>
                                            <td>{isField ? <span className="badge badge-yellow">外勤</span> : <span className="badge badge-green">一般</span>}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <AddressCell lat={r.lat} lng={r.lng} />
                                            </td>
                                            <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.ip}</span></td>
                                        </tr>
                                    );
                                })}
                                {missingRows.map((m, i) => (
                                    <tr key={`miss-${i}`} style={{ background: m.hasLeave ? 'rgba(52,199,89,0.05)' : 'rgba(255,59,48,0.05)' }}>
                                        <td style={{ fontVariantNumeric: 'tabular-nums', color: m.hasLeave ? '#34C759' : '#FF3B30', fontWeight: 600 }}>{m.date}</td>
                                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                                        <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{m.agcode}</code></td>
                                        <td>—</td>
                                        <td>{m.hasLeave ? badgeInline('#34C759', '請假') : badgeInline('#FF3B30', '缺席')}</td>
                                        <td>—</td>
                                        <td>—</td>
                                    </tr>
                                ))}
                            </>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Leave Review ─────────────────────────────────────────────────────────
function LeaveSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [reviewing, setReviewing] = useState<any>(null);
    const [reviewer, setReviewer] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [autoAgcode, setAutoAgcode] = useState('');
    const [autoAction, setAutoAction] = useState('approve');
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    const h = { 'x-admin-token': token, 'Content-Type': 'application/json' };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/leave-review', { headers: { 'x-admin-token': token } });
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch { }

        try {
            const sRes = await fetch('/api/admin/settings', { headers: { 'x-admin-token': token } });
            if (sRes.ok) {
                const sData = await sRes.json();
                const settings = sData.settings || {};
                setAutoAgcode(settings.auto_approve_agcode || '');
                setIsAutoMode(settings.auto_approve_leave === 'true');
                setAutoAction(settings.auto_approve_action || 'approve');
            }
        } catch { }

        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const doReview = async (status: 'approved' | 'rejected') => {
        if (!reviewer) return;
        setSaving(true);
        const res = await fetch('/api/admin/leave-review', {
            method: 'PATCH', headers: h,
            body: JSON.stringify({ rowIndex: reviewing.rowIndex, status, reviewer, notes }),
        });
        if (res.ok) { setReviewing(null); load(); }
        setSaving(false);
    };

    const filtered = records.filter(r => filter === 'all' || r.status === filter);

    const statusBadge = (s: string) => {
        if (s === 'pending') return <span className="badge badge-yellow">待審核</span>;
        if (s === 'approved') return <span className="badge badge-green">已核准</span>;
        return <span className="badge badge-red">已拒絕</span>;
    };

    const handleBulkReview = async (status: 'approved' | 'rejected') => {
        const pending = records.filter(r => r.status === 'pending');
        if (pending.length === 0) { toast.error('目前沒有待處理的案件'); return; }
        if (!autoAgcode) { toast.error('請先輸入代表審核人的 AGCODE'); return; }

        confirmDialog(`確定要批次【${status === 'approved' ? '核准' : '駁回'}】目前的 ${pending.length} 筆待處理案件嗎？`, async () => {
            setBulkLoading(true);
            let count = 0;
            for (const rec of pending) {
                try {
                    await fetch('/api/admin/leave-review', {
                        method: 'PATCH', headers: h,
                        body: JSON.stringify({ rowIndex: rec.rowIndex, status, reviewer: autoAgcode, notes: `[系統批次代理審核]` }),
                    });
                    count++;
                } catch { }
            }
            toast.success(`批次處理完成，共處理 ${count} 筆案件`);
            load();
            setBulkLoading(false);
        });
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">請假審核</h1>
                    <p className="page-subtitle">審核人員請假申請</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <style>{`
                        @keyframes breathe {
                            0% { opacity: 0.1; }
                            50% { opacity: 0.4; }
                            100% { opacity: 0.1; }
                        }
                        .breathing-light {
                            position: absolute;
                            inset: 0;
                            background: var(--blue);
                            animation: breathe 2s infinite ease-in-out;
                            pointer-events: none;
                        }
                    `}</style>
                    <div style={{
                        display: 'flex',
                        background: 'var(--gray-bg)',
                        padding: '4px 8px',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        alignItems: 'center',
                        gap: 8,
                        border: isAutoMode ? '1px solid var(--blue)' : '1px solid transparent',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {isAutoMode && <div className="breathing-light" />}
                        <span style={{ fontWeight: 600, color: isAutoMode ? 'var(--blue)' : 'var(--text-secondary)', zIndex: 1, position: 'relative' }}>
                            {isAutoMode ? '⚡ 自動審核 ON' : '⚙️ 自動審核設定'}
                        </span>
                        <input
                            type="text"
                            className="form-input"
                            style={{ width: 100, height: 28, padding: '0 8px', fontSize: '0.8rem', zIndex: 1, position: 'relative' }}
                            placeholder="代理人 AGCODE"
                            value={autoAgcode}
                            onChange={e => setAutoAgcode(e.target.value.toUpperCase())}
                        />
                        <select
                            className="form-select"
                            style={{ width: 100, height: 28, padding: '0 8px', fontSize: '0.8rem', zIndex: 1, position: 'relative' }}
                            value={autoAction}
                            onChange={e => setAutoAction(e.target.value)}
                        >
                            <option value="approve">全部同意</option>
                            <option value="reject">全部拒絕</option>
                        </select>
                        <button
                            className={`btn btn-sm ${isAutoMode ? 'btn-red' : 'btn-primary'}`}
                            style={{ zIndex: 1, position: 'relative', background: isAutoMode ? 'var(--red)' : '' }}
                            onClick={async () => {
                                if (!autoAgcode) return toast.error('請先輸入 AGCODE');
                                const newState = !isAutoMode;
                                try {
                                    await fetch('/api/admin/settings', { method: 'POST', headers: h, body: JSON.stringify({ key: 'auto_approve_leave', value: newState ? 'true' : 'false' }) });
                                    await fetch('/api/admin/settings', { method: 'POST', headers: h, body: JSON.stringify({ key: 'auto_approve_action', value: autoAction }) });
                                    await fetch('/api/admin/settings', { method: 'POST', headers: h, body: JSON.stringify({ key: 'auto_approve_agcode', value: autoAgcode }) });
                                    setIsAutoMode(newState);
                                    toast.success(`自動審核模式已${newState ? '啟動' : '關閉'}`);
                                } catch {
                                    toast.error('設定儲存失敗');
                                }
                            }}
                        >
                            {isAutoMode ? '關閉自動審核' : '重設並開啟'}
                        </button>
                    </div>
                </div>
            </div>

            {isAutoMode && (
                <div className="alert alert-blue" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'fadeIn 0.3s' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                        <b>⚡ 自動審核運作中：</b> 將會以 <code>{autoAgcode}</code> 的身分對所有新申請單自動執行「<b>{autoAction === 'approve' ? '全部同意' : '全部拒絕'}</b>」。
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm" onClick={() => handleBulkReview('approved')} disabled={bulkLoading}>
                            ✅ 批次同意送出 ({records.filter(r => r.status === 'pending').length})
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleBulkReview('rejected')} disabled={bulkLoading}>
                            ❌ 批次拒絕退件
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                    <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
                        {{ all: '全部', pending: '待審核', approved: '已核准', rejected: '已拒絕' }[f]}
                        {f === 'pending' && <span className="badge badge-red" style={{ marginLeft: 4 }}>{records.filter(r => r.status === 'pending').length}</span>}
                    </button>
                ))}
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr><th>申請人</th><th>請假日期</th><th>原因</th><th>申請時間</th><th>狀態</th><th>操作</th></tr></thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={6} rows={5} /> : filtered.length === 0
                            ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📬</div><div className="empty-state-text">無請假記錄</div></div></td></tr>
                            : filtered.sort((a, b) => b.requestTime?.localeCompare(a.requestTime || '')).map((r, i) => (
                                <tr key={i}>
                                    <td><span style={{ fontWeight: 600 }}>{r.name}</span><br /><span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.agcode}</span></td>
                                    <td>{r.leaveDate}</td>
                                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</td>
                                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{r.requestTime}</td>
                                    <td>{statusBadge(r.status)}</td>
                                    <td>
                                        {r.status === 'pending' && (
                                            <button className="btn btn-primary btn-sm" onClick={() => { setReviewing(r); setReviewer(''); setNotes(''); }}>
                                                審核
                                            </button>
                                        )}
                                        {r.status !== 'pending' && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.reviewer}</span>}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {reviewing && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setReviewing(null); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <span className="modal-title">審核請假申請</span>
                            <button className="modal-close" onClick={() => setReviewing(null)}>✕</button>
                        </div>
                        <div className="card-xs" style={{ background: 'var(--surface-input)', marginBottom: 16, borderRadius: 'var(--r-md)' }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{reviewing.name}（{reviewing.agcode}）</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>請假日期：{reviewing.leaveDate}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>原因：{reviewing.reason}</div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">操作者 AGCODE</label>
                            <input className="form-input" value={reviewer} onChange={e => setReviewer(e.target.value.toUpperCase())} placeholder="輸入您的業務代號" autoCapitalize="characters" autoFocus />
                        </div>
                        <div className="form-group">
                            <label className="form-label">備註（選填）</label>
                            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="審核備註" style={{ minHeight: 64 }} />
                        </div>
                        <div className="action-row">
                            <button className="btn btn-ghost" onClick={() => setReviewing(null)}>取消</button>
                            <button className="btn btn-danger" onClick={() => doReview('rejected')} disabled={saving || !reviewer}>
                                {saving ? <span className="spinner" /> : '❌'} 拒絕
                            </button>
                            <button className="btn btn-success" onClick={() => doReview('approved')} disabled={saving || !reviewer}>
                                {saving ? <span className="spinner" /> : '✅'} 核准
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Visit Report ──────────────────────────────────────────────────────────
function VisitSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterName, setFilterName] = useState('');
    const [filterStart, setFilterStart] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 6);
        return d.toISOString().split('T')[0];
    });
    const [filterEnd, setFilterEnd] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/visit?startDate=${filterStart}&endDate=${filterEnd}`, { headers: { 'x-admin-token': token } });
                if (res.ok) {
                    const data = await res.json();
                    setRecords(data.records || []);
                }
            } catch { }
            setLoading(false);
        })();
    }, [token, filterStart, filterEnd]);

    const filtered = records.filter(r => {
        const rDate = normalizeDate(r.date);
        const inDate = rDate >= filterStart && rDate <= filterEnd;
        const inName = !filterName || (r.name || '').includes(filterName) || r.agcode.includes(filterName.toUpperCase());
        return inDate && inName;
    });

    const exportCSV = () => {
        const rows = [['日期', '姓名', 'AGCODE', '時間', '事由', '客戶', '備註']];
        filtered.forEach(r => {
            const dt = formatDateTime(r.visitTime);
            rows.push([normalizeDate(r.date), r.name, r.agcode, `${dt.date} ${dt.time}`, r.purpose, r.clientName, r.notes])
        });
        const csv = rows.map(r => r.join(',')).join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `visits_${filterStart}_${filterEnd}.csv`;
        a.click();
    };

    const exportPDF = () => {
        const rows = filtered.map(r => {
            const dt = formatDateTime(r.visitTime);
            return [normalizeDate(r.date), r.name, r.agcode, dt.time, r.purpose, r.clientName, r.notes, (r.lat && r.lng) ? '有打卡座標' : '—'];
        });
        generatePDFReport(
            '業務拜訪紀錄報表',
            `${filterStart} 至 ${filterEnd}`,
            ['日期', '姓名', '代號', '拜訪時間', '事由', '客戶', '備註', '定位備註'],
            rows
        );
    };

    return (
        <div className="printable-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><h1 className="page-title">拜訪紀錄</h1><p className="page-subtitle">查詢與匯出拜訪資料</p></div>
                <div className="no-print" style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={exportPDF}>📄 匯出 PDF</button>
                    <button className="btn btn-ghost" onClick={exportCSV}>⬇ 匯出 CSV</button>
                </div>
            </div>

            <div className="filter-bar no-print">
                <div className="filter-group">
                    <div className="filter-label">開始日期</div>
                    <input type="date" className="form-input" value={filterStart} onChange={e => setFilterStart(e.target.value)} />
                </div>
                <div className="filter-group">
                    <div className="filter-label">結束日期</div>
                    <input type="date" className="form-input" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} />
                </div>
                <div className="filter-group">
                    <div className="filter-label">姓名 / AGCODE</div>
                    <input type="text" className="form-input" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="輸入搜尋" />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>共 {filtered.length} 筆</span>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr><th>日期</th><th>姓名</th><th>AGCODE</th><th>時間</th><th>位置</th><th>事由</th><th>客戶</th><th>備註</th></tr></thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={8} rows={5} /> : filtered.length === 0
                            ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">📍</div><div className="empty-state-text">無符合的紀錄</div></div></td></tr>
                            : filtered.sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date))).map((r, i) => {
                                const visitDt = formatDateTime(r.visitTime);
                                return (
                                    <tr key={i}>
                                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(r.date).date}</td>
                                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                                        <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{r.agcode}</code></td>
                                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{visitDt.time}</td>
                                        <td><AddressCell lat={r.lat} lng={r.lng} /></td>
                                        <td><span className="badge badge-primary">{r.purpose}</span></td>
                                        <td>{r.clientName}</td>
                                        <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.notes || '—'}</td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Required Days ─────────────────────────────────────────────────────────
function RequiredDaysSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<any[]>([]);
    const [selectedAgcodes, setSelectedAgcodes] = useState<string[]>([]);
    const [form, setForm] = useState({ dates: [] as string[], dateInput: '', lateThreshold: '09:00' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);

    const h = { 'x-admin-token': token, 'Content-Type': 'application/json' };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/required-days', { headers: { 'x-admin-token': token } });
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch { }
        setLoading(false);
    }, [token]);

    const loadMembers = useCallback(async () => {
        const res = await fetch('/api/admin/members', { headers: { 'x-admin-token': token } });
        if (res.ok) {
            const data = await res.json();
            setMembers(data.members || []);
        }
    }, [token]);

    useEffect(() => { load(); loadMembers(); }, [load, loadMembers]);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAgcodes.length === 0) return toast.error('請至少選擇一位人員（或標記為 ALL）');
        if (form.dates.length === 0) return toast.error('請至少選擇一個日期');
        setSaving(true);
        let successCount = 0;
        try {
            for (const agcode of selectedAgcodes) {
                for (const date of form.dates) {
                    const res = await fetch('/api/admin/required-days', {
                        method: 'POST',
                        headers: h,
                        body: JSON.stringify({ action: 'add', agcode, date, lateThreshold: form.lateThreshold })
                    });
                    if (res.ok) successCount++;
                }
            }
            if (successCount > 0) {
                toast.success(`已順利新增 ${successCount} 筆日期設定`);
                setSelectedAgcodes([]);
                setForm(f => ({ ...f, dates: [] }));
                load();
            }
        } catch {
            toast.error('伺服器錯誤');
        } finally { setSaving(false); }
    };

    const toggleAgcode = (code: string) => {
        if (code === 'ALL') {
            setSelectedAgcodes(['ALL']);
            return;
        }
        setSelectedAgcodes(prev => {
            const filtered = prev.filter(x => x !== 'ALL');
            return filtered.includes(code) ? filtered.filter(x => x !== code) : [...filtered, code];
        });
    };

    const del = async (r: any) => {
        confirmDialog('確定刪除？', async () => {
            await fetch('/api/admin/required-days', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', rowIndex: r.rowIndex }) });
            toast.success('已刪除設定');
            load();
        });
    };

    return (
        <div>
            <div className="page-header"><h1 className="page-title">必要出席日設定</h1><p className="page-subtitle">設定特定人員或全體的必要出席日</p></div>
            {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>{msg.ok ? '✅' : '⚠️'} {msg.txt}</div>}

            <div className="card" style={{ marginBottom: 24, padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 20 }}>
                    <div className="card-icon green"><IconPlus size={22} /></div>
                    <div><div className="card-title">批次新增必要出席日</div><div className="card-subtitle">選取多位同仁並指定日期與門檻</div></div>
                </div>

                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>人員選擇 (可複選)</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>已選：{selectedAgcodes.length} 位</span>
                    </label>
                    <div className="chip-list" style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--line)', padding: 12, borderRadius: 12, background: 'var(--gray-bg)' }}>
                        <button
                            type="button"
                            className={`chip ${selectedAgcodes.includes('ALL') ? 'selected' : ''}`}
                            onClick={() => toggleAgcode('ALL')}
                        >
                            🌍 全體人員 (ALL)
                        </button>
                        {members.map(m => (
                            <button
                                key={m.agcode}
                                type="button"
                                className={`chip ${selectedAgcodes.includes(m.agcode) ? 'selected' : ''}`}
                                onClick={() => toggleAgcode(m.agcode)}
                            >
                                {m.name} ({m.agcode})
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: 16, alignItems: 'flex-start', marginTop: 16 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">日期選擇</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ paddingLeft: 40 }}
                                    value={form.dateInput}
                                    onChange={e => {
                                        const d = e.target.value;
                                        setForm(f => {
                                            const newForm = { ...f, dateInput: '' };
                                            if (d && !f.dates.includes(d)) {
                                                newForm.dates = [...f.dates, d].sort();
                                            }
                                            return newForm;
                                        });
                                    }}
                                />
                                <div style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-secondary)' }}>
                                    <IconCalendar size={18} />
                                </div>
                            </div>
                            {form.dates.length > 0 && (
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                                    {form.dates.map(d => (
                                        <div key={d} style={{ background: 'var(--blue)', color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {d} <span onClick={() => setForm(f => ({ ...f, dates: f.dates.filter(x => x !== d) }))} style={{ cursor: 'pointer', padding: '0 2px', display: 'inline-flex' }}><IconX size={12} color="#fff" /></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">遲到判定門檻 (HH:mm)</label>
                            <input
                                type="time"
                                className="form-input"
                                value={form.lateThreshold}
                                onChange={e => setForm(f => ({ ...f, lateThreshold: e.target.value }))}
                            />
                        </div>
                        <div style={{ paddingBottom: 6 }}>
                            <button className="btn btn-primary" type="button" onClick={(e) => add(e as any)} style={{ height: 42, minWidth: 100 }} disabled={saving}>
                                {saving ? <span className="spinner" /> : '即刻新增'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr><th>AGCODE</th><th>日期</th><th>遲到時間</th><th>操作</th></tr></thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={4} rows={4} /> : records.length === 0
                            ? <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon"><IconCalendar size={28} /></div><div className="empty-state-text">尚無設定</div></div></td></tr>
                            : records.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((r, i) => (
                                <tr key={i}>
                                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.agcode}</code></td>
                                    <td>{r.date}</td>
                                    <td>{r.lateThreshold || '09:00'}</td>
                                    <td><button className="btn btn-danger btn-sm" onClick={() => del(r)}>刪除</button></td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Settings ─────────────────────────────────────────────────────────────
function SettingsSection({ token }: { token: string }) {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [initDone, setInitDone] = useState(false);

    const h = { 'x-admin-token': token, 'Content-Type': 'application/json' };

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/admin/settings', { headers: { 'x-admin-token': token } });
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data.settings || {});
                }
            } catch { }
            setLoading(false);
        })();
    }, [token]);

    const save = async (key: string, value: string) => {
        setSaving(key);
        try {
            const res = await fetch('/api/admin/settings', { method: 'POST', headers: h, body: JSON.stringify({ key, value }) });
            if (res.ok) {
                toast.success('設定已儲存');
                // Reload settings to confirm
                const r = await fetch('/api/admin/settings', { headers: { 'x-admin-token': token } });
                if (r.ok) {
                    const d = await r.json();
                    setSettings(d.settings || {});
                }
            } else {
                toast.error('儲存失敗');
            }
        } catch {
            toast.error('網路錯誤');
        }
        setSaving(null);
    };

    const initSheets = async () => {
        await fetch('/api/admin/init', { method: 'POST', headers: h });
        setInitDone(true);
    };

    const fetchCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('此瀏覽器不支援定位功能');
            return;
        }
        toast.info('定位中，請稍候⋯');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const latEl = document.getElementById('setting-checkin_lat') as HTMLInputElement;
                const lngEl = document.getElementById('setting-checkin_lng') as HTMLInputElement;
                if (latEl) latEl.value = pos.coords.latitude.toString();
                if (lngEl) lngEl.value = pos.coords.longitude.toString();
                toast.success('已獲取目前座標，請記得點擊儲存');
            },
            (err) => {
                toast.error('無法獲取座標，請確認瀏覽器擁有定位權限');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const fields = [
        { key: 'checkin_lat', label: '簽到中心緯度', placeholder: '例：25.0330' },
        { key: 'checkin_lng', label: '簽到中心經度', placeholder: '例：121.5654' },
        { key: 'checkin_radius', label: '簽到半徑（公尺）', placeholder: '例：200' },
        { key: 'system_base_url', label: '系統對外網址 (CRM/Cron)', placeholder: '例：https://myapp.vercel.app' },
    ];

    return (
        <div>
            <div className="page-header"><h1 className="page-title">系統設定</h1><p className="page-subtitle">設定簽到位置範圍等系統參數</p></div>
            {loading ? <LoadingState /> :
                <>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="card-icon blue"><IconMapPin size={22} /></div>
                                <div><div className="card-title">簽到位置設定</div><div className="card-subtitle">設定公司辦公室的 GPS 位置與範圍</div></div>
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={fetchCurrentLocation}>
                                <IconMapPin size={16} /> 獲取目前座標
                            </button>
                        </div>
                        {fields.map(f => (
                            <div className="form-group" key={f.key}>
                                <label className="form-label">{f.label}</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="form-input"
                                        defaultValue={settings[f.key] || ''}
                                        placeholder={f.placeholder}
                                        id={`setting-${f.key}`}
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => {
                                            const el = document.getElementById(`setting-${f.key}`) as HTMLInputElement;
                                            save(f.key, el.value);
                                        }}
                                        disabled={saving === f.key}
                                    >
                                        {saving === f.key ? <span className="spinner" /> : '儲存'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="card-icon orange"><IconDatabase size={22} /></div>
                            <div><div className="card-title">Google Sheets 初始化</div><div className="card-subtitle">首次使用時，自動建立所有需要的工作表</div></div>
                        </div>
                        <button className="btn btn-primary" onClick={initSheets}>
                            {initDone ? '✅ 初始化完成' : '🗂️ 初始化 Google Sheets'}
                        </button>
                    </div>
                </>
            }
        </div>
    );
}

// ─── TG Settings ────────────────────────────────────────────────────────────
const ALL_NOTIF_TYPES = [
    { key: 'new_checkin', label: '新簽到通知' },
    { key: 'new_leave_request', label: '新請假申請通知' },
    { key: 'leave_result', label: '請假結果通知' },
    { key: 'weekly_attendance_all', label: '每週出席統計（全體）' },
    { key: 'weekly_attendance_personal', label: '每週出席統計（個人）' },
    { key: 'new_visit', label: '新拜訪紀錄通知' },
    { key: 'weekly_visit_all', label: '每週拜訪統計（全體）' },
    { key: 'weekly_visit_personal', label: '每週拜訪統計（個人）' },
];

function TGSettingsSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editRec, setEditRec] = useState<any>(null);
    const [form, setForm] = useState({ agcode: '', chatId: '', notificationTypes: [] as string[], role: 'ag' });
    const [saving, setSaving] = useState(false);

    const h = { 'x-admin-token': token, 'Content-Type': 'application/json' };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/tg-settings', { headers: { 'x-admin-token': token } });
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch { }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditRec(null);
        setForm({ agcode: '', chatId: '', notificationTypes: [], role: 'ag' });
        setShowModal(true);
    };

    const openEdit = (r: any) => {
        setEditRec(r);
        setForm({
            agcode: r.agcode, chatId: r.chatId, role: r.role,
            notificationTypes: r.notificationTypes ? r.notificationTypes.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        });
        setShowModal(true);
    };

    const toggleType = (t: string) => {
        setForm(f => ({
            ...f,
            notificationTypes: f.notificationTypes.includes(t)
                ? f.notificationTypes.filter(x => x !== t)
                : [...f.notificationTypes, t],
        }));
    };

    const save = async () => {
        setSaving(true);
        const body = editRec
            ? { action: 'edit', ...form, notificationTypes: form.notificationTypes.join(','), rowIndex: editRec.rowIndex }
            : { action: 'add', ...form, notificationTypes: form.notificationTypes.join(',') };
        const res = await fetch('/api/admin/tg-settings', { method: 'POST', headers: h, body: JSON.stringify(body) });
        if (res.ok) { setShowModal(false); load(); }
        setSaving(false);
    };

    const del = async (r: any) => {
        confirmDialog('確定刪除規則？', async () => {
            await fetch('/api/admin/tg-settings', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', rowIndex: r.rowIndex }) });
            toast.success('已刪除規則');
            load();
        });
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><h1 className="page-title">TG 通知設定</h1><p className="page-subtitle">設定每位人員的 Telegram 通知項目</p></div>
                <button className="btn btn-primary" onClick={openAdd}>＋ 新增設定</button>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead><tr><th>AGCODE</th><th>Chat ID</th><th>角色</th><th>通知項目數</th><th>操作</th></tr></thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={5} rows={5} /> : records.length === 0
                            ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon"><IconMessageSquare size={28} /></div><div className="empty-state-text">尚無通知設定</div></div></td></tr>
                            : records.map((r, i) => (
                                <tr key={i}>
                                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.agcode}</code></td>
                                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{r.chatId}</code></td>
                                    <td><span className="badge badge-blue">{r.role}</span></td>
                                    <td>{r.notificationTypes ? r.notificationTypes.split(',').filter(Boolean).length : 0} 項</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>編輯</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(r)}>刪除</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal" style={{ maxWidth: 540 }}>
                        <div className="modal-header">
                            <span className="modal-title">{editRec ? '編輯' : '新增'} TG 通知設定</span>
                            <button className="modal-close" onClick={() => setShowModal(false)}><IconX size={16} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">AGCODE</label>
                                <input className="form-input" value={form.agcode} onChange={e => setForm(f => ({ ...f, agcode: e.target.value.toUpperCase() }))} disabled={!!editRec} autoCapitalize="characters" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">角色</label>
                                <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                                    <option value="unit_manager">單位主管</option>
                                    <option value="manager">主管</option>
                                    <option value="ag">AG</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Telegram Chat ID</label>
                            <input className="form-input" value={form.chatId} onChange={e => setForm(f => ({ ...f, chatId: e.target.value }))} placeholder="例：-1001234567890" />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ marginBottom: 10 }}>訂閱通知項目</label>
                            <div className="chip-list">
                                {ALL_NOTIF_TYPES.map(t => (
                                    <button key={t.key} className={`chip ${form.notificationTypes.includes(t.key) ? 'selected' : ''}`} onClick={() => toggleType(t.key)} type="button">
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="action-row">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving || !form.agcode || !form.chatId}>
                                {saving ? <span className="spinner" /> : null}
                                {saving ? '儲存中⋯' : '儲存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Reports & Notifications ────────────────────────────────────────────────
function ReportsSection({ token }: { token: string }) {
    const [msg, setMsg] = useState('');
    const [running, setRunning] = useState(false);
    const [sending, setSending] = useState(false);

    const runReport = async (type: 'weekly' | 'monthly' | 'daily') => {
        const labels = { weekly: '每週', monthly: '每月', daily: '每日' };
        if (!confirm(`確定要現在生成並發送${labels[type]}報表嗎？這會發送通知給所有相關同仁。`)) return;
        setRunning(true);
        try {
            const res = await fetch('/api/admin/report', { 
                method: 'POST', 
                headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ type })
            });
            if (res.ok) toast.success(`${labels[type]}報表已成功發送`);
            else toast.error('發送失敗');
        } catch { toast.error('網路錯誤'); }
        setRunning(false);
    };

    const sendManual = async () => {
        if (!msg) return;
        setSending(true);
        try {
            const res = await fetch('/api/admin/notify-manual', { 
                method: 'POST', 
                headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            if (res.ok) {
                toast.success('訊息已發送');
                setMsg('');
            } else toast.error('發送失敗');
        } catch { toast.error('網路錯誤'); }
        setSending(false);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">通知與報表</h1>
                <p className="page-subtitle">手動發送 Telegram 通知或生成統計報表</p>
            </div>

            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div>
                        <div className="card-title">統計報表生成</div>
                        <div className="card-subtitle">手動觸發各項出勤與拜訪統計通知</div>
                    </div>
                </div>
                <div style={{ padding: '0 0 16px 0' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                        點擊下方按鈕將立即計算對應時間區間的數據，發送至同仁的 Telegram 並寫入系統通知。
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <button className="btn btn-primary" onClick={() => runReport('daily')} disabled={running}>
                            {running ? <span className="spinner" /> : <IconClock size={16} />}
                            每日拜訪統計
                        </button>
                        <button className="btn btn-primary" onClick={() => runReport('weekly')} disabled={running}>
                            {running ? <span className="spinner" /> : <IconDatabase size={16} />}
                            每週出席統計
                        </button>
                        <button className="btn btn-primary" onClick={() => runReport('monthly')} disabled={running}>
                            {running ? <span className="spinner" /> : <IconCalendar size={16} />}
                            每月出席統計
                        </button>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">手動通告發送</div>
                        <div className="card-subtitle">向所有已綁定 Telegram 的同仁發送自訂訊息</div>
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">訊息內容 (支援 HTML 標籤)</label>
                    <textarea 
                        className="form-input" 
                        style={{ minHeight: 120, paddingTop: 12, lineHeight: 1.5 }}
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                        placeholder="請輸入欲發送的訊息內容..."
                    />
                </div>
                <div className="action-row">
                    <button className="btn btn-primary" onClick={sendManual} disabled={sending || !msg}>
                        {sending ? <span className="spinner" /> : <IconSend size={16} />}
                        {sending ? '發送中⋯' : '立即全體廣播'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Personnel Section (Merged & Enhanced) ───────────────────────────────
function PersonnelSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    
    // HR Entry QR Modal States
    const [showHrQr, setShowHrQr] = useState(false);
    const [hrSid, setHrSid] = useState('');
    const [hrStatus, setHrStatus] = useState<'IDLE' | 'GENERATING' | 'POLLING' | 'SUCCESS'>('IDLE');
    const [targetHrProfile, setTargetHrProfile] = useState<any>(null);

    const load = async () => {
        setLoading(true);
        try {
            const h = { 'x-admin-token': token };
            const [pr, mr] = await Promise.all([
                fetch('/api/admin/profiles', { headers: h }).then(res => res.json()),
                fetch('/api/admin/members', { headers: h }).then(res => res.json())
            ]);
            if (pr.records) setRecords(pr.records);
            if (mr.members) setMembers(mr.members);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    // HR validation happens natively when navigating or submitting via PIN.
    const generateHrQr = async (p: any) => {
        setTargetHrProfile(p);
        setHrSid(p.agcode); // Employee's agcode is naturally a 6-digit PIN.
        setShowHrQr(true);
    };

    const handleSaveMember = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/members', {
                method: 'POST',
                headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: editForm.rowIndex ? 'update' : 'add', ...editForm })
            });
            if (res.ok) {
                toast.success('儲存成功');
                setShowEditModal(false);
                load();
            } else { toast.error('儲存失敗'); }
        } catch { toast.error('網路錯誤'); }
        setSaving(false);
    };

    const handleDeleteMember = (r: any) => {
        confirmDialog(`確定刪除 ${r.name} (${r.agcode}) 嗎？`, async () => {
            await fetch('/api/admin/members', {
                method: 'POST',
                headers: { 'x-admin-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', rowIndex: r.rowIndex })
            });
            toast.success('已刪除');
            load();
        });
    };

    const filtered = members.filter(m => 
        (m.name || '').includes(search) || 
        (m.agcode || '').toUpperCase().includes(search.toUpperCase())
    );

    const getProfile = (agcode: string) => records.find(p => p.agcode === agcode);

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                    <h1 className="page-title">人員維護與資料庫</h1>
                    <p className="page-subtitle">管理所有業務同仁基本資料、HR 詳細履歷及權限設定</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={load} disabled={loading}>
                        {loading ? <span className="spinner" /> : <IconRefreshCw size={14} />} 重新整理
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditForm({ agcode: '', name: '', rank: 'AG', group: '', supervisor: '', isAdmin: false }); setShowEditModal(true); }}>
                        ＋ 新增人員
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20, padding: 16, flexShrink: 0 }}>
                <div className="form-group" style={{ maxWidth: 400, marginBottom: 0 }}>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="搜尋姓名、代號..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr>
                            <th>狀態</th>
                            <th>業務代號</th>
                            <th>姓名</th>
                            <th>組別 / 主管</th>
                            <th>管理員</th>
                            <th>HR 詳細資料</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><LoadingState label="讀取資料中..." /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>查無相符資料</td></tr>
                        ) : filtered.map((r, i) => {
                            const profile = getProfile(r.agcode);
                            const isAdmin = r.isAdmin;
                            return (
                                <tr key={r.agcode || i}>
                                    <td>
                                        <span className={`badge ${r.rank === '準增員' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.75rem' }}>
                                            {r.rank}
                                        </span>
                                    </td>
                                    <td><code style={{ background: '#F2F2F7', padding: '2px 4px', borderRadius: 4 }}>{r.agcode}</code></td>
                                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{r.group || '—'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#8E8E93' }}>{r.supervisor || '—'}</div>
                                    </td>
                                    <td>
                                        {isAdmin ? <IconShield color="var(--blue)" size={18} /> : <span style={{ color: '#ccc' }}>—</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {profile ? (
                                                <button className="btn btn-ghost btn-sm" style={{ gap: 4 }} onClick={() => setSelectedProfile(profile)}>
                                                    <IconEye size={14} /> 查詳細履歷
                                                </button>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#8E8E93', minWidth: 80, textAlign: 'center' }}>未填寫</span>
                                            )}
                                            <button className="btn btn-ghost btn-sm" style={{ gap: 4, color: 'var(--blue)' }} 
                                                onClick={() => generateHrQr(r)}>
                                                <IconUserEdit size={14} /> 基本資料異動
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditForm({ ...r, isAdmin }); setShowEditModal(true); }}>編輯</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteMember(r)}>刪除</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editForm.rowIndex ? '編輯人員' : '新增人員'}</span>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}><IconX size={16} /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">業務代號</label>
                                <input className="form-input" value={editForm.agcode} onChange={e => setEditForm({ ...editForm, agcode: e.target.value.toUpperCase() })} placeholder="AGCODE" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">姓名</label>
                                <input className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="姓名" />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">職級</label>
                                <input className="form-input" value={editForm.rank} onChange={e => setEditForm({ ...editForm, rank: e.target.value })} placeholder="AG / ASA / UM..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">組別</label>
                                <input className="form-input" value={editForm.group} onChange={e => setEditForm({ ...editForm, group: e.target.value })} placeholder="組別名稱" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">主管 (AGCODE+名稱)</label>
                            <input className="form-input" value={editForm.supervisor} onChange={e => setEditForm({ ...editForm, supervisor: e.target.value })} placeholder="例：200173798盛傑UM" />
                        </div>
                        <div className="form-group" style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            padding: '14px 18px', background: 'var(--surface-card)', 
                            border: '1px solid var(--line)', borderRadius: 16, marginBottom: 20,
                            cursor: 'pointer'
                        }} onClick={() => setEditForm({ ...editForm, isAdmin: !editForm.isAdmin })}>
                            <label style={{ fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                                賦予管理員權限 (可用 QR Code 登入後台)
                            </label>
                            <div 
                                className={`ios-toggle ${editForm.isAdmin ? 'active' : ''}`}
                                style={{
                                    width: 48, height: 26, borderRadius: 13, 
                                    background: editForm.isAdmin ? 'var(--blue)' : '#E9E9EB',
                                    position: 'relative', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: editForm.isAdmin ? '0 4px 10px rgba(0,122,255,0.2)' : 'none'
                                }}
                            >
                                <div style={{
                                    position: 'absolute', top: 2, left: editForm.isAdmin ? 24 : 2,
                                    width: 22, height: 22, borderRadius: 11, background: 'white',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                }} />
                            </div>
                        </div>
                        <div className="action-row">
                            <button className="btn btn-ghost" onClick={() => setShowEditModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleSaveMember} disabled={saving || !editForm.agcode || !editForm.name}>
                                {saving ? <span className="spinner" /> : null}
                                {saving ? '儲存中⋯' : '確定位人員儲存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen HR Profile Detail */}
            {selectedProfile && (
                <div className="fullscreen-overlay">
                    <div className="fullscreen-header">
                        <div className="fs-title-group">
                            <IconEye size={24} color="var(--blue)" />
                            <div>
                                <h2>{selectedProfile.name} 的詳細履歷</h2>
                                <p>{selectedProfile.agcode} | {selectedProfile.idcard}</p>
                            </div>
                        </div>
                        <button className="fs-close" onClick={() => setSelectedProfile(null)}><IconX size={24} /></button>
                    </div>
                    <div className="fullscreen-body">
                        <div className="profile-detail-grid">
                            <DetailCard title="基本身分" icon={<IconUsers size={20} />}>
                                <DetailItem label="姓名" value={selectedProfile.name} />
                                <DetailItem label="身分證" value={selectedProfile.idcard} />
                                <DetailItem label="出生日期" value={selectedProfile.birthday} />
                                <DetailItem label="性別" value={selectedProfile.gender} />
                            </DetailCard>
                            <DetailCard title="聯繫資訊" icon={<IconMessageSquare size={20} />}>
                                <DetailItem label="手機" value={selectedProfile.phone} />
                                <DetailItem label="Email" value={selectedProfile.email} />
                                <DetailItem label="通訊地址" value={selectedProfile.addressContact} full />
                                <DetailItem label="戶籍地址" value={selectedProfile.addressResident} full />
                            </DetailCard>
                            <DetailCard title="緊急聯絡" icon={<IconAlertTriangle size={20} />}>
                                <DetailItem label="姓名" value={selectedProfile.emgName} />
                                <DetailItem label="關係" value={selectedProfile.emgRelation} />
                                <DetailItem label="電話" value={selectedProfile.emgPhone} full />
                            </DetailCard>
                            <DetailCard title="教育背景" icon={<IconDatabase size={20} />}>
                                <DetailItem label="學歷" value={selectedProfile.eduLevel} />
                                <DetailItem label="校名" value={selectedProfile.eduSchool} />
                                <DetailItem label="前產業" value={selectedProfile.prevIndustry} />
                                <DetailItem label="前職務" value={selectedProfile.prevJob} />
                            </DetailCard>
                            <DetailCard title="系統預設" icon={<IconSettings size={20} />}>
                                <DetailItem label="職級" value={selectedProfile.rank} />
                                <DetailItem label="組別" value={selectedProfile.groupName} />
                                <DetailItem label="主管代號" value={selectedProfile.supervisorAgcode} />
                                <DetailItem label="主管姓名" value={selectedProfile.supervisorName} />
                            </DetailCard>
                            <DetailCard title="證照持有" icon={<IconCheck size={20} />}>
                                <DetailItem label="壽險" value={selectedProfile.certLife ? '✔️ 已取得' : '❌ 未登錄'} />
                                <DetailItem label="道德" value={selectedProfile.certEthics ? '✔️ 已取得' : '❌ 未登錄'} />
                                <DetailItem label="產險" value={selectedProfile.certProperty ? '✔️ 已取得' : '❌ 未登錄'} />
                                <DetailItem label="外幣" value={selectedProfile.certForeign ? '✔️ 已取得' : '❌ 未登錄'} />
                                <DetailItem label="投資型" value={selectedProfile.certInvestment ? '✔️ 已取得' : '❌ 未登錄'} />
                            </DetailCard>
                        </div>
                    </div>

                    <style>{`
                        .fullscreen-overlay { 
                            position: fixed; inset: 0; background: #F2F2F7; z-index: 1000; 
                            display: flex; flex-direction: column; animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        }
                        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                        .fullscreen-header { 
                            padding: 16px 24px; background: white; border-bottom: 1px solid #D1D1D6; 
                            display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); position: relative;
                        }
                        .fs-title-group { display: flex; align-items: center; gap: 14px; }
                        .fs-title-group h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1C1C1E; }
                        .fs-title-group p { margin: 3px 0 0; color: #8E8E93; font-size: 0.85rem; }
                        .fs-close { background: #E5E5EA; border: none; width: 36px; height: 36px; border-radius: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                        .fullscreen-body { flex: 1; overflow-y: auto; padding: 28px 32px; }
                        .profile-detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; max-width: 1200px; margin: 0 auto; }
                    `}</style>
                </div>
            )}

            {/* HR QR Entry Modal */}
            {showHrQr && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: 440, padding: 0, overflow: 'hidden' }}>
                        <div style={{ background: 'var(--blue)', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', width: 64, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <IconShieldCheck size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>基本資料異動</h2>
                            <p style={{ opacity: 0.9, fontSize: '0.9rem', marginTop: 8 }}>請使用手機掃描以開啟 HR 資料異動介面</p>
                        </div>
                        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                                {/* 1. 原生相機跳轉專用 */}
                                <div style={{ 
                                    background: '#fff', padding: 16, borderRadius: 20, 
                                    border: '1px solid var(--line)', 
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
                                }}>
                                    <QRCodeSVG value="https://punch-in-8h24.vercel.app/hr" size={140} />
                                    <div style={{ fontSize: '0.85rem', color: '#1d1d1f', fontWeight: 700, marginTop: 12 }}>系統跳轉</div>
                                    <div style={{ fontSize: '0.75rem', color: '#86868b', marginTop: 4 }}>掃描開啟網頁</div>
                                </div>
                                {/* 2. HR 內部掃描器專用純代碼 */}
                                <div style={{ 
                                    background: '#fff', padding: 16, borderRadius: 20, 
                                    border: '1px solid var(--line)', 
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
                                }}>
                                    <QRCodeSVG value={hrSid} size={140} />
                                    <div style={{ fontSize: '0.85rem', color: '#1d1d1f', fontWeight: 700, marginTop: 12 }}>HR 專用掃描</div>
                                    <div style={{ fontSize: '0.75rem', color: '#86868b', marginTop: 4 }}>(純人事代碼)</div>
                                </div>
                            </div>
                            
                            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: 6, color: '#1d1d1f', background: '#f2f2f7', padding: '16px 0', borderRadius: 16, marginBottom: 24 }}>
                                {hrSid}
                            </div>
                            <button className="btn btn-ghost btn-full" onClick={() => { setShowHrQr(false); setHrSid(''); setHrStatus('IDLE'); }}>
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DetailCard({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="card" style={{ padding: 24, height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--blue)', borderBottom: '1px solid #F2F2F7', paddingBottom: 12 }}>
                {icon}
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                {children}
            </div>
        </div>
    );
}

function DetailItem({ label, value, full }: { label: string, value: any, full?: boolean }) {
    return (
        <div style={{ gridColumn: full ? 'span 2' : 'span 1' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8E8E93', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1rem', color: '#1C1C1E', fontWeight: 500 }}>{value || '—'}</div>
        </div>
    );
}


// ─── Main Admin Page ───────────────────────────────────────────────────────
export default function AdminPage() {
    const { token, authed, checking, login, logout } = useAdminAuth();
    const [section, setSection] = useState<AdminSection>('overview');

    if (checking) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)' }}>
                <div className="spinner spinner-dark" style={{ width: 32, height: 32, borderWidth: 3 }} />
            </div>
        );
    }

    if (!authed) return <LoginScreen onLogin={login} />;

    const contentMap: Record<AdminSection, React.ReactNode> = {
        overview: <OverviewSection token={token} />,
        members: <PersonnelSection token={token} />,
        attendance: <AttendanceSection token={token} />,
        leave: <LeaveSection token={token} />,
        visit: <VisitSection token={token} />,
        'required-days': <RequiredDaysSection token={token} />,
        settings: <SettingsSection token={token} />,
        'tg-settings': <TGSettingsSection token={token} />,
        reports: <ReportsSection token={token} />,
    } as any;

    return (
        <div className="admin-layout">
            <Sidebar section={section} setSection={setSection} onLogout={logout} />
            <div className="admin-content">
                {contentMap[section]}
            </div>
        </div>
    );
}
