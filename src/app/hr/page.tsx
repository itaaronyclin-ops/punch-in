'use client';

import { useState, useEffect } from 'react';
import { HRProfile } from '@/lib/gas-client';
import { toast } from '@/components/GlobalUI';
import { IconAlertTriangle, IconCheckCircle, IconChevronRight, IconLogo, IconRun, IconRefreshCw, IconTrash, IconPlus, LoadingState } from '@/components/Icons';

export default function HRPage() {
    const [step, setStep] = useState<'AUTH_1' | 'SELECT_MODE' | 'FILL_FORM' | 'REVIEW' | 'AUTH_2'>('AUTH_1');
    const [mode, setMode] = useState<'candidate' | 'agent' | 'upgrade' | 'update' | 'delete'>('candidate');
    
    const [superAgcode, setSuperAgcode] = useState('');
    const [superName, setSuperName] = useState('');
    const [loading, setLoading] = useState(false);

    // Form data
    const [form, setForm] = useState<HRProfile>({});

    const handleAuth1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/member?agcode=${superAgcode.toUpperCase().trim()}`);
            const data = await res.json();
            if (res.ok && data.member) {
                setSuperName(data.member.name);
                setForm(f => ({ ...f, supervisor: superAgcode.toUpperCase().trim() }));
                setStep('SELECT_MODE');
            } else {
                toast.error(data.error || '查無此主管代號');
            }
        } catch {
            toast.error('系統錯誤，請重試');
        } finally {
            setLoading(false);
        }
    };

    const loadProfile = async (agcodeOrIdcard: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr?q=${agcodeOrIdcard}`);
            const data = await res.json();
            if (res.ok && data.profile) {
                setForm(prev => ({ ...prev, ...data.profile, oldAgcode: data.profile.agcode }));
                toast.success('已載入現有人員資料');
            } else {
                toast.error('查無此人員資料');
            }
        } catch {
            toast.error('查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleModeSelect = (m: typeof mode) => {
        setMode(m);
        setForm({ supervisor: superAgcode.toUpperCase().trim(), actionStatus: m });
        if (m === 'upgrade' || m === 'update' || m === 'delete') {
            const id = prompt('請輸入要查詢的身分證字號或業務代號：');
            if (id) {
                loadProfile(id);
                setStep('FILL_FORM');
            }
        } else {
            setStep('FILL_FORM');
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'delete') {
            return setStep('REVIEW');
        }
        if (!form.name || !form.idcard) return toast.error('必填欄位（姓名、身分證）不可為空');
        if (mode === 'upgrade' || mode === 'agent') {
            if (!form.agcode) return toast.error('必須輸入業務代號');
        }
        setStep('REVIEW');
    };

    const handleAuth2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/member?agcode=${superAgcode.toUpperCase().trim()}`);
            const data = await res.json();
            if (res.ok && data.member && data.member.name === superName) {
                const saveRes = await fetch('/api/hr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, actionStatus: mode })
                });
                const saveData = await saveRes.json();
                if (saveRes.ok && saveData.success) {
                    toast.success(mode === 'delete' ? '帳號已成功撤銷' : '資料已成功儲存');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    toast.error(saveData.error || '儲存失敗');
                }
            } else {
                toast.error('主管代號驗證錯誤');
            }
        } catch {
            toast.error('系統錯誤');
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label: string, field: keyof HRProfile, type = 'text', required = false) => (
        <div className="form-group">
            <label className="form-label">{label} {required && <span style={{color: '#FF3B30'}}>*</span>}</label>
            <input 
                type={type} 
                className="form-input" 
                value={(form[field] as string) || ''} 
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                required={required}
                disabled={step === 'REVIEW' || step === 'AUTH_2' || mode === 'delete'}
            />
        </div>
    );

    return (
        <div className="hr-system-container">
            {loading && (
                <div className="global-loader-overlay">
                    <LoadingState label="處理中，請稍候..." />
                </div>
            )}

            <div className="hr-header">
                <div className="hr-header-content">
                    <div className="hr-brand">
                        <IconLogo size={28} color="var(--blue)" />
                        <span className="hr-title">人事資料異動系統 (iPad 橫向適配)</span>
                    </div>
                    {superName && (
                        <div className="hr-badge-supervisor">
                            授權主管：{superName} ({superAgcode.toUpperCase()})
                        </div>
                    )}
                </div>
            </div>

            <div className="hr-main-viewport">
                <div className="hr-form-wrapper">
                    
                    {step === 'AUTH_1' && (
                        <div className="auth-card">
                            <div className="auth-icon-circle">
                                <IconAlertTriangle size={32} color="var(--blue)" />
                            </div>
                            <h2>主管授權解鎖</h2>
                            <p>請輸入您的業務代號以開始人事作業</p>
                            <form onSubmit={handleAuth1}>
                                <input 
                                    className="form-input auth-large-input" 
                                    placeholder="輸入主管 AGCODE"
                                    value={superAgcode}
                                    onChange={e => setSuperAgcode(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" className="btn btn-primary btn-large" disabled={loading || !superAgcode}>
                                    驗證身分
                                </button>
                            </form>
                        </div>
                    )}

                    {step === 'SELECT_MODE' && (
                        <div className="mode-selection-view">
                            <h2 className="section-title">請選擇異動型態</h2>
                            <div className="mode-grid">
                                <div className="mode-option" onClick={() => handleModeSelect('candidate')}>
                                    <div className="mode-icon"><IconPlus size={32} /></div>
                                    <h3>準增員建檔</h3>
                                    <p>建立新進人員基礎資料</p>
                                </div>
                                <div className="mode-option" onClick={() => handleModeSelect('agent')}>
                                    <div className="mode-icon"><IconRun size={32} /></div>
                                    <h3>新進業務員建檔</h3>
                                    <p>直接建立具備代號的人員</p>
                                </div>
                                <div className="mode-option" onClick={() => handleModeSelect('upgrade')}>
                                    <div className="mode-icon"><IconChevronRight size={32} /></div>
                                    <h3>準增員轉業務員</h3>
                                    <p>新人升級並沿用打卡紀錄</p>
                                </div>
                                <div className="mode-option" onClick={() => handleModeSelect('update')}>
                                    <div className="mode-icon"><IconRefreshCw size={32} /></div>
                                    <h3>人事資料變更</h3>
                                    <p>修改電話、地址或證照資訊</p>
                                </div>
                                <div className="mode-option mode-option-danger" onClick={() => handleModeSelect('delete')}>
                                    <div className="mode-icon"><IconTrash size={32} color="#FF3B30" /></div>
                                    <h3 style={{color: '#FF3B30'}}>撤銷登錄 / 刪除申請</h3>
                                    <p>移除特定人員及其系統權限</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {(step === 'FILL_FORM' || step === 'REVIEW' || step === 'AUTH_2') && (
                        <div className="full-form-view">
                            <div className="form-header">
                                <div>
                                    <h2 className="form-type-title">
                                        {mode === 'candidate' && '準增員建檔作業'}
                                        {mode === 'agent' && '新進業務員建檔作業'}
                                        {mode === 'upgrade' && '準增員升級作業'}
                                        {mode === 'update' && '人事資料變更作業'}
                                        {mode === 'delete' && '撤銷登錄 / 刪除申請'}
                                    </h2>
                                    <div className="form-step-indicators">
                                        <div className={`step-dot ${step === 'FILL_FORM' ? 'active' : ''}`}>1. 填寫</div>
                                        <div className="step-line" />
                                        <div className={`step-dot ${step === 'REVIEW' ? 'active' : ''}`}>2. 校對</div>
                                        <div className="step-line" />
                                        <div className={`step-dot ${step === 'AUTH_2' ? 'active' : ''}`}>3. 授權</div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleFormSubmit} className="scrollable-form-content">
                                <div className="form-section-head">基本身分資訊</div>
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

                                <div className="form-section-head">緊急聯絡資訊</div>
                                <div className="input-grid-3">
                                    {renderInput('聯絡人姓名', 'emgName')}
                                    {renderInput('關係', 'emgRelation')}
                                    {renderInput('聯絡電話', 'emgPhone')}
                                </div>

                                {(mode === 'agent' || mode === 'upgrade' || mode === 'update') && (
                                    <>
                                        <div className="form-section-head highlight-gold">業務人員系統配置</div>
                                        <div className="config-box">
                                            <div className="input-grid-3">
                                                {renderInput('業務代號 (AGCODE)', 'agcode', 'text', true)}
                                                {renderInput('所屬組別', 'groupName')}
                                                {mode === 'update' ? renderInput('職級名稱', 'rank') : <div />}
                                            </div>
                                            <div className="divider-gold" />
                                            <div className="input-grid-2">
                                                {renderInput('金融市場與倫理道德', 'certEthics')}
                                                {renderInput('壽險合格證號', 'certLife')}
                                                {renderInput('產險合格證號', 'certProperty')}
                                                {renderInput('外幣合格證號', 'certForeign')}
                                                {renderInput('投資型合格證號', 'certInvestment')}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {mode === 'delete' && (
                                    <div className="danger-alert-box">
                                        <IconAlertTriangle color="#FF3B30" />
                                        <div>
                                            <strong>確認撤銷此帳號？</strong>
                                            <p>此操作將移除該人員的登錄資訊，該代號將無法再次登入系統。</p>
                                        </div>
                                    </div>
                                )}

                                <div className="footer-actions">
                                    {step === 'FILL_FORM' && (
                                        <>
                                            <button type="button" className="btn btn-ghost" onClick={() => setStep('SELECT_MODE')}>返回上一頁</button>
                                            <button type="submit" className="btn btn-primary">{mode === 'delete' ? '確認刪除對象' : '進入校對模式'}</button>
                                        </>
                                    )}
                                    {step === 'REVIEW' && (
                                        <>
                                            <button type="button" className="btn btn-ghost" onClick={() => setStep('FILL_FORM')}>回頭修改</button>
                                            <button type="button" className="btn btn-success" onClick={() => setStep('AUTH_2')}>資料無誤，主管送出</button>
                                        </>
                                    )}
                                </div>
                            </form>

                            {step === 'AUTH_2' && (
                                <div className="final-auth-overlay">
                                    <div className="final-auth-modal">
                                        <h3>最終主管電子簽章</h3>
                                        <p>請主管 <strong>{superName}</strong> ({superAgcode.toUpperCase()}) 再次驗證身分以完成本案：</p>
                                        <form onSubmit={handleAuth2} className="auth-row">
                                            <input 
                                                className="form-input" 
                                                placeholder="輸入 AGCODE"
                                                value={superAgcode}
                                                onChange={e => setSuperAgcode(e.target.value)}
                                                autoFocus
                                            />
                                            <button type="submit" className="btn btn-danger" disabled={loading}>
                                                確認授權
                                            </button>
                                            <button type="button" className="btn btn-ghost" onClick={() => setStep('REVIEW')}>取消</button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .hr-system-container {
                    background: #F2F2F7;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .global-loader-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(255,255,255,0.8);
                    backdrop-filter: blur(4px);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .hr-header {
                    background: #FFF;
                    border-bottom: 1px solid #D1D1D6;
                    padding: 16px 24px;
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .hr-header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .hr-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .hr-title {
                    font-size: 1.25rem;
                    fontWeight: 600;
                    letter-spacing: -0.02em;
                }
                .hr-badge-supervisor {
                    background: var(--blue-muted);
                    color: var(--blue);
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .hr-main-viewport {
                    flex: 1;
                    padding: 40px 24px;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .hr-form-wrapper {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .auth-card {
                    background: #FFF;
                    border-radius: 20px;
                    padding: 48px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                    max-width: 480px;
                    margin: 60px auto;
                }
                .auth-icon-circle {
                    width: 72px;
                    height: 72px;
                    background: var(--blue-muted);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                }
                .auth-card h2 { font-size: 1.7rem; margin-bottom: 8px; }
                .auth-card p { color: #8E8E93; margin-bottom: 32px; }
                .auth-large-input { text-align: center; font-size: 1.5rem; letter-spacing: 4px; height: 60px; margin-bottom: 20px; }
                
                .mode-selection-view { width: 100%; }
                .section-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 32px; text-align: center; color: #1C1C1E; }
                .mode-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
                .mode-option {
                    background: #FFF;
                    border-radius: 20px;
                    padding: 32px 24px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.1, 0.7, 0.1, 1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .mode-option:active { transform: scale(0.96); }
                .mode-icon { margin-bottom: 16px; color: var(--blue); }
                .mode-option h3 { font-size: 1.2rem; margin-bottom: 8px; }
                .mode-option p { font-size: 0.9rem; color: #8E8E93; }
                .mode-option-danger:hover { background: #FFF5F5; }

                .full-form-view {
                    background: #FFF;
                    border-radius: 24px;
                    box-shadow: 0 12px 40px rgba(0,0,0,0.08);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .form-header { padding: 32px 40px; border-bottom: 1px solid #E5E5E7; background: #FAFAFA; }
                .form-type-title { font-size: 1.8rem; font-weight: 800; color: #1C1C1E; }
                .form-step-indicators { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
                .step-dot { font-size: 0.85rem; font-weight: 600; color: #8E8E93; }
                .step-dot.active { color: var(--blue); }
                .step-line { width: 40px; height: 1px; background: #D1D1D6; }

                .scrollable-form-content { padding: 40px; max-height: 70vh; overflow-y: auto; }
                .form-section-head { font-size: 1.1rem; font-weight: 700; color: #1C1C1E; margin-bottom: 20px; padding-left: 12px; border-left: 4px solid var(--blue); }
                .form-section-head.highlight-gold { border-left-color: #FF9500; color: #D67F00; margin-top: 48px; }
                
                .input-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 32px; margin-bottom: 40px; }
                .input-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px 20px; }
                .grid-full { grid-column: 1 / -1; }

                .config-box { background: #FDF8F0; border: 1px solid #FCE4B6; border-radius: 16px; padding: 24px; }
                .divider-gold { height: 1px; background: #FCE4B6; margin: 24px 0; }
                
                .danger-alert-box { background: #FFF5F5; border: 1px solid #FFD1D1; padding: 20px; border-radius: 12px; display: flex; gap: 16px; margin-bottom: 32px; }
                .danger-alert-box strong { color: #FF3B30; display: block; margin-bottom: 4px; }

                .footer-actions { display: flex; justify-content: flex-end; gap: 16px; margin-top: 40px; padding-top: 24px; border-top: 1px solid #E5E5E7; }
                
                .final-auth-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .final-auth-modal { background: #FFF; border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); text-align: center; }
                .final-auth-modal h3 { font-size: 1.6rem; margin-bottom: 12px; color: #FF3B30; }
                .auth-row { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
                
                .btn-large { height: 56px; font-size: 1.1rem; width: 100%; border-radius: 14px; }
                .btn-success { background: #34C759; color: #fff; }
                .btn-danger { background: #FF3B30; color: #fff; }
            `}</style>
        </div>
    );
}
