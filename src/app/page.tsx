'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  IconCheckCircle, IconRun, IconInbox, IconMapPin, IconSearch,
  IconLogo, IconChevronRight, IconAlertTriangle, IconClock,
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
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // location unavailable, will be treated as field
        }
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
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
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
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
        showAnimation('visit-success', '拜訪紀錄已成功送出！');
        setMember(null); setPurpose(''); setClientName(''); setNotes('');
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
function QueryTab({ forcedMember }: { forcedMember?: Member }) {
  const [agcode, setAgcode] = useState(forcedMember ? forcedMember.agcode : '');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [section, setSection] = useState<'attendance' | 'leaves'>('attendance');

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
    } finally {
      setLoading(false);
    }
  };

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
              請假紀錄（{leaves.length}）
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

          {section === 'leaves' && (
            leaves.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">🗒️</div><div className="empty-state-text">無請假紀錄</div></div>
              : <div className="table-wrapper">
                <table>
                  <thead><tr><th>請假日期</th><th>原因</th><th>狀態</th></tr></thead>
                  <tbody>
                    {leaves.map((l, i) => (
                      <tr key={i}>
                        <td>{l.leaveDate}</td>
                        <td style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                        <td>{statusLabel(l.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
type AppScreen = 'home' | 'checkin' | 'field' | 'leave' | 'visit' | 'query';

export default function HomePage() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);

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
            <div className="ios-header">
              <h1>Hello! {member.name}</h1>
              <p>祝你有美好的一天</p>
            </div>

            <div className="ios-cards-scroll">
              <div className="ios-card" onClick={() => setScreen('query')}>
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
                <div style={{ fontWeight: 600 }}>拜訪紀錄</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>紀錄客戶拜訪</div>
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
            <div className="ios-tab-item active" onClick={() => setScreen('home')}><IconLogo size={22} /> 首頁</div>
            <div className="ios-tab-item" onClick={() => setScreen('query')}><IconSearch size={22} /> 出勤紀錄</div>
            <div className="ios-tab-item" onClick={() => setScreen('leave')}><IconInbox size={22} /> 請假單</div>
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
            </div>
          </div>
          <div className="ios-content">
            {screen === 'checkin' && <CheckinTab forcedMember={member} onRequireFieldWork={() => setScreen('field')} onComplete={() => setScreen('home')} />}
            {screen === 'field' && <CheckinTab fieldMode forcedMember={member} onComplete={() => setScreen('home')} />}
            {screen === 'leave' && <LeaveTab forcedMember={member} onComplete={() => setScreen('home')} />}
            {screen === 'query' && <QueryTab forcedMember={member} />}
            {screen === 'visit' && <VisitTab forcedMember={member} onComplete={() => setScreen('home')} />}
          </div>
        </>
      )}
    </div>
  );
}
