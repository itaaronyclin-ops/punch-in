'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import {
    IconUserPlus, IconUserEdit, IconUserCheck, IconTrash,
    IconCheck, IconAlertTriangle, IconQrcode, IconLoader2, IconSearch, IconCamera, IconX
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import QRScanner from '@/components/QRScanner';

type HRMode = 'candidate' | 'agent' | 'upgrade' | 'update' | 'delete';
type HRStep = 'ENTRY_QR' | 'SELECT_MODE' | 'QUERY_ID' | 'FILL_FORM' | 'REVIEW' | 'AUTH_QR' | 'STATUS';

export default function HRPage() {
    const [step, setStep] = useState<HRStep>('ENTRY_QR');
    const [mode, setMode] = useState<HRMode | null>(null);
    const [queryId, setQueryId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: 'success', title: '', content: '' });

    // Auth session
    const [authSessionId, setAuthSessionId] = useState('');
    const [isPolling, setIsPolling] = useState(false);
    const [authPhase, setAuthPhase] = useState<'ENTRY' | 'SUBMIT' | null>(null);
    const [supervisorInfo, setSupervisorInfo] = useState({ supervisorAgcode: '', supervisorName: '' });
    const pollInterval = useRef<any>(null);

    const [formData, setFormData] = useState<any>({
        idcard: '', agcode: '', name: '', birthday: '', gender: '',
        phone: '', email: '', addressContact: '', addressResident: '',
        emgName: '', emgRelation: '', emgPhone: '',
        eduLevel: '', eduSchool: '', prevIndustry: '', prevJob: '',
        groupName: '', certEthics: '', certLife: '', certProperty: '',
        certForeign: '', certInvestment: '', rank: '',
        supervisorAgcode: '', supervisorName: '',
    });

    // ─── QR Auth ─────────────────────────────────────────────────────────────
    const startQrAuth = async (phase: 'ENTRY' | 'SUBMIT') => {
        const sid = 'hr-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
        setAuthSessionId(sid);
        setAuthPhase(phase);
        setIsLoading(true);
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createAuthSession', id: sid }),
            });
            const data = await res.json();
            if (data.success) {
                setStep('AUTH_QR');
                setIsPolling(true);
            } else {
                alert('無法啟動驗證：' + (data.error || '請稍後再試'));
            }
        } catch {
            alert('網路連線失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isPolling || !authSessionId) return;
        pollInterval.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/hr/auth?id=${authSessionId}`);
                const data = await res.json();
                if (data.session?.status === 'approved') {
                    clearInterval(pollInterval.current);
                    setIsPolling(false);
                    const info = {
                        supervisorAgcode: data.session.supervisoragcode || data.session.supervisorAgcode || '',
                        supervisorName: data.session.supervisorname || data.session.supervisorName || '',
                    };
                    setSupervisorInfo(info);
                    if (authPhase === 'ENTRY') {
                        setStep('SELECT_MODE');
                    } else if (authPhase === 'SUBMIT') {
                        setFormData((p: any) => ({ ...p, ...info }));
                        submitFinal({ ...formData, ...info });
                    }
                }
            } catch { /* ignore */ }
        }, 2500);
        return () => clearInterval(pollInterval.current);
    }, [isPolling, authSessionId, authPhase]); // eslint-disable-line

    // ─── Submit ───────────────────────────────────────────────────────────────
    const submitFinal = async (finalData = formData) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/hr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...finalData, actionStatus: mode, oldAgcode: queryId || finalData.agcode }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMsg({ type: 'success', title: '提交成功', content: '資料異動申請已完成。' });
                setStep('STATUS');
            } else {
                alert(data.error || '提交失敗');
                setStep('REVIEW');
            }
        } catch {
            alert('伺服器無回應');
            setStep('REVIEW');
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Data ─────────────────────────────────────────────────────────────────
    const loadProfile = async (id: string) => {
        if (!id) { alert('請輸入代號或身分證'); return; }
        setIsLoading(true);
        try {
            const res = await fetch(`/api/hr?q=${id}`);
            const data = await res.json();
            if (data.profile) {
                setFormData((p: any) => ({ ...p, ...data.profile }));
                setStep('FILL_FORM');
            } else { alert('查無資料'); }
        } catch { alert('讀取失敗'); }
        finally { setIsLoading(false); }
    };

    const fi = (label: string, name: string, type = 'text', required = false) => (
        <div className="hr-input-group">
            <label>{label}{required && <span style={{ color: '#FF3B30' }}> *</span>}</label>
            {name === 'gender' ? (
                <select
                    name={name}
                    className="hr-form-input"
                    value={formData[name] || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, [name]: e.target.value }))}
                    disabled={step === 'REVIEW'}
                    style={{
                        cursor: step === 'REVIEW' ? 'default' : 'pointer', appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2386868b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36
                    }}
                >
                    <option value="">請選擇</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                    <option value="其他">其他</option>
                </select>
            ) : (
                <input
                    name={name} type={type}
                    className="hr-form-input"
                    value={formData[name] || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, [name]: e.target.value }))}
                    readOnly={step === 'REVIEW'}
                />
            )}
        </div>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="hr-wrap">
            <header className="hr-header-bar">
                <h1>資料異動申請</h1>
            </header>

            <main className="hr-main">
                {isLoading && (
                    <div className="hr-fullscreen-loader">
                        <IconLoader2 size={48} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} />
                        <p>處理中，請稍候...</p>
                    </div>
                )}

                {/* ── Step 1: 進入前掃碼 ── */}
                {step === 'ENTRY_QR' && (
                    <div className="hr-auth-card">
                        <div className="hr-auth-icon" style={{ background: 'rgba(0,122,255,0.08)' }}>
                            <IconQrcode size={40} color="#007aff" />
                        </div>
                        <h2>請掃碼授權</h2>
                        <p style={{ color: '#86868b', margin: '12px 0 32px' }}>
                            進入異動系統前，需主管授權
                        </p>
                        <button className="hr-btn hr-btn-primary" onClick={() => startQrAuth('ENTRY')}>
                            產生授權碼
                        </button>
                    </div>
                )}

                {/* ── Step: AUTH_QR 顯示 QR Code 等待主管掃描 ── */}
                {step === 'AUTH_QR' && (
                    <div className="hr-auth-card">
                        <h2 style={{ marginBottom: 8 }}>
                            {authPhase === 'ENTRY' ? '主管驗證－進入授權' : '主管驗證－提交簽署'}
                        </h2>
                        <p style={{ color: '#86868b', marginBottom: 28, fontSize: '0.9rem' }}>
                            請主管以手機開啟打卡首頁，點擊<strong>「掃描授權」</strong>，掃描下方 QR Code
                        </p>
                        <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 20, padding: 20, display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginBottom: 24 }}>
                            {typeof window !== 'undefined' && (
                                <QRCodeSVG
                                    value={`${window.location.origin}/hr/authorize?id=${authSessionId}`}
                                    size={200}
                                />
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#86868b', fontSize: '0.9rem', marginBottom: 28 }}>
                            <IconLoader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                            <span>等待授權中...</span>
                        </div>
                        <button className="hr-btn hr-btn-ghost" onClick={() => {
                            clearInterval(pollInterval.current);
                            setIsPolling(false);
                            setStep(authPhase === 'ENTRY' ? 'ENTRY_QR' : 'REVIEW');
                        }}>
                            取消
                        </button>
                    </div>
                )}

                {/* ── Step 2: 選擇功能 ── */}
                {step === 'SELECT_MODE' && (
                    <div>
                        {supervisorInfo.supervisorName && (
                            <div style={{ textAlign: 'center', marginBottom: 24, color: '#34C759', fontWeight: 600 }}>
                                ✅ 已由 {supervisorInfo.supervisorName}（{supervisorInfo.supervisorAgcode}）授權進入
                            </div>
                        )}
                        <div className="hr-mode-grid">
                            {([
                                { mode: 'candidate', label: '準增員建檔', icon: <IconUserPlus />, color: '#E3F2FD', iconColor: '#2196F3' },
                                { mode: 'agent', label: '新進業務員建檔', icon: <IconUserCheck />, color: '#E8F5E9', iconColor: '#4CAF50' },
                                { mode: 'upgrade', label: '準增員轉業務員', icon: <IconUserEdit />, color: '#FFF3E0', iconColor: '#FF9800' },
                                { mode: 'update', label: '資料變更', icon: <IconSearch />, color: '#F3E5F5', iconColor: '#9C27B0' },
                                { mode: 'delete', label: '撤銷 / 刪除', icon: <IconTrash />, color: '#FFEBEE', iconColor: '#F44336' },
                            ] as { mode: HRMode, label: string, icon: React.ReactNode, color: string, iconColor: string }[]).map(item => (
                                <button key={item.mode} className="hr-mode-card" onClick={() => {
                                    setMode(item.mode);
                                    if (item.mode === 'candidate') {
                                        setStep('FILL_FORM');
                                    } else {
                                        setStep('QUERY_ID');
                                    }
                                }}>
                                    <div className="hr-mode-icon" style={{ background: item.color }}>
                                        {React.cloneElement(item.icon as React.ReactElement, { color: item.iconColor, size: 28 })}
                                    </div>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step: 查詢人員 ── */}
                {step === 'QUERY_ID' && (
                    <div className="hr-auth-card">
                        <div className="hr-auth-icon" style={{ background: 'rgba(0,122,255,0.08)' }}>
                            <IconSearch size={32} color="#007aff" />
                        </div>
                        <h2>人員查詢</h2>
                        <p style={{ color: '#86868b', margin: '8px 0 24px' }}>請輸入要操作對象的身分證或業務代號</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input
                                className="hr-form-input" style={{ flex: 1 }}
                                placeholder="身分證 / AGCODE"
                                value={queryId}
                                onChange={e => setQueryId(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            <button className="hr-btn hr-btn-primary" onClick={() => loadProfile(queryId)}>搜尋</button>
                            <button className="hr-btn hr-btn-ghost" style={{ padding: '0 16px' }} onClick={() => setShowScanner(true)}>
                                <IconCamera size={20} />
                            </button>
                        </div>
                        <button className="hr-btn hr-btn-ghost" style={{ marginTop: 20 }} onClick={() => setStep('SELECT_MODE')}>返回</button>
                    </div>
                )}

                {showScanner && (
                    <QRScanner
                        title="掃描員工身分碼"
                        onScan={val => { setShowScanner(false); setQueryId(val.toUpperCase()); loadProfile(val); }}
                        onClose={() => setShowScanner(false)}
                    />
                )}

                {/* ── Step: 填寫 / 校對表單 ── */}
                {(step === 'FILL_FORM' || step === 'REVIEW') && (
                    <div className="hr-form-card">
                        <div className="hr-form-top-bar">
                            <h2>
                                {mode === 'candidate' && '準增員建檔'}
                                {mode === 'agent' && '新進業務員建檔'}
                                {mode === 'upgrade' && '準增員轉業務員'}
                                {mode === 'update' && '資料變更'}
                                {mode === 'delete' && '撤銷登錄 / 刪除'}
                            </h2>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span className={`hr-step-pill ${step === 'FILL_FORM' ? 'active' : ''}`}>1 填寫</span>
                                <span style={{ color: '#ccc' }}>→</span>
                                <span className={`hr-step-pill ${step === 'REVIEW' ? 'active' : ''}`}>2 校對</span>
                            </div>
                        </div>

                        <div className="hr-form-scroll">
                            <div className="hr-section-title">基本身分</div>
                            <div className="hr-grid-2">
                                {fi('身分證字號', 'idcard', 'text', true)}
                                {fi('姓名', 'name', 'text', true)}
                                {fi('出生年月日', 'birthday', 'date')}
                                {fi('性別', 'gender')}
                            </div>

                            <div className="hr-section-title">聯繫資訊</div>
                            <div className="hr-grid-2">
                                {fi('手機號碼', 'phone')}
                                {fi('電子郵件', 'email', 'email')}
                                <div className="hr-full-col">{fi('通訊地址', 'addressContact')}</div>
                                <div className="hr-full-col">{fi('戶籍地址', 'addressResident')}</div>
                            </div>

                            <div className="hr-section-title">緊急聯絡</div>
                            <div className="hr-grid-2">
                                {fi('緊急聯絡人', 'emgName')}
                                {fi('關係', 'emgRelation')}
                                <div className="hr-full-col">{fi('緊急聯絡電話', 'emgPhone')}</div>
                            </div>

                            {(mode === 'agent' || mode === 'upgrade' || mode === 'update') && (
                                <>
                                    <div className="hr-section-title" style={{ color: '#B8860B' }}>系統配置</div>
                                    <div className="hr-grid-3">
                                        {fi('業務代號', 'agcode', 'text', true)}
                                        {fi('組別', 'groupName')}
                                        {fi('職級', 'rank')}
                                    </div>
                                </>
                            )}

                            {mode === 'delete' && (
                                <div style={{ background: '#FFF5F5', border: '1px solid #FFD0D0', borderRadius: 16, padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start', marginTop: 16 }}>
                                    <IconAlertTriangle color="#FF3B30" size={24} style={{ flexShrink: 0 }} />
                                    <div>
                                        <strong>確認撤銷此帳號？</strong>
                                        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '0.9rem' }}>此操作將永久移除該人員在系統中的所有登錄資訊。</p>
                                    </div>
                                </div>
                            )}

                            <div className="hr-form-actions">
                                {step === 'FILL_FORM' ? (
                                    <>
                                        <button className="hr-btn hr-btn-ghost" onClick={() => setStep(mode === 'candidate' ? 'SELECT_MODE' : 'QUERY_ID')}>取消</button>
                                        <button className="hr-btn hr-btn-primary" onClick={() => setStep('REVIEW')}>下一步 →</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="hr-btn hr-btn-ghost" onClick={() => setStep('FILL_FORM')}>← 回上一步</button>
                                        <button className="hr-btn hr-btn-primary" onClick={() => startQrAuth('SUBMIT')}>
                                            <IconQrcode size={18} style={{ marginRight: 8 }} />
                                            掃碼簽署提交
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step: 完成 ── */}
                {step === 'STATUS' && (
                    <div className="hr-status-screen">
                        <div className={`hr-status-icon ${statusMsg.type}`}>
                            {statusMsg.type === 'success'
                                ? <IconCheck size={48} color="white" />
                                : <IconX size={48} color="white" />}
                        </div>
                        <h2>{statusMsg.title}</h2>
                        <p style={{ color: '#86868b', marginTop: 8 }}>{statusMsg.content}</p>
                        <button className="hr-btn hr-btn-primary" style={{ marginTop: 40, padding: '16px 48px' }} onClick={() => window.location.reload()}>
                            返回首頁
                        </button>
                    </div>
                )}
            </main>

            <style>{`
                .hr-wrap { min-height: 100vh; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                .hr-header-bar { background: white; padding: 24px 20px; text-align: center; border-bottom: 1px solid #f2f2f7; box-shadow: 0 1px 0 rgba(0,0,0,0.05); position: sticky; top: 0; z-index: 100; }
                .hr-header-bar h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.03em; color: #1d1d1f; margin: 0; }
                .hr-main { max-width: 860px; margin: 0 auto; padding: 40px 20px 60px; }
                
                .hr-auth-card { background: white; border-radius: 28px; padding: 48px 32px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.08); max-width: 480px; margin: 0 auto; }
                .hr-auth-card h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 8px; }
                .hr-auth-icon { width: 80px; height: 80px; border-radius: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }

                .hr-mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
                .hr-mode-card { background: white; border: none; border-radius: 20px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-size: 1rem; font-weight: 600; color: #1d1d1f; }
                .hr-mode-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }
                .hr-mode-icon { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }

                .hr-form-card { background: white; border-radius: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); overflow: hidden; }
                .hr-form-top-bar { padding: 20px 28px; border-bottom: 1px solid #f2f2f7; display: flex; align-items: center; justify-content: space-between; background: white; position: sticky; top: 64px; z-index: 10; }
                .hr-form-top-bar h2 { font-size: 1.2rem; font-weight: 700; margin: 0; }
                .hr-form-scroll { padding: 28px; max-height: calc(100vh - 260px); overflow-y: auto; }
                .hr-section-title { font-size: 0.95rem; font-weight: 700; color: #007aff; border-bottom: 2px solid #007aff; padding-bottom: 6px; display: inline-block; margin-bottom: 16px; margin-top: 8px; }
                .hr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
                .hr-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
                .hr-full-col { grid-column: 1 / -1; }
                .hr-input-group { display: flex; flex-direction: column; gap: 6px; }
                .hr-input-group label { font-size: 0.82rem; font-weight: 600; color: #86868b; }
                .hr-form-input { padding: 12px 14px; border-radius: 12px; border: 1.5px solid #d2d2d7; background: #fafafa; font-size: 0.97rem; width: 100%; box-sizing: border-box; transition: all 0.2s; }
                .hr-form-input:focus { border-color: #007aff; background: white; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); outline: none; }
                .hr-form-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; padding-top: 20px; border-top: 1px solid #f2f2f7; }
                
                .hr-btn { padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.97rem; cursor: pointer; border: none; transition: all 0.2s; display: inline-flex; align-items: center; }
                .hr-btn-primary { background: #007aff; color: white; }
                .hr-btn-primary:hover { background: #0062cc; }
                .hr-btn-ghost { background: #F2F2F7; color: #1d1d1f; }
                .hr-btn-ghost:hover { background: #e5e5e7; }

                .hr-step-pill { padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; background: #f2f2f7; color: #86868b; }
                .hr-step-pill.active { background: #007aff; color: white; }

                .hr-fullscreen-loader { position: fixed; inset: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
                .hr-fullscreen-loader p { font-weight: 600; color: #1d1d1f; }

                .hr-status-screen { text-align: center; padding: 60px 20px; }
                .hr-status-icon { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 28px; }
                .hr-status-icon.success { background: #34C759; box-shadow: 0 10px 30px rgba(52,199,89,0.3); }
                .hr-status-icon.error { background: #FF3B30; box-shadow: 0 10px 30px rgba(255,59,48,0.3); }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 600px) {
                    .hr-mode-grid { grid-template-columns: 1fr; }
                    .hr-grid-2 { grid-template-columns: 1fr; }
                    .hr-grid-3 { grid-template-columns: 1fr 1fr; }
                    .hr-main { padding: 20px 12px 60px; }
                    .hr-form-card { border-radius: 16px; }
                }
            `}</style>
        </div>
    );
}
