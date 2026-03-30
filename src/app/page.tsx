'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconCheckCircle, IconRun, IconInbox, IconMapPin, IconSearch,
  IconLogo, IconChevronRight, IconAlertTriangle, IconClock, IconLogOut, IconBell, IconX, IconGrid
} from '@/components/Icons';
import { toast, confirmDialog, showAnimation } from '@/components/GlobalUI';

type Tab = 'checkin' | 'field' | 'leave' | 'visit' | 'query';


interface Member {
  agcode: string;
  name: string;
  rank: string;
  group: string;
  supervisor: string;
}

interface NotificationRecord {
  id: string;
  agcode: string;
  type: string;
  title: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  rowIndex: number;
}

// ─── Shared: AGCODE Lookup ─────────────────────────────────────────────────
function AgcodeLookup({
  onFound,
  loading,
  setLoading,
}: {
  onFound: (m: Member) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const [agcode, setAgcode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agcode.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/member?agcode=${agcode.trim().toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || '查詢失敗'); return; }
      onFound(data.member);
    } catch {
      toast.error('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">業務代號 AGCODE</label>
        <input
          className="form-input"
          value={agcode}
          onChange={e => setAgcode(e.target.value.toUpperCase())}
          placeholder="請輸入業務代號"
          autoFocus
          autoCapitalize="characters"
          disabled={loading}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
        {loading ? <span className="spinner" /> : null}
        {loading ? '查詢中⋯' : '身份確認'}
      </button>
    </form>
  );
}

// ─── Member Info Display ───────────────────────────────────────────────────
function MemberInfo({ member, onReset }: { member: Member; onReset: () => void }) {
  return (
    <div className="member-card">
      <div className="member-name">{member.name}</div>
      <div className="member-pills">
        <div className="member-pill">代號 <strong>{member.agcode}</strong></div>
        <div className="member-pill">職級 <strong>{member.rank}</strong></div>
        {member.group && <div className="member-pill">組別 <strong>{member.group}</strong></div>}
        {member.supervisor && <div className="member-pill">主管 <strong>{member.supervisor}</strong></div>}
      </div>
      <button className="member-reset" onClick={onReset}>
        ← 重新輸入
      </button>
    </div>
  );
}

// ─── Clock ────────────────────────────────────────────────────────────────
function LiveClock({ className = 'hero', style }: { className?: string, style?: React.CSSProperties }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = now.getHours().toString().padStart(2, '0');
  const mm = now.getMinutes().toString().padStart(2, '0');
  const ss = now.getSeconds().toString().padStart(2, '0');
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const dateStr = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日　星期${days[now.getDay()]}`;

  return (
    <div className={className} style={style}>
      <div className="hero-clock">
        {hh}:{mm}<span className="hero-clock-seconds">:{ss}</span>
      </div>
      <div className="hero-date">{dateStr}</div>
    </div>
  );
}

// ─── CheckIn Tab ──────────────────────────────────────────────────────────
function CheckinTab({ fieldMode = false, forcedMember, onRequireFieldWork, onComplete }: { fieldMode?: boolean; forcedMember?: Member; onRequireFieldWork?: () => void; onComplete?: () => void }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (forcedMember) {
      setMember(forcedMember);
    }
  }, [forcedMember]);

  const doCheckin = useCallback(() => {
    if (!member) return;

    confirmDialog(`確認要送出本日 ${fieldMode ? '外勤' : '一般'} 簽到嗎？`, async () => {
      setGeoLoading(true);

      let lat: number | undefined, lng: number | undefined;

      if (!fieldMode) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // location unavailable, will be treated as field
        }
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0 
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* ignore */ }
      }

      setGeoLoading(false);
      const submitData = async (forceDuplicate = false) => {
        setLoading(true);
        try {
          const res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agcode: member.agcode, type: fieldMode ? 'field' : 'normal', lat, lng, forceField: fieldMode, forceDuplicate }),
          });
          const data = await res.json();
          if (res.ok) {
            showAnimation('checkin-success', `簽到成功！${data.isFieldWork ? '（外勤）' : '（一般）'} 時間：${data.timeStr}`);
            setMember(null);
            if (onComplete) onComplete();
          } else {
            if (data.needDuplicateConfirm) {
              confirmDialog(data.error || '確認要重複打卡嗎？', () => {
                submitData(true);
              });
            } else {
              showAnimation('checkin-fail', data.error || '簽到失敗');
              if (data.needFieldWork && onRequireFieldWork) {
                setTimeout(() => {
                  onRequireFieldWork();
                }, 1000); // Allow time for toast
              }
            }
          }
        } catch {
          toast.error('網路錯誤，請稍後再試');
        } finally {
          setLoading(false);
        }
      };

      submitData(false);
    });

  }, [member, fieldMode]);

  return (
    <div>
      {!member ? (
        <AgcodeLookup onFound={setMember} loading={loading} setLoading={setLoading} />
      ) : (
        <>
          <MemberInfo member={member} onReset={() => { setMember(null); }} />
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
              {fieldMode
                ? '📍 外勤簽到將記錄您目前的 GPS 位置。請確認身份資訊無誤後送出。'
                : '✅ 系統將驗證您所在位置是否在公司範圍內。請確認身份資訊無誤後送出。'}
            </p>
            <button
              className={`btn ${fieldMode ? 'btn-warning' : 'btn-success'} btn-full btn-lg`}
              onClick={doCheckin}
              disabled={loading || geoLoading}
            >
              {(loading || geoLoading) ? <span className="spinner" /> : null}
              {geoLoading ? '取得位置中⋯' : loading ? '簽到中⋯' : fieldMode ? '🏃 確認外勤簽到' : '✅ 確認簽到'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Leave Tab ────────────────────────────────────────────────────────────
function LeaveTab({ forcedMember, onComplete }: { forcedMember?: Member; onComplete?: () => void }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forcedMember) {
      handleMemberFound(forcedMember);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedMember]);
  const [leaveDate, setLeaveDate] = useState('');
  const [reason, setReason] = useState('');

  const [reqDays, setReqDays] = useState<string[]>([]);
  const [reqLoading, setReqLoading] = useState(false);

  const handleMemberFound = async (m: Member) => {
    setMember(m);
    setReqLoading(true);
    try {
      const [reqRes, leaveRes] = await Promise.all([
        fetch(`/api/required-days?agcode=${m.agcode}`),
        fetch(`/api/leave?agcode=${m.agcode}`)
      ]);
      if (reqRes.ok && leaveRes.ok) {
        const reqData = await reqRes.json();
        const leaveData = await leaveRes.json();

        const todayStr = new Date().toISOString().split('T')[0];
        const existingLeaves = leaveData.records.map((l: any) => l.leaveDate);

        const days = reqData.records
          .map((r: any) => r.date)
          .filter((d: string) => d >= todayStr && !existingLeaves.includes(d));

        setReqDays([...new Set(days)] as string[]);
      }
    } catch {
      // ignore
    } finally {
      setReqLoading(false);
    }
  };

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !leaveDate || !reason) return;
    setLoading(true);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agcode: member.agcode, leaveDate, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        showAnimation('leave-success', '假單送出成功！請等候審核');
        setMember(null); setLeaveDate(''); setReason('');
        if (onComplete) onComplete();
      } else {
        showAnimation('leave-fail', data.error || '申請失敗');
      }
    } catch {
      toast.error('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!member ? (
        <AgcodeLookup onFound={handleMemberFound} loading={loading} setLoading={setLoading} />
      ) : (
        <>
          <MemberInfo member={member} onReset={() => { setMember(null); }} />
          <form onSubmit={doSubmit}>
            <div className="form-group">
              <label className="form-label">請假日期（必要出席日）</label>
              {reqLoading ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><span className="spinner spinner-dark" /> 載入日期中⋯</div>
              ) : reqDays.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>近三十天內無需必要出席日</div>
              ) : (
                <select className="form-select" value={leaveDate} onChange={e => setLeaveDate(e.target.value)} required>
                  <option value="">請選擇請假日期</option>
                  {reqDays.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">請假原因</label>
              <textarea className="form-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="請輸入請假原因" required />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading || !leaveDate || !reason}>
              {loading ? <span className="spinner" /> : null}
              {loading ? '送出中⋯' : '📬 送出請假申請'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Visit Tab ────────────────────────────────────────────────────────────
function VisitTab({ forcedMember, onComplete }: { forcedMember?: Member; onComplete?: () => void }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (forcedMember) {
      setMember(forcedMember);
    }
  }, [forcedMember]);
  const [purpose, setPurpose] = useState('');
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !purpose || !clientName) return;
    setLoading(true);

    let lat: number | undefined, lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
            enableHighAccuracy: true, 
            timeout: 10000, 
            maximumAge: 0 
        })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agcode: member.agcode, purpose, clientName, notes, lat, lng }),
      });
      const data = await res.json();
      if (res.ok) {
        showAnimation('📍 拜訪紀錄已上傳');
        toast.success('拜訪紀錄已上傳');
        setPurpose(''); setClientName(''); setNotes('');
        if (onComplete) onComplete();
      } else {
        showAnimation('visit-fail', data.error || '送出失敗');
      }
    } catch {
      toast.error('網路錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!member ? (
        <AgcodeLookup onFound={setMember} loading={loading} setLoading={setLoading} />
      ) : (
        <>
          <MemberInfo member={member} onReset={() => { setMember(null); }} />
          <form onSubmit={doSubmit}>
            <div className="form-group">
              <label className="form-label">拜訪事由</label>
              <select className="form-select" value={purpose} onChange={e => setPurpose(e.target.value)} required>
                <option value="">請選擇事由</option>
                <option value="銷售">銷售</option>
                <option value="理賠">理賠</option>
                <option value="一般拜訪">一般拜訪</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">客戶姓名</label>
              <input className="form-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="請輸入客戶姓名" required />
            </div>
            <div className="form-group">
              <label className="form-label">備註</label>
              <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="選填" />
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading || !purpose || !clientName}>
              {loading ? <span className="spinner" /> : null}
              {loading ? '送出中⋯' : '📍 送出拜訪紀錄'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

// ─── Query Tab ────────────────────────────────────────────────────────────
function QueryTab({ forcedMember, defaultSection }: { forcedMember?: Member; defaultSection?: 'attendance' | 'leaves' | 'history' | 'visit' }) {
  const [agcode, setAgcode] = useState(forcedMember ? forcedMember.agcode : '');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [history, setHistory] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [section, setSection] = useState<'attendance' | 'leaves' | 'history' | 'visit'>(defaultSection || 'attendance');
  const [visitRange, setVisitRange] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    if (forcedMember && agcode) {
      document.getElementById('queryFormSubmit')?.click();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedMember]);

  const doQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agcode.trim()) return;
    setLoading(true);
    try {
      const [mRes, aRes, lRes] = await Promise.all([
        fetch(`/api/member?agcode=${agcode.toUpperCase()}`),
        fetch(`/api/checkin?agcode=${agcode.toUpperCase()}`),
        fetch(`/api/leave?agcode=${agcode.toUpperCase()}`),
      ]);
      if (mRes.ok) setMember((await mRes.json()).member);
      if (aRes.ok) setAttendance((await aRes.json()).records);
      if (lRes.ok) setLeaves((await lRes.json()).records);

      // Fetch external history
      try {
        const hRes = await fetch(`/api/external-history?agcode=${agcode.toUpperCase()}`);
        if (hRes.ok) setHistory(await hRes.json());
      } catch { /* ignore external error */ }
    } finally {
      setLoading(false);
    }
  };

  const loadVisits = async () => {
    if (!member) return;
    setLoadingVisits(true);
    try {
      const res = await fetch(`/api/visit?agcode=${member.agcode}&startDate=${visitRange}`);
      if (res.ok) {
        const data = await res.json();
        setVisits(data.records || []);
      }
    } catch { }
    setLoadingVisits(false);
  };

  useEffect(() => {
    if (section === 'visit' && visits.length === 0) loadVisits();
  }, [section, member]);

  const statusLabel = (s: string) => {
    if (s === 'pending') return <span className="badge badge-yellow">待審核</span>;
    if (s === 'approved') return <span className="badge badge-green">已核准</span>;
    return <span className="badge badge-red">已拒絕</span>;
  };

  return (
    <div>
      <form onSubmit={doQuery}>
        <div className="form-group">
          <label className="form-label">業務代號 AGCODE</label>
          <input className="form-input" value={agcode} onChange={e => setAgcode(e.target.value.toUpperCase())} placeholder="請輸入業務代號" autoCapitalize="characters" />
        </div>
        <button id="queryFormSubmit" className="btn btn-primary btn-full" type="submit" disabled={loading || !agcode.trim()}>
          {loading ? <span className="spinner" /> : null}
          {loading ? '查詢中⋯' : '🔍 查詢紀錄'}
        </button>
      </form>

      {member && (
        <>
          <MemberInfo member={member} onReset={() => { setMember(null); setAttendance([]); setLeaves([]); }} />
          <div className="segmented" style={{ marginBottom: 16 }}>
            <button className={`seg-btn ${section === 'attendance' ? 'active' : ''}`} onClick={() => setSection('attendance')}>
              出席紀錄（{attendance.length}）
            </button>
            <button className={`seg-btn ${section === 'leaves' ? 'active' : ''}`} onClick={() => setSection('leaves')}>
              請假（{leaves.length}）
            </button>
            <button className={`seg-btn ${section === 'visit' ? 'active' : ''}`} onClick={() => setSection('visit')}>
              拜訪
            </button>
            <button className={`seg-btn ${section === 'history' ? 'active' : ''}`} onClick={() => setSection('history')}>
              歷程
            </button>
          </div>

          {section === 'attendance' && (
            attendance.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">近 30 日無出席紀錄</div></div>
              : <div className="table-wrapper">
                <table>
                  <thead><tr><th>日期</th><th>時間</th><th>類型</th></tr></thead>
                  <tbody>
                    {attendance.map((r, i) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>{r.checkinTime?.split(' ')[1] || '—'}</td>
                        <td>{r.isFieldWork ? <span className="badge badge-yellow">外勤</span> : <span className="badge badge-green">一般</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}

          {section === 'history' && (
            !history || !history.found
              ? <div className="empty-state"><div className="empty-state-icon">🎓</div><div className="empty-state-text">查無外部歷程紀錄</div></div>
              : <div className="history-tab-content">
                  <div className="card-xs" style={{ background: 'var(--surface-input)', marginBottom: 12, borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>單位：{history.person.group}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>主管：{history.person.manager}</div>
                  </div>
                  <div className="table-wrapper">
                    <table>
                      <thead><tr><th>課程/證照</th><th>類別</th><th>日期</th></tr></thead>
                      <tbody>
                        {history.history.map((h: any, i: number) => (
                          <tr key={i}>
                            <td style={{ maxWidth: 140 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{h.code}</div>
                            </td>
                            <td><span style={{ fontSize: '0.75rem' }}>{h.pName}</span></td>
                            <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{h.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
          )}

          {section === 'visit' && (
            <div className="visit-query-content">
              <div style={{ padding: '0 0 16px 0', display: 'flex', gap: 8 }}>
                <input type="date" className="form-input" style={{ flex: 1, padding: '0 12px' }} value={visitRange} onChange={e => setVisitRange(e.target.value)} />
                <button className="btn btn-primary" style={{ minWidth: 70 }} onClick={loadVisits} disabled={loadingVisits}>
                  {loadingVisits ? '...' : '查詢'}
                </button>
              </div>
              {visits.length === 0 ? (
                <div className="empty-state"><div className="empty-state-icon">📍</div><div className="empty-state-text">此區間內無拜訪紀錄</div></div>
              ) : (
                <div className="ios-list">
                  {visits.map((v, i) => (
                    <div key={i} className="ios-list-item" style={{ background: 'var(--surface-input)', marginBottom: 8, borderRadius: 12 }}>
                      <div className="ios-list-text">
                        <div className="ios-list-title" style={{ fontSize: '1rem' }}>{v.clientName}</div>
                        <div className="ios-list-desc">{v.visitTime} • {v.purpose}</div>
                        {v.notes && <div style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-primary)' }}>{v.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Notification Component ──────────────────────────────────────────────────
function NotificationModal({ 
  agcode, 
  onClose,
  onRefreshCount
}: { 
  agcode: string; 
  onClose: () => void;
  onRefreshCount: () => void;
}) {
  const [notifs, setNotifs] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications?agcode=${agcode}`);
      const data = await res.json();
      if (res.ok) setNotifs(data.records || []);
    } catch {}
    setLoading(false);
  }, [agcode]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (rowIndex: number) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex })
      });
      setNotifs(prev => prev.map(n => n.rowIndex === rowIndex ? { ...n, isRead: true } : n));
      onRefreshCount();
    } catch {}
  };

  return (
    <div className="ios-modal-overlay" onClick={onClose}>
      <div className="ios-modal" onClick={e => e.stopPropagation()}>
        <div className="ios-modal-header">
          <div className="ios-modal-title">系統通知</div>
          <button className="ios-modal-close" onClick={onClose}><IconX size={20} /></button>
        </div>
        <div className="ios-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 40 }}>
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><span className="spinner spinner-dark" /></div> : (
            notifs.length === 0 ? (
              <div className="empty-state" style={{ padding: '60px 0' }}>
                <div className="empty-state-icon">🔔</div>
                <div className="empty-state-text">尚無任何通知</div>
              </div>
            ) : (
              <div className="notif-list">
                {notifs.map(n => (
                  <div key={n.id} className={`notif-item ${n.isRead ? 'read' : 'unread'}`} onClick={() => !n.isRead && markRead(n.rowIndex)}>
                    <div className="notif-header">
                      <span className="notif-title">{n.title}</span>
                      {!n.isRead && <span className="notif-badge-new">NEW</span>}
                    </div>
                    <div className="notif-content">{n.content}</div>
                    <div className="notif-time">{n.createdAt}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryExtView({ agcode }: { agcode: string }) {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/external-history?agcode=${agcode}`);
        const data = await res.json();
        setHistory(data);
      } catch { }
      setLoading(false);
    })();
  }, [agcode]);


  if (loading) return (
    <div className="ios-modal-overlay" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', zIndex: 9999 }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 48, height: 48, border: '3px solid var(--blue)', borderTopColor: 'transparent', margin: '0 auto 20px' }} />
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>外部系統連線中</div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: 8 }}>請稍後...</div>
      </div>
    </div>
  );

  if (!history || !history.found) {
    return (
      <div className="empty-state" style={{ padding: '60px 0' }}>
        <div className="empty-state-icon">🎓</div>
        <div className="empty-state-text">查無外部訓練歷程紀錄</div>
      </div>
    );
  }

  return (
    <div className="history-ext-container">
      <div className="card-xs" style={{ background: 'var(--surface-input)', marginBottom: 20, borderRadius: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{history.person.name} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-secondary)' }}>{history.person.rank}</span></div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{history.person.group}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>直屬主管</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{history.person.manager}</div>
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginLeft: 4 }}>歷程與證照清單</div>
      <div className="table-wrapper">
        <table>
          <thead><tr><th>課程/證照名稱</th><th style={{ textAlign: 'center' }}>類別</th><th style={{ textAlign: 'right' }}>日期</th></tr></thead>
          <tbody>
            {history.history.map((h: any, i: number) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{h.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>代碼: {h.code}</div>
                </td>
                <td style={{ textAlign: 'center' }}><span style={{ fontSize: '0.75rem' }}>{h.pName}</span></td>
                <td style={{ textAlign: 'right', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{h.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── More Tab ──────────────────────────────────────────────────────────────
function MoreTab({ member, onLogout, onExtHistory }: { member: Member; onLogout: () => void; onExtHistory: () => void }) {
    return (
        <div className="ios-history-page">
            <div className="section-header" style={{ marginTop: 0 }}>系統與外部整合</div>
            <div className="ios-list">
                <div className="ios-list-item" onClick={onExtHistory}>
                    <div className="ios-list-icon" style={{ background: '#5856D6' }}>🎓</div>
                    <div className="ios-list-text">
                        <div className="ios-list-title">區單位訓練歷程</div>
                        <div className="ios-list-desc">同步查詢 seed-pro 課程與證照紀錄</div>
                    </div>
                    <IconChevronRight size={16} color="var(--text-secondary)" />
                </div>
                <div className="ios-list-item" onClick={onLogout}>
                    <div className="ios-list-icon" style={{ background: '#FF3B30' }}>
                        <IconLogOut size={18} />
                    </div>
                    <div className="ios-list-text">
                        <div className="ios-list-title" style={{ color: '#FF3B30' }}>登出系統</div>
                        <div className="ios-list-desc">登出目前帳號並返回登入頁面</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Home Page (Main App) ────────────────────────────────────────────────────
type AppScreen = 'home' | 'checkin' | 'field' | 'leave' | 'visit' | 'query' | 'more' | 'history-ext';

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [queryDefault, setQueryDefault] = useState<'attendance' | 'leaves' | 'history' | 'visit'>('attendance');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  const fetchUnread = useCallback(async () => {
    if (!member) return;
    try {
      const res = await fetch(`/api/notifications?agcode=${member.agcode}`);
      const data = await res.json();
      if (res.ok) {
        const count = (data.records || []).filter((n: any) => !n.isRead).length;
        setUnreadCount(count);
      }
    } catch { }
  }, [member]);

  useEffect(() => {
    if (member) {
      fetchUnread();
      const t = setInterval(fetchUnread, 60000); // Poll unread every minute
      return () => clearInterval(t);
    }
  }, [member, fetchUnread]);

  const logout = () => confirmDialog('確定要登出系統嗎？', () => setMember(null));

  // If unauthenticated
  if (!member) {
    return (
      <div className="login-page">
        <div className="login-box" style={{ maxWidth: 360, margin: '0 auto' }}>
          <div className="login-icon-wrap" style={{ background: 'var(--surface-card)', border: '1px solid var(--line)', color: 'var(--text-primary)', boxShadow: 'none' }}><IconLogo size={32} /></div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>出勤管理</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32 }}>以業務代號登入</p>
          <AgcodeLookup onFound={setMember} loading={loading} setLoading={setLoading} />
          <div style={{ marginTop: 24 }}>
            <a href="/admin" className="btn-text" style={{ fontSize: '0.85rem' }}>前往後台管理 →</a>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated App Shell
  return (
    <div className="app-frame">
      {screen === 'home' ? (
        <>
          <div className="ios-body-scroll">
            <div className="ios-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2 }}>Hello! {member.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>祝你有美好的一天</p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button 
                  className="avatar-btn" 
                  onClick={() => setShowNotif(true)} 
                  style={{ 
                    position: 'relative', 
                    background: 'var(--surface-card)', 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    borderRadius: '50%',
                    width: 44,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--line)'
                  }}
                >
                    <IconBell size={22} color="var(--blue)" />
                    {unreadCount > 0 && <span className="notification-badge" style={{ top: 2, right: 2 }}>{unreadCount}</span>}
                </button>
              </div>
            </div>

            <div className="ios-cards-scroll">
              <div className="ios-card" onClick={() => { setQueryDefault('attendance'); setScreen('query'); }}>
                <div className="ios-card-icon"><IconSearch /></div>
                <div style={{ fontWeight: 600 }}>個人出勤</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>查看打卡紀錄</div>
              </div>
              <div className="ios-card" onClick={() => setScreen('leave')}>
                <div className="ios-card-icon"><IconInbox /></div>
                <div style={{ fontWeight: 600 }}>請假申請</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>線上辦理請假</div>
              </div>
              <div className="ios-card" onClick={() => setScreen('visit')}>
                <div className="ios-card-icon"><IconMapPin /></div>
                <div style={{ fontWeight: 600 }}>紀錄拜訪</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>上傳拜訪客戶資料</div>
              </div>
              <div className="ios-card" onClick={() => { setQueryDefault('visit'); setScreen('query'); }}>
                <div className="ios-card-icon" style={{ background: '#E5E5EA' }}><IconSearch color="var(--blue)" size={24} /></div>
                <div style={{ fontWeight: 600 }}>拜訪查詢</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>查看拜訪歷史紀錄</div>
              </div>
            </div>

            <div className="ios-action-area">
              <div style={{ position: 'relative' }}>
                <div className="ios-giant-btn-ring"></div>
                <button className="ios-giant-btn" onClick={() => setScreen('checkin')}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <IconCheckCircle size={52} />
                    <span style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>上班打卡</span>
                  </div>
                </button>
              </div>

              <LiveClock className="ios-clock-wrap" />
            </div>
          </div>

          <div className="ios-tab-bar">
            <div className={`ios-tab-item ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}><IconLogo size={22} /> 首頁</div>
            <div className={`ios-tab-item ${screen === 'query' ? 'active' : ''}`} onClick={() => setScreen('query')}><IconSearch size={22} /> 紀錄</div>
            <div className={`ios-tab-item ${screen === 'leave' ? 'active' : ''}`} onClick={() => setScreen('leave')}><IconInbox size={22} /> 請假</div>
            <div className={`ios-tab-item ${screen === 'more' ? 'active' : ''}`} onClick={() => setScreen('more')}><IconGrid size={22} /> 其他</div>
          </div>
        </>
      ) : (
        <>
          {/* Sub-screens */}
          <div className="ios-nav-top">
            <button className="ios-nav-back" onClick={() => setScreen('home')}>
              <div style={{ transform: 'rotate(180deg)', marginRight: 4, display: 'flex', alignItems: 'center' }}>
                <IconChevronRight size={18} />
              </div>
              <span>返回</span>
            </button>
            <div className="ios-nav-title">
              {screen === 'checkin' ? '上班定位打卡' : ''}
              {screen === 'field' ? '外勤定位打卡' : ''}
              {screen === 'leave' ? '請假申請' : ''}
              {screen === 'query' ? '個人出勤紀錄' : ''}
              {screen === 'visit' ? '客戶拜訪紀錄' : ''}
              {screen === 'more' ? '更多功能' : ''}
              {screen === 'history-ext' ? '區單位訓練歷程' : ''}
            </div>
          </div>
          <div className="ios-content">
            {screen === 'checkin' && <CheckinTab forcedMember={member} onRequireFieldWork={() => setScreen('field')} onComplete={() => setScreen('home')} />}
            {screen === 'field' && <CheckinTab fieldMode forcedMember={member} onComplete={() => setScreen('home')} />}
            {screen === 'leave' && <LeaveTab forcedMember={member} onComplete={() => setScreen('home')} />}
            {screen === 'query' && <QueryTab forcedMember={member} defaultSection={queryDefault} />}
            {screen === 'visit' && <VisitTab forcedMember={member} onComplete={() => setScreen('home')} />}
            {screen === 'more' && <MoreTab member={member} onLogout={logout} onExtHistory={() => setScreen('history-ext')} />}
            {screen === 'history-ext' && (
              <div className="ios-history-page">
                <HistoryExtView agcode={member.agcode} />
              </div>
            )}
          </div>
        </>
      )}
      
      {showNotif && member && (
        <NotificationModal 
          agcode={member.agcode} 
          onClose={() => setShowNotif(false)} 
          onRefreshCount={fetchUnread}
        />
      )}
    </div>
  );
}
