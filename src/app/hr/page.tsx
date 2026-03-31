'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
    IconUserPlus, IconUserEdit, IconUserCheck, IconTrash, 
    IconChevronRight, IconArrowLeft, IconCheck, IconAlertTriangle,
    IconQrcode, IconLoader2, IconSearch, IconX, IconCamera
} from '@tabler/icons-react';
import QRScanner from '@/components/QRScanner';

type HRMode = 'candidate' | 'agent' | 'upgrade' | 'update' | 'delete';
type HRStep = 'SELECT_MODE' | 'QUERY_ID' | 'FILL_FORM' | 'REVIEW' | 'AUTH_QR' | 'STATUS';

export default function HRPage() {
    // --- State ---
    const [step, setStep] = useState<HRStep>('SELECT_MODE');
    const [mode, setMode] = useState<HRMode | null>(null);
    const [queryId, setQueryId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: 'success', title: '', content: '' });
    const [showScanner, setShowScanner] = useState(false);
    
    // Auth Session
    const [authSessionId, setAuthSessionId] = useState('');
    const [isPolling, setIsPolling] = useState(false);
    const [authPhase, setAuthPhase] = useState<'LOGIN' | 'SUBMIT' | null>(null);
    
    // Form Data
    const [formData, setFormData] = useState<any>({
        idcard: '',
        agcode: '',
        name: '',
        birthday: '',
        gender: '',
        phone: '',
        email: '',
        addressContact: '',
        addressResident: '',
        emgName: '',
        emgRelation: '',
        emgPhone: '',
        eduLevel: '',
        eduSchool: '',
        prevIndustry: '',
        prevJob: '',
        groupName: '',
        certEthics: '',
        certLife: '',
        certProperty: '',
        certForeign: '',
        certInvestment: '',
        rank: '',
        supervisorAgcode: '',
        supervisorName: '',
    });

    const pollInterval = useRef<any>(null);

    // --- Mode Selection ---
    const selectMode = (m: HRMode) => {
        setMode(m);
        if (m === 'candidate') {
            setFormData({ ...formData, agcode: '', idcard: '' });
            setStep('FILL_FORM');
        } else {
            // Need authorization to enter QUERY or proceed
            startQrAuth('LOGIN');
        }
    };

    // --- Data Loading ---
    const loadProfile = async (id: string) => {
        if (!id) return toast('請輸入代號或身分證', 'error');
        setIsLoading(true);
        try {
            const res = await fetch(`/api/hr?q=${id}`);
            const data = await res.json();
            if (data.profile) {
                setFormData({ ...formData, ...data.profile });
                setStep('FILL_FORM');
            } else {
                toast('查無資料', 'error');
            }
        } catch (err) {
            toast('讀取失敗', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- QR Auth Logic ---
    const startQrAuth = async (phase: 'LOGIN' | 'SUBMIT') => {
        const sid = 'hr-' + Math.random().toString(36).substring(2, 11);
        setAuthSessionId(sid);
        setAuthPhase(phase);
        setIsLoading(true);
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'createAuthSession', id: sid })
            });
            const data = await res.json();
            if (data.success) {
                setStep('AUTH_QR');
                setIsPolling(true);
            } else {
                toast('無法啟動驗證', 'error');
            }
        } catch (err) {
            toast('網路連線失敗', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isPolling && authSessionId) {
            pollInterval.current = setInterval(async () => {
                try {
                    const res = await fetch(`/api/hr/auth?id=${authSessionId}`);
                    const data = await res.json();
                    if (data.session && data.session.status === 'approved') {
                        clearInterval(pollInterval.current);
                        setIsPolling(false);
                        const supervisorInfo = {
                            supervisorAgcode: data.session.supervisoragcode,
                            supervisorName: data.session.supervisorname
                        };
                        
                        if (authPhase === 'LOGIN') {
                            setStep('QUERY_ID');
                        } else if (authPhase === 'SUBMIT') {
                             setFormData(p => ({ ...p, ...supervisorInfo }));
                             submitFinal();
                        }
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 3000);
        }
        return () => clearInterval(pollInterval.current);
    }, [isPolling, authSessionId, authPhase]);

    const submitFinal = async () => {
        setIsLoading(true);
        try {
            const body = {
                ...formData,
                actionStatus: mode,
                oldAgcode: queryId || formData.agcode
            };
            const res = await fetch('/api/hr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                setStatusMsg({
                    type: 'success',
                    title: '提交成功',
                    content: '人事資料異動申請已完成處理。'
                });
                setStep('STATUS');
            } else {
                toast(data.error || '提交失敗', 'error');
            }
        } catch (err) {
            toast('伺服器無回應', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- UI Helpers ---
    const toast = (msg: string, type: 'success' | 'error' = 'success') => {
        alert(msg); // Placeholder for better toast UI
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const renderInput = (label: string, name: string, type = 'text', required = false) => (
        <div className="input-group">
            <label>{label} {required && <span className="req">*</span>}</label>
            <input 
                name={name}
                type={type}
                className="form-input"
                value={formData[name] || ''}
                onChange={handleInputChange}
                readOnly={step === 'REVIEW'}
            />
        </div>
    );

    // --- Main Render ---
    return (
        <div className="hr-container">
            <header className="hr-header">
                <h1>資料異動申請</h1>
                <div className="header-decoration" />
            </header>

            <main className="hr-content">
                {isLoading && (
                    <div className="fullscreen-loader">
                        <div className="loader-inner">
                            <IconLoader2 className="spin" size={48} color="#007aff" />
                            <p>處理中，請稍候...</p>
                        </div>
                    </div>
                )}

                {step === 'SELECT_MODE' && (
                    <div className="mode-grid">
                        <button className="mode-card" onClick={() => selectMode('candidate')}>
                            <div className="m-icon" style={{ background: '#E3F2FD' }}><IconUserPlus color="#2196F3" /></div>
                            <h3>準增員建檔</h3>
                        </button>
                        <button className="mode-card" onClick={() => selectMode('agent')}>
                            <div className="m-icon" style={{ background: '#E8F5E9' }}><IconUserCheck color="#4CAF50" /></div>
                            <h3>新進業務員建檔</h3>
                        </button>
                        <button className="mode-card" onClick={() => selectMode('upgrade')}>
                            <div className="m-icon" style={{ background: '#FFF3E0' }}><IconUserEdit color="#FF9800" /></div>
                            <h3>準增員升級</h3>
                        </button>
                        <button className="mode-card" onClick={() => selectMode('update')}>
                            <div className="m-icon" style={{ background: '#F3E5F5' }}><IconSearch color="#9C27B0" /></div>
                            <h3>資料變更</h3>
                        </button>
                        <button className="mode-card danger" onClick={() => selectMode('delete')}>
                            <div className="m-icon" style={{ background: '#FFEBEE' }}><IconTrash color="#F44336" /></div>
                            <h3>撤銷登錄 / 刪除</h3>
                        </button>
                    </div>
                )}

                {step === 'QUERY_ID' && (
                    <div className="auth-card">
                        <div className="auth-icon-circle"><IconSearch size={32} color="var(--blue)" /></div>
                        <h2>人員查詢</h2>
                        <p>請輸入要變更對象的身分證或業務代號</p>
                        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                            <input 
                                className="form-input" 
                                style={{ flex: 1 }}
                                placeholder="身分證 / AGCODE"
                                value={queryId}
                                onChange={e => setQueryId(e.target.value.toUpperCase())}
                                autoFocus
                            />
                            <button className="btn btn-primary" onClick={() => loadProfile(queryId)}>搜尋</button>
                            <button className="btn btn-ghost" style={{ padding: '0 16px' }} onClick={() => setShowScanner(true)}>
                                <IconCamera size={20} />
                            </button>
                        </div>
                        <button className="btn btn-ghost" style={{ marginTop: 20 }} onClick={() => setStep('SELECT_MODE')}>返回</button>
                    </div>
                )}

                {showScanner && (
                    <QRScanner 
                        onScan={(val) => {
                            setQueryId(val.toUpperCase());
                            setShowScanner(false);
                            loadProfile(val);
                        }}
                        onClose={() => setShowScanner(false)}
                    />
                )}


                {(step === 'FILL_FORM' || step === 'REVIEW') && (
                    <div className="full-form-view">
                        <div className="form-header">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="form-type-title">
                                    {mode === 'candidate' && '準增員建檔'}
                                    {mode === 'agent' && '新進業務員建檔'}
                                    {mode === 'upgrade' && '準增員升級'}
                                    {mode === 'update' && '人事資料變更'}
                                    {mode === 'delete' && '撤銷登錄 / 刪除'}
                                </h2>
                                <div className="form-step-indicators">
                                    <div className={`step-dot ${step === 'FILL_FORM' ? 'active' : ''}`}>1. 填寫</div>
                                    <div className="step-line" />
                                    <div className={`step-dot ${step === 'REVIEW' ? 'active' : ''}`}>2. 校對</div>
                                </div>
                            </div>
                        </div>

                        <div className="scrollable-form-content">
                            <div className="form-section-head">基本身分</div>
                            <div className="input-grid-2">
                                {renderInput('身分證字號', 'idcard', 'text', true)}
                                {renderInput('姓名', 'name', 'text', true)}
                                {renderInput('出生年月日', 'birthday', 'date')}
                                {renderInput('性別', 'gender')}
                            </div>

                            <div className="form-section-head">聯繫資訊</div>
                            <div className="input-grid-2">
                                {renderInput('手機號碼', 'phone')}
                                {renderInput('電子郵件', 'email', 'email')}
                                <div className="grid-full">{renderInput('通訊地址', 'addressContact')}</div>
                                <div className="grid-full">{renderInput('戶籍地址', 'addressResident')}</div>
                            </div>

                            {(mode === 'agent' || mode === 'upgrade' || mode === 'update') && (
                                <>
                                    <div className="form-section-head highlight-gold">系統配置</div>
                                    <div className="config-box">
                                        <div className="input-grid-3">
                                            {renderInput('業務代號', 'agcode', 'text', true)}
                                            {renderInput('組別', 'groupName')}
                                            {renderInput('職級', 'rank')}
                                        </div>
                                    </div>
                                </>
                            )}
                            
                            {mode === 'delete' && (
                                <div className="danger-alert-box">
                                    <IconAlertTriangle color="#FF3B30" />
                                    <div>
                                        <strong>確認撤銷此帳號？</strong>
                                        <p>此操作將永久移除該人員在系統中的所有登錄資訊。</p>
                                    </div>
                                </div>
                            )}

                            <div className="footer-actions">
                                {step === 'FILL_FORM' ? (
                                    <>
                                        <button className="btn btn-ghost" onClick={() => setStep('SELECT_MODE')}>取消</button>
                                        <button className="btn btn-primary" onClick={() => setStep('REVIEW')}>下一步</button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-ghost" onClick={() => setStep('FILL_FORM')}>回上一步</button>
                                        <button className="btn btn-primary" onClick={() => startQrAuth('SUBMIT')}>主管掃碼核准提交</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'AUTH_QR' && (
                    <div className="auth-card qr-card">
                        <div className="qr-container">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(window.location.origin + '/hr/authorize?id=' + authSessionId)}&size=240x240`} 
                                alt="QR Auth"
                            />
                        </div>
                        <h2>主管驗證</h2>
                        <p>請主管開啟業務端首頁掃描此 QR Code</p>
                        
                        <div className="polling-status">
                            <IconLoader2 className="spin" size={18} />
                            <span>等待授權中...</span>
                        </div>
                        
                        <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={() => { setStep('REVIEW'); setIsPolling(false); }}>返回修改</button>
                    </div>
                )}

                {step === 'STATUS' && (
                    <div className="status-screen">
                        <div className={`status-icon-circle ${statusMsg.type}`}>
                            {statusMsg.type === 'success' ? <IconCheck size={48} color="white" /> : <IconX size={48} color="white" />}
                        </div>
                        <h2>{statusMsg.title}</h2>
                        <p>{statusMsg.content}</p>
                        <button className="btn btn-primary" style={{ marginTop: 32, padding: '16px 48px' }} onClick={() => window.location.reload()}>返回首頁</button>
                    </div>
                )}
            </main>

            <style jsx>{`
                .hr-container {
                    min-height: 100vh;
                    background: #F2F2F7;
                    padding: 40px 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .hr-header {
                    max-width: 900px;
                    margin: 0 auto 32px;
                    text-align: center;
                }
                .hr-header h1 {
                    font-size: 2.2rem;
                    font-weight: 800;
                    letter-spacing: -0.04em;
                    color: #1d1d1f;
                }
                .hr-content {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .mode-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 20px;
                }
                .mode-card {
                    background: white;
                    border: none;
                    border-radius: 24px;
                    padding: 32px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .mode-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
                .mode-card.danger:hover { background: #FFF5F5; }
                .m-icon {
                    width: 60px;
                    height: 60px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .mode-card h3 { font-size: 1.1rem; font-weight: 600; color: #1d1d1f; }
                
                .full-form-view { background: white; border-radius: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); overflow: hidden; }
                .form-header { padding: 24px 32px; background: white; border-bottom: 1px solid #f2f2f7; position: sticky; top: 0; z-index: 10; }
                .scrollable-form-content { padding: 32px; max-height: 70vh; overflow-y: auto; }
                .form-section-head { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #007aff; display: inline-block; }
                .highlight-gold { border-bottom-color: #D4AF37; color: #B8860B; margin-top: 24px; }
                
                .input-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
                .input-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
                .grid-full { grid-column: span 2; }
                
                .input-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #86868b; margin-bottom: 8px; margin-left: 4px; }
                .req { color: #FF3B30; }
                .form-input { 
                    width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid #d2d2d7; 
                    background: #fbfbfd; font-size: 1rem; transition: all 0.2s;
                }
                .form-input:focus { border-color: #007aff; background: white; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); outline: none; }
                
                .config-box { background: #fafafa; border: 1px solid #eeeeee; border-radius: 16px; padding: 24px; }
                .footer-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #f2f2f7; }
                
                .btn { padding: 14px 28px; border-radius: 14px; font-weight: 600; font-size: 1rem; cursor: pointer; border: none; transition: all 0.2s; }
                .btn-primary { background: #007aff; color: white; }
                .btn-primary:hover { background: #0062cc; }
                .btn-ghost { background: #F2F2F7; color: #1d1d1f; }
                .btn-ghost:hover { background: #e5e5e7; }
                
                .auth-card { background: white; border-radius: 32px; padding: 48px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.1); width: 100%; max-width: 480px; margin: 0 auto; }
                .auth-icon-circle { width: 80px; height: 80px; background: rgba(0,122,255,0.06); border-radius: 40px; display: flex; alignItems: center; justifyContent: center; margin: 0 auto 24px; }
                .qr-container { padding: 20px; background: white; border: 1px solid #eee; border-radius: 20px; display: inline-block; margin-bottom: 24px; }
                .polling-status { display: flex; align-items: center; justify-content: center; gap: 8px; color: #86868b; margin-top: 16px; font-size: 0.9rem; }
                
                .fullscreen-loader { position: fixed; inset: 0; background: rgba(255,255,255,0.8); backdrop-filter: blur(10px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
                .loader-inner { text-align: center; }
                .loader-inner p { margin-top: 16px; font-weight: 600; color: #1d1d1f; }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .status-screen { text-align: center; padding: 60px 20px; }
                .status-icon-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 32px; }
                .status-icon-circle.success { background: #34C759; box-shadow: 0 10px 30px rgba(52,199,89,0.3); }
                .status-icon-circle.error { background: #FF3B30; box-shadow: 0 10px 30px rgba(255,59,48,0.3); }
                
                @media (max-width: 600px) {
                    .mode-grid { grid-template-columns: 1fr; }
                    .hr-container { padding: 20px 12px; }
                    .full-form-view { border-radius: 0; margin: -20px -12px; }
                }
            `}</style>
        </div>
    );
}
