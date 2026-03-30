'use client';

import { useState, useEffect } from 'react';
import { getMemberByAgcode } from '@/lib/gas-client';
import { getProfile, saveProfile, HRProfile } from '@/lib/gas-client';
import { toast, confirmDialog } from '@/components/GlobalUI';
import { IconAlertTriangle, IconCheckCircle, IconChevronRight, IconLogo } from '@/components/Icons';

export default function HRPage() {
    const [step, setStep] = useState<'AUTH_1' | 'SELECT_MODE' | 'FILL_FORM' | 'REVIEW' | 'AUTH_2'>('AUTH_1');
    const [mode, setMode] = useState<'candidate' | 'agent' | 'upgrade' | 'update'>('candidate');
    
    const [superAgcode, setSuperAgcode] = useState('');
    const [superName, setSuperName] = useState('');
    const [loading, setLoading] = useState(false);

    // Form data
    const [form, setForm] = useState<HRProfile>({});

    const handleAuth1 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const m = await getMemberByAgcode(superAgcode.toUpperCase().trim());
            if (m) {
                setSuperName(m.name);
                setForm(f => ({ ...f, supervisor: superAgcode.toUpperCase().trim() }));
                setStep('SELECT_MODE');
            } else {
                toast.error('查無此主管代號');
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
            const p = await getProfile(agcodeOrIdcard);
            if (p) {
                setForm(prev => ({ ...prev, ...p, oldAgcode: p.agcode }));
                toast.success('已載入現有資料');
            } else {
                toast.error('查無資料');
            }
        } catch {
            toast.error('查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const handleModeSelect = (m: typeof mode) => {
        setMode(m);
        setForm({ supervisor: superAgcode, actionStatus: m });
        if (m === 'upgrade' || m === 'update') {
            const id = prompt('請輸入要查詢的身分證字號或 AGCODE：');
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
        // Validation logic
        if (!form.name || !form.idcard) return toast.error('必填欄位（姓名、身分證）不可為空');
        if (mode === 'upgrade' || mode === 'agent') {
            if (!form.agcode) return toast.error('必須提供新進業務員的 AGCODE');
        }
        setStep('REVIEW');
    };

    const handleAuth2 = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const m = await getMemberByAgcode(superAgcode.toUpperCase().trim());
            if (m && m.name === superName) {
                // Submit to GAS
                const res = await saveProfile({ ...form, actionStatus: mode });
                if (res.success) {
                    toast.success('表單送出成功，系統已更新！');
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    toast.error(res.error || '儲存失敗');
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
            <label className="form-label">{label} {required && <span style={{color: 'red'}}>*</span>}</label>
            <input 
                type={type} 
                className="form-input" 
                value={(form[field] as string) || ''} 
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                required={required}
                disabled={step === 'REVIEW' || step === 'AUTH_2'}
            />
        </div>
    );

    return (
        <div style={{ background: 'var(--bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#fff', padding: '16px 24px', display: 'flex', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
                <IconLogo size={24} color="var(--blue)" />
                <h1 style={{ marginLeft: 12, fontSize: '1.2rem', fontWeight: 600 }}>人事基本資料庫 (HR Admin)</h1>
                {superName && <div style={{ marginLeft: 'auto', background: 'var(--blue-muted)', color: 'var(--blue)', padding: '4px 12px', borderRadius: 20, fontSize: '0.85rem' }}>授權主管: {superName}</div>}
            </div>

            <div style={{ maxWidth: 800, width: '100%', margin: '0 auto', padding: '32px 24px', flex: 1 }}>
                
                {step === 'AUTH_1' && (
                    <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 400, margin: '60px auto' }}>
                        <div style={{ background: 'var(--blue-muted)', width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconAlertTriangle size={32} color="var(--blue)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 8 }}>主管授權解鎖</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>請輸入主管 AGCODE 以解鎖人事系統編輯權限</p>
                        <form onSubmit={handleAuth1}>
                            <input 
                                className="form-input" 
                                style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: 2 }} 
                                placeholder="輸入主管 AGCODE"
                                value={superAgcode}
                                onChange={e => setSuperAgcode(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 16, height: 48 }} disabled={loading || !superAgcode}>
                                {loading ? <span className="spinner" /> : '驗證並解鎖'}
                            </button>
                        </form>
                    </div>
                )}

                {step === 'SELECT_MODE' && (
                    <div className="card" style={{ padding: 32 }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: 24, textAlign: 'center' }}>請選擇作業項目</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <button className="ios-card" style={{ textAlign: 'center', padding: 24 }} onClick={() => handleModeSelect('candidate')}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>👤</div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>準增員建檔</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>建立新人基本資料</div>
                            </button>
                            <button className="ios-card" style={{ textAlign: 'center', padding: 24 }} onClick={() => handleModeSelect('agent')}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>💼</div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>新進業務員建檔</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>直接建立業務員資料</div>
                            </button>
                            <button className="ios-card" style={{ textAlign: 'center', padding: 24 }} onClick={() => handleModeSelect('upgrade')}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✨</div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>準增員轉業務員</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>載入既有資料並升級配號</div>
                            </button>
                            <button className="ios-card" style={{ textAlign: 'center', padding: 24 }} onClick={() => handleModeSelect('update')}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✏️</div>
                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>現有資料變更</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>修改個資、職級、組別</div>
                            </button>
                        </div>
                    </div>
                )}

                {(step === 'FILL_FORM' || step === 'REVIEW' || step === 'AUTH_2') && (
                    <div className="card" style={{ padding: '32px 40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--line)', paddingBottom: 20, marginBottom: 24 }}>
                            <div>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>
                                    {mode === 'candidate' && '準增員建檔 (Candidate)'}
                                    {mode === 'agent' && '新進業務員建檔 (New Agent)'}
                                    {mode === 'upgrade' && '準增員升級表單 (Promotion)'}
                                    {mode === 'update' && '人事資料變更 (Update)'}
                                </h2>
                                {step === 'REVIEW' && <p style={{ color: 'var(--blue)', fontWeight: 600, marginTop: 4 }}>進入檢視模式：請確認資料是否正確</p>}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <span className={`member-pill ${step === 'FILL_FORM' ? 'active' : ''}`} style={step === 'FILL_FORM' ? {background: 'var(--blue)', color: '#fff'} : {}}>1. 編輯</span>
                                <span className={`member-pill ${step === 'REVIEW' ? 'active' : ''}`} style={step === 'REVIEW' ? {background: 'var(--blue)', color: '#fff'} : {}}>2. 檢視確認</span>
                                <span className={`member-pill ${step === 'AUTH_2' ? 'active' : ''}`} style={step === 'AUTH_2' ? {background: 'var(--blue)', color: '#fff'} : {}}>3. 主管送出</span>
                            </div>
                        </div>

                        <form onSubmit={handleFormSubmit}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: 16, color: 'var(--text-secondary)' }}>▍ 基本個資</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {renderInput('身分證字號', 'idcard', 'text', true)}
                                {renderInput('姓名', 'name', 'text', true)}
                                {renderInput('出生年月日', 'birthday', 'date')}
                                {renderInput('性別', 'gender')}
                            </div>

                            <h3 style={{ fontSize: '1.1rem', margin: '32px 0 16px', color: 'var(--text-secondary)' }}>▍ 聯絡方式</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {renderInput('手機號碼', 'phone')}
                                {renderInput('常用 Email', 'email', 'email')}
                                <div style={{ gridColumn: '1 / -1' }}>{renderInput('通訊地址', 'addressContact')}</div>
                                <div style={{ gridColumn: '1 / -1' }}>{renderInput('戶籍地址', 'addressResident')}</div>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', margin: '32px 0 16px', color: 'var(--text-secondary)' }}>▍ 緊急聯絡人</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                {renderInput('姓名', 'emgName')}
                                {renderInput('關係', 'emgRelation')}
                                {renderInput('聯絡電話', 'emgPhone')}
                            </div>

                            <h3 style={{ fontSize: '1.1rem', margin: '32px 0 16px', color: 'var(--text-secondary)' }}>▍ 學經歷</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                {renderInput('最高學歷 (校名/科系)', 'eduLevel')}
                                {renderInput('過往主要工作產業與職位', 'prevIndustry')}
                            </div>

                            {/* 業務員專屬欄位 */}
                            {(mode === 'agent' || mode === 'upgrade' || mode === 'update') && (
                                <>
                                    <h3 style={{ fontSize: '1.1rem', margin: '32px 0 16px', color: '#FF9500' }}>▍ 業務員專屬配置</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, background: 'rgba(255, 149, 0, 0.05)', padding: 16, borderRadius: 12 }}>
                                        {renderInput('AGCODE (業務代號)', 'agcode', 'text', true)}
                                        {renderInput('組別 (Group)', 'groupName')}
                                        {(mode === 'update') && renderInput('職級 (Rank)', 'rank')}
                                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255, 149, 0, 0.2)', paddingTop: 16, marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            {renderInput('金融市場與倫理道德證號/日期', 'certEthics')}
                                            {renderInput('壽險合格證號/日期', 'certLife')}
                                            {renderInput('產險合格證號/日期', 'certProperty')}
                                            {renderInput('外幣合格證號/日期', 'certForeign')}
                                            {renderInput('投資型合格證號/日期', 'certInvestment')}
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ marginTop: 40, display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
                                {step === 'FILL_FORM' && (
                                    <>
                                        <button type="button" className="btn btn-secondary" onClick={() => setStep('SELECT_MODE')}>取消</button>
                                        <button type="submit" className="btn btn-primary" style={{ minWidth: 160 }}>完成編輯，進入檢視</button>
                                    </>
                                )}
                                {step === 'REVIEW' && (
                                    <>
                                        <button type="button" className="btn btn-secondary" onClick={() => setStep('FILL_FORM')}>返回修改</button>
                                        <button type="button" className="btn btn-primary" style={{ background: '#34C759', minWidth: 160 }} onClick={() => setStep('AUTH_2')}>確認無誤，前往送出</button>
                                    </>
                                )}
                            </div>
                        </form>

                        {step === 'AUTH_2' && (
                            <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-secondary)', borderRadius: 12, textAlign: 'center' }}>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: 8 }}>最終主管授權</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>表單已鎖定。請主管 <strong>{superName}</strong> ({superAgcode}) 再次輸入密碼(代號)以確認送出更新。</p>
                                <form onSubmit={handleAuth2} style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                                    <input 
                                        className="form-input" 
                                        style={{ maxWidth: 240, textAlign: 'center' }} 
                                        placeholder="輸入 AGCODE"
                                        value={superAgcode}
                                        onChange={e => setSuperAgcode(e.target.value)}
                                        autoFocus
                                    />
                                    <button type="button" className="btn btn-secondary" onClick={() => setStep('REVIEW')}>取消</button>
                                    <button type="submit" className="btn btn-primary" disabled={loading || !superAgcode} style={{ background: '#FF3B30' }}>
                                        {loading ? <span className="spinner" /> : '授權並完成新增/變更'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
