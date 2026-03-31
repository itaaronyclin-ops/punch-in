'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconUserPlus, IconUserEdit, IconUserCheck, IconTrash,
    IconCheck, IconAlertTriangle, IconQrcode, IconLoader2, IconSearch, IconCamera, IconX
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import QRScanner from '@/components/QRScanner';

type HRMode = 'candidate' | 'agent' | 'upgrade' | 'update' | 'delete';
type HRStep = 'ENTRY_QR' | 'SELECT_MODE' | 'QUERY_ID' | 'FILL_FORM' | 'REVIEW' | 'AUTH_QR' | 'STATUS';

function IconShieldCheck({ size = 20, color = 'currentColor', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>;
}

function HRPageContent() {
    const [step, setStep] = useState<HRStep>('ENTRY_QR');
    const [mode, setMode] = useState<HRMode | null>(null);
    const [queryId, setQueryId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: 'success', title: '', content: '' });

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

    const searchParams = useSearchParams();

    useEffect(() => {
        const sid = searchParams.get('authSessionId');
        const sName = searchParams.get('supervisorName');
        const sAgcode = searchParams.get('supervisorAgcode');
        if (sName && sAgcode) {
            setSupervisorInfo({ supervisorName: sName, supervisorAgcode: sAgcode });
            setStep('SELECT_MODE');
        }
    }, [searchParams]);

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
    }, [isPolling, authSessionId, authPhase]);

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

    return (
        <div className="hr-wrap">
            <header className="hr-header-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                <h1>資料異動申請</h1>
                {supervisorInfo.supervisorName && (
                    <div style={{ position: 'absolute', right: 24, fontSize: '0.85rem', color: '#86868b', display: 'flex', alignItems: 'center', gap: 6, background: '#f5f5f7', padding: '6px 12px', borderRadius: 20 }}>
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: '#34C759' }} />
                        操作者：{supervisorInfo.supervisorName}
                    </div>
                )}
            </header>

            <main className="hr-main">
                {isLoading && (
                    <div className="hr-fullscreen-loader">
                        <IconLoader2 size={48} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} />
                        <p>處理中，請稍候...</p>
                    </div>
                )}

                {step === 'ENTRY_QR' && (
                    <div className="hr-auth-card anim-fade-up">
                        <div className="hr-auth-icon" style={{ background: 'rgba(0,122,255,0.08)' }}>
                            <IconQrcode size={40} color="#007aff" />
                        </div>
                        <h2>主管授權進入</h2>
                        <p style={{ color: '#86868b', marginBottom: 32 }}>請主管掃描 QR Code 授權開啟管理介面</p>
                        <button className="hr-btn hr-btn-primary" style={{ padding: '16px 40px', borderRadius: 16 }} onClick={() => startQrAuth('ENTRY')}>
                            產生授權 QR Code
                        </button>
                    </div>
                )}

                {step === 'AUTH_QR' && (
                    <div className="hr-auth-card anim-fade-up">
                        <h2 style={{ marginBottom: 24 }}>身份驗證</h2>
                        <div style={{ padding: 16, background: 'white', borderRadius: 20, display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', border: '1px solid #f2f2f7' }}>
                            <QRCodeSVG value={`${window.location.origin}/hr/authorize?id=${authSessionId}`} size={200} />
                        </div>
                        <p style={{ marginTop: 24, color: '#86868b' }}>驗證完成後將自動跳轉</p>
                        <button className="hr-btn hr-btn-ghost" style={{ marginTop: 24 }} onClick={() => { setIsPolling(false); setStep('ENTRY_QR'); }}>
                            取消
                        </button>
                    </div>
                )}

                {step === 'SELECT_MODE' && (
                    <div className="anim-fade-up">
                        <div style={{ textAlign: 'center', marginBottom: 40 }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>請選擇異動類型</h2>
                            <p style={{ color: '#86868b' }}>根據人員目前的身份選擇對應的操作</p>
                        </div>
                        <div className="hr-mode-grid">
                            <button className="hr-mode-card" onClick={() => { setMode('candidate'); setStep('FILL_FORM'); }}>
                                <div className="hr-mode-icon" style={{ background: '#5856D6' }}><IconUserPlus color="white" /></div>
                                準增員登錄
                            </button>
                            <button className="hr-mode-card" onClick={() => { setMode('upgrade'); setStep('QUERY_ID'); }}>
                                <div className="hr-mode-icon" style={{ background: '#FF9500' }}><IconUserCheck color="white" /></div>
                                準增員轉正(升職)
                            </button>
                            <button className="hr-mode-card" onClick={() => { setMode('update'); setStep('QUERY_ID'); }}>
                                <div className="hr-mode-icon" style={{ background: '#007AFF' }}><IconUserEdit color="white" /></div>
                                資料修改 (現職同仁)
                            </button>
                            <button className="hr-mode-card" onClick={() => { setMode('delete'); setStep('QUERY_ID'); }}>
                                <div className="hr-mode-icon" style={{ background: '#FF3B30' }}><IconTrash color="white" /></div>
                                撤銷登錄 / 刪除
                            </button>
                        </div>
                    </div>
                )}

                {step === 'QUERY_ID' && (
                    <div className="hr-auth-card anim-fade-up" style={{ maxWidth: 400 }}>
                        <h2 style={{ marginBottom: 12 }}>身分確認</h2>
                        <p style={{ color: '#86868b', marginBottom: 24 }}>請輸入要異動人員的「業務代號」或「身分證字號」</p>
                        <div style={{ position: 'relative', marginBottom: 20 }}>
                            <input
                                className="hr-form-input"
                                style={{ paddingRight: 40, height: 52 }}
                                placeholder="AGCODE 或 身分證"
                                value={queryId}
                                onChange={e => setQueryId(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            <div style={{ position: 'absolute', right: 12, top: 14 }}>
                                <IconSearch size={22} color="#86868b" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="hr-btn hr-btn-ghost" style={{ flex: 1 }} onClick={() => setStep('SELECT_MODE')}>返回</button>
                            <button className="hr-btn hr-btn-primary" style={{ flex: 1.5 }} onClick={() => loadProfile(queryId)}>執行查詢</button>
                        </div>
                    </div>
                )}

                {(step === 'FILL_FORM' || step === 'REVIEW') && (
                    <div className="hr-form-card anim-fade-up">
                        <div className="hr-form-top-bar">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <IconUserEdit color="#007aff" />
                                {mode === 'candidate' && '準增員登錄'}
                                {mode === 'upgrade' && '準增員轉正'}
                                {mode === 'update' && '資料修改'}
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

                            <div className="hr-section-title">教育背景</div>
                            <div className="hr-grid-2">
                                {fi('學歷', 'eduLevel')}
                                {fi('學校', 'eduSchool')}
                            </div>

                            <div className="hr-section-title">證照持有</div>
                            <div className="hr-grid-3">
                                {fi('職業道德', 'certEthics')}
                                {fi('人身保險', 'certLife')}
                                {fi('財產保險', 'certProperty')}
                                {fi('外幣保險', 'certForeign')}
                                {fi('投資型', 'certInvestment')}
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

                            <div className="hr-form-actions">
                                {step === 'FILL_FORM' ? (
                                    <>
                                        <button className="hr-btn hr-btn-ghost" onClick={() => setStep(mode === 'candidate' ? 'SELECT_MODE' : 'QUERY_ID')}>取消</button>
                                        <button className="hr-btn hr-btn-primary" onClick={() => setStep('REVIEW')}>下一步 →</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="hr-btn hr-btn-ghost" onClick={() => setStep('FILL_FORM')}>← 返回修改</button>
                                        <button className="hr-btn hr-btn-primary" style={{ background: '#34C759' }} onClick={() => startQrAuth('SUBMIT')}>
                                            <IconShieldCheck size={18} style={{ marginRight: 6 }} /> 確認並執行異動
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'STATUS' && (
                    <div className="hr-status-screen anim-fade-up">
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
                .hr-mode-card { background: white; border: none; border-radius: 20px; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 12px; cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.06); font-size: 1.1rem; font-weight: 700; color: #1d1d1f; border: 1px solid transparent; }
                .hr-mode-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 25px 50px rgba(0,122,255,0.15); border: 1px solid rgba(0,122,255,0.1); }
                .hr-mode-card:active { transform: translateY(-4px) scale(0.98); }
                .hr-mode-icon { width: 64px; height: 64px; border-radius: 18px; display: flex; align-items: center; justify-content: center; transform: transition 0.4s; }
                .hr-mode-card:hover .hr-mode-icon { transform: rotate(10deg); }

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
                
                .hr-btn { padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.97rem; cursor: pointer; border: none; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: inline-flex; align-items: center; justify-content: center; }
                .hr-btn-primary { background: #007aff; color: white; }
                .hr-btn-primary:hover { background: #0062cc; transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,122,255,0.2); }
                .hr-btn-ghost { background: #F2F2F7; color: #1d1d1f; }
                .hr-btn-ghost:hover { background: #e5e5e7; }

                .hr-step-pill { padding: 4px 12px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; background: #f2f2f7; color: #86868b; transition: all 0.3s; }
                .hr-step-pill.active { background: #007aff; color: white; transform: scale(1.05); }

                .hr-fullscreen-loader { position: fixed; inset: 0; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); z-index: 1000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
                .hr-fullscreen-loader p { font-weight: 600; color: #1d1d1f; }

                .hr-status-screen { text-align: center; padding: 60px 20px; }
                .hr-status-icon { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 28px; }
                .hr-status-icon.success { background: #34C759; box-shadow: 0 10px 30px rgba(52,199,89,0.3); }
                .hr-status-icon.error { background: #FF3B30; box-shadow: 0 10px 30px rgba(255,59,48,0.3); }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeUp { 
                    from { opacity: 0; transform: translateY(30px); filter: blur(4px); } 
                    to { opacity: 1; transform: translateY(0); filter: blur(0); } 
                }
                .anim-fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }

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

export default function HRPage() {
    return (
        <Suspense fallback={<div className="hr-fullscreen-loader"><IconLoader2 size={48} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} /><p>正在準備介面...</p></div>}>
            <HRPageContent />
        </Suspense>
    );
}
