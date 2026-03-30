'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    IconGrid, IconUsers, IconClipboard, IconMapPin, IconInbox,
    IconCalendar, IconSettings, IconMessageSquare, IconLogo,
    IconShield, IconLock, IconPlus, IconX, IconEdit, IconTrash,
    IconLogOut, IconDownload, IconAlertTriangle, IconCheck, IconDatabase,
    IconCheckCircle, IconSend, IconClock, IconRefreshCw, IconRun,
    LoadingState, SkeletonRows,
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
    if (str.includes(' ')) return str.split(' ')[0];
    return str;
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
    | 'profiles';

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

// ─── Login Screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (pw: string) => Promise<boolean> }) {
    const [pw, setPw] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const ok = await onLogin(pw);
        if (!ok) toast.error('密碼錯誤，請再試一次');
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-box">
                <div className="login-icon-wrap"><IconLock size={32} /></div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>後台管理</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32 }}>請輸入管理員密碼以繼續</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ textAlign: 'left' }}>
                        <label className="form-label">管理員密碼</label>
                        <input
                            type="password"
                            className="form-input"
                            value={pw}
                            onChange={e => setPw(e.target.value)}
                            placeholder="••••••••"
                            autoFocus
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? <span className="spinner" /> : null}
                        {loading ? '驗證中⋯' : '登入系統'}
                    </button>
                    <div style={{ marginTop: 24 }}>
                        <a href="/" className="btn-text" style={{ fontSize: '0.85rem' }}>← 返回打卡首頁</a>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────
const navItems: { key: AdminSection; icon: React.ReactNode; label: string; section: string }[] = [
    { key: 'overview', icon: <IconGrid size={16} />, label: '總覽', section: '主選單' },
    { key: 'members', icon: <IconUsers size={16} />, label: '人員維護', section: '主選單' },
    { key: 'profiles', icon: <IconRun size={16} />, label: '基本資料庫 (HR)', section: '主選單' },
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
                <button className="btn btn-primary" onClick={downloadMonthlySummary}>📅 匯出本月出勤月報表</button>
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

// ─── Members ───────────────────────────────────────────────────────────────
function MembersSection({ token }: { token: string }) {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editMember, setEditMember] = useState<any>(null);
    const [form, setForm] = useState({ agcode: '', name: '', rank: 'AG', group: '', supervisor: '' });
    const [saving, setSaving] = useState(false);

    const h = { 'x-admin-token': token, 'Content-Type': 'application/json' };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/members', { headers: { 'x-admin-token': token } });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            }
        } catch { }
        setLoading(false);
    }, [token]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditMember(null);
        setForm({ agcode: '', name: '', rank: 'AG', group: '', supervisor: '' });
        setShowModal(true);
    };

    const openEdit = (m: any) => {
        setEditMember(m);
        setForm({ agcode: m.agcode, name: m.name, rank: m.rank, group: m.group, supervisor: m.supervisor });
        setShowModal(true);
    };

    const save = async () => {
        setSaving(true);
        try {
            const body = editMember
                ? { action: 'edit', ...form, rowIndex: editMember.rowIndex, createdAt: editMember.createdAt }
                : { action: 'add', ...form };
            const res = await fetch('/api/admin/members', { method: 'POST', headers: h, body: JSON.stringify(body) });
            if (res.ok) { toast.success(`${editMember ? '更新' : '新增'}成功`); setShowModal(false); load(); }
            else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || '儲存失敗');
            }
        } catch {
            toast.error('連線或伺服器錯誤');
        } finally { setSaving(false); }
    };

    const del = async (m: any) => {
        confirmDialog(`確定要刪除 ${m.name}（${m.agcode}）？`, async () => {
            const res = await fetch('/api/admin/members', { method: 'POST', headers: h, body: JSON.stringify({ action: 'delete', rowIndex: m.rowIndex }) });
            if (res.ok) { toast.success('已刪除'); load(); }
        });
    };

    const rankBadge = (r: string) => {
        const map: Record<string, string> = { UM: 'badge-primary', SAS: 'badge-primary', ASA: 'badge-gray', AG: 'badge-gray' };
        return <span className={`badge ${map[r] || 'badge-gray'}`}>{r}</span>;
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">人員維護</h1>
                    <p className="page-subtitle">管理業務人員基本資料</p>
                </div>
                <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconPlus size={16} /> 新增人員</button>
            </div>



            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>AGCODE</th><th>姓名</th><th>職級</th><th>組別</th><th>主管</th><th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <SkeletonRows cols={6} rows={4} /> : members.length === 0
                            ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-text">尚無人員資料</div></div></td></tr>
                            : members.map((m, i) => (
                                <tr key={m.agcode || `empty-${i}`}>
                                    <td><code style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-input)', padding: '2px 7px', borderRadius: 5, fontSize: '0.85rem' }}>{m.agcode || '未設定'}</code></td>
                                    <td style={{ fontWeight: 600 }}>{m.name || '空行'}</td>
                                    <td>{rankBadge(m.rank)}</td>
                                    <td>{m.group || '—'}</td>
                                    <td>{m.supervisor || '—'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconEdit size={14} /> 編輯</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => del(m)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconTrash size={14} /> 刪除</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <span className="modal-title">{editMember ? '編輯人員' : '新增人員'}</span>
                            <button className="modal-close" onClick={() => setShowModal(false)}><IconX size={16} /></button>
                        </div>
                        <div className="form-group">
                            <label className="form-label">AGCODE</label>
                            <input className="form-input" value={form.agcode} onChange={e => setForm(f => ({ ...f, agcode: e.target.value.toUpperCase() }))} placeholder="業務代號" disabled={!!editMember} autoCapitalize="characters" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">姓名</label>
                            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="真實姓名" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">職級</label>
                            <select className="form-select" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}>
                                <option value="UM">UM</option>
                                <option value="SAS">SAS</option>
                                <option value="ASA">ASA</option>
                                <option value="AG">AG</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">組別</label>
                            <input className="form-input" value={form.group} onChange={e => setForm(f => ({ ...f, group: e.target.value }))} placeholder="所屬組別" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">主管姓名</label>
                            <input className="form-input" value={form.supervisor} onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))} placeholder="直屬主管" />
                        </div>
                        <div className="action-row">
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={save} disabled={saving || !form.agcode || !form.name}>
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

// ─── Attendance Report ─────────────────────────────────────────────────────
function AttendanceSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
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
                const res = await fetch(`/api/checkin?startDate=${filterStart}&endDate=${filterEnd}`, { headers: { 'x-admin-token': token } });
                if (res.ok) {
                    const data = await res.json();
                    setRecords(data.records || []);
                } else {
                    console.error('Failed to load checkin, status:', res.status);
                }
            } catch (err) {
                console.error(err);
            }
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
        const rows = [['日期', '姓名', 'AGCODE', '簽到時間', '類型', 'IP', '緯度', '經度']];
        filtered.forEach(r => {
            const dt = formatDateTime(r.checkinTime);
            const isField = r.type === 'field' || String(r.isFieldWork).toLowerCase() === 'true';
            rows.push([normalizeDate(r.date), r.name, r.agcode, `${dt.date} ${dt.time}`, isField ? '外勤' : '一般', r.ip, r.lat || '', r.lng || '']);
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
            '員工出席紀錄報表',
            `${filterStart} 至 ${filterEnd}`,
            ['日期', '姓名', '代號', '打卡時間', '類型', 'GPS 座標', '來源 IP'],
            rows
        );
    };

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
                        {loading ? <SkeletonRows cols={7} rows={5} /> : filtered.length === 0
                            ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">無符合的紀錄</div></div></td></tr>
                            : filtered.sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date))).map((r, i) => {
                                const checkinDt = formatDateTime(r.checkinTime);
                                const isField = r.type === 'field' || String(r.isFieldWork).toLowerCase() === 'true';
                                return (
                                    <tr key={i}>
                                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(r.date).date}</td>
                                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                                        <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{r.agcode}</code></td>
                                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{checkinDt.time}</td>
                                        <td>{isField ? <span className="badge badge-yellow">外勤</span> : <span className="badge badge-green">一般</span>}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <AddressCell lat={r.lat} lng={r.lng} />
                                        </td>
                                        <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.ip}</span></td>
                                    </tr>
                                );
                            })}
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
                    <div className="card-icon green">➕</div>
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
                            ? <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon">📅</div><div className="empty-state-text">尚無設定</div></div></td></tr>
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
    ];

    return (
        <div>
            <div className="page-header"><h1 className="page-title">系統設定</h1><p className="page-subtitle">設定簽到位置範圍等系統參數</p></div>
            {loading ? <LoadingState /> :
                <>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <div className="card-icon blue">📍</div>
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
                            <div className="card-icon orange">🗂️</div>
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
                    <div className="card-icon blue">📊</div>
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
                    <div className="card-icon orange">💬</div>
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

// ─── Profiles Section ───────────────────────────────────────────────────────
function ProfilesSection({ token }: { token: string }) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const h = { 'x-admin-token': token };
            const r = await fetch('/api/admin/profiles', { headers: h }).then(res => res.json());
            if (r.records) setRecords(r.records);
        } catch {
            // Ignored
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const filtered = records.filter(r => 
        (r.name || '').includes(search) || 
        (r.agcode || '').toUpperCase().includes(search.toUpperCase()) ||
        (r.idcard || '').toUpperCase().includes(search.toUpperCase())
    );

    return (
        <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div>
                    <h1 className="page-title">轄屬人員基本資料維護</h1>
                    <p className="page-subtitle">維護準增員與業務員的詳細履歷、證照及通訊資訊</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={load} disabled={loading}>
                        {loading ? <span className="spinner" /> : <IconRefreshCw size={14} />} 重新整理
                    </button>
                    <a href="/hr" target="_blank" rel="noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                        開啟 HR 異動申請系統 →
                    </a>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20, padding: 16, flexShrink: 0 }}>
                <div className="form-group" style={{ maxWidth: 400, marginBottom: 0 }}>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="搜尋姓名、代號或身分證..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
                <table>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr>
                            <th>職級狀態</th>
                            <th>業務代號</th>
                            <th>姓名</th>
                            <th>身分證</th>
                            <th>手機號碼</th>
                            <th>組別</th>
                            <th>壽險證照</th>
                            <th>更新時間</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}><LoadingState label="讀取人員資料中..." /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#8E8E93' }}>查無相符的人員資料</td></tr>
                        ) : filtered.map((r, i) => (
                            <tr key={r.id || i}>
                                <td>
                                    <span className={`badge ${r.rank === '準增員' ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: '0.75rem' }}>
                                        {r.rank}
                                    </span>
                                </td>
                                <td><code style={{ background: '#F2F2F7', padding: '2px 4px', borderRadius: 4 }}>{r.agcode}</code></td>
                                <td style={{ fontWeight: 600 }}>{r.name}</td>
                                <td>{r.idcard}</td>
                                <td>{r.phone}</td>
                                <td>{r.groupName}</td>
                                <td>{r.certLife ? '已取得' : '未登錄'}</td>
                                <td style={{ fontSize: '0.8rem', color: '#8E8E93' }}>{r.updatedAt || r.createdAt}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
        members: <MembersSection token={token} />,
        attendance: <AttendanceSection token={token} />,
        leave: <LeaveSection token={token} />,
        visit: <VisitSection token={token} />,
        'required-days': <RequiredDaysSection token={token} />,
        settings: <SettingsSection token={token} />,
        'tg-settings': <TGSettingsSection token={token} />,
        reports: <ReportsSection token={token} />,
        profiles: <ProfilesSection token={token} />,
    };

    return (
        <div className="admin-layout">
            <Sidebar section={section} setSection={setSection} onLogout={logout} />
            <div className="admin-content">
                {contentMap[section]}
            </div>
        </div>
    );
}
