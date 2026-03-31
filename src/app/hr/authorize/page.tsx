'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconShieldCheck, IconUserCheck, IconArrowLeft, IconAlertCircle, IconCamera } from '@tabler/icons-react';
import QRScanner from '@/components/QRScanner';

function AuthorizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    
    const [status, setStatus] = useState<'LOADING' | 'READY' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [session, setSession] = useState<any>(null);
    const [supervisor, setSupervisor] = useState({ agcode: '', name: '' });
    const [errorMsg, setErrorMsg] = useState('');
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        // Load supervisor from localStorage if exists
        const savedAgcode = localStorage.getItem('agcode');
        const savedName = localStorage.getItem('userName');
        if (savedAgcode) {
            setSupervisor({ agcode: savedAgcode, name: savedName || '' });
        }

        if (!id) {
            setStatus('ERROR');
            setErrorMsg('請求無效 (Missing ID)');
            return;
        }

        const fetchSession = async () => {
            try {
                const res = await fetch(`/api/hr/auth?id=${id}`);
                const data = await res.json();
                if (data.session) {
                    setSession(data.session);
                    setStatus('READY');
                } else {
                    setStatus('ERROR');
                    setErrorMsg('找不到此驗證請求或已過期');
                }
            } catch (err) {
                setStatus('ERROR');
                setErrorMsg('連線失敗');
            }
        };

        fetchSession();
    }, [id]);

    const handleApprove = async () => {
        if (!supervisor.agcode) {
            alert('請提供業務代號');
            return;
        }

        setStatus('LOADING');
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approveAuthSession',
                    id,
                    supervisorAgcode: supervisor.agcode,
                    supervisorName: supervisor.name
                })
            });
            const data = await res.json();
            if (data.success) {
                setStatus('SUCCESS');
                // Save supervisor info for future use
                localStorage.setItem('agcode', supervisor.agcode);
                localStorage.setItem('userName', supervisor.name);
            } else {
                setStatus('ERROR');
                setErrorMsg(data.error || '授權失敗');
            }
        } catch (err) {
            setStatus('ERROR');
            setErrorMsg('連線失敗');
        }
    };

    if (status === 'LOADING') {
        return <div className="auth-full-screen"><div className="loading-spinner" /></div>;
    }

    if (status === 'SUCCESS') {
        return (
            <div className="auth-full-screen">
                <div className="auth-card success-card">
                    <div className="auth-icon-circle success"><IconShieldCheck size={48} color="#34C759" /></div>
                    <h2 style={{ margin: '16px 0 8px' }}>授權完成</h2>
                    <p style={{ color: '#666', marginBottom: 24 }}>您已核准此項資料異動請求。</p>
                    <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => router.push('/')}>返回主首頁</button>
                </div>
            </div>
        );
    }

    if (status === 'ERROR') {
        return (
            <div className="auth-full-screen">
                <div className="auth-card">
                    <div className="auth-icon-circle error"><IconAlertCircle size={48} color="#FF3B30" /></div>
                    <h2 style={{ margin: '16px 0 8px' }}>連線錯誤</h2>
                    <p style={{ color: '#666', marginBottom: 24 }}>{errorMsg}</p>
                    <button className="btn btn-ghost" onClick={() => window.location.reload()}>重試</button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-full-screen">
            <div className="auth-card">
                <div className="auth-icon-circle"><IconUserCheck size={36} color="var(--blue)" /></div>
                <h2 style={{ margin: '16px 0 8px' }}>主管授權驗證</h2>
                <p style={{ color: '#666', marginBottom: 32, fontSize: '0.95rem' }}>請確認並核准此筆異動請求：<br/><span style={{ color: 'var(--blue)', fontWeight: 600 }}>ID: {id}</span></p>
                
                <div className="auth-field-group">
                    <label>主管業務代號 (AGCODE)</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input 
                            className="form-input" 
                            style={{ flex: 1 }}
                            value={supervisor.agcode} 
                            onChange={e => setSupervisor({ ...supervisor, agcode: e.target.value.toUpperCase() })}
                            placeholder="請輸入您的 AGCODE"
                        />
                        <button className="btn btn-ghost" style={{ padding: '0 16px' }} onClick={() => setShowScanner(true)}>
                            <IconCamera size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="auth-field-group" style={{ marginTop: 12 }}>
                    <label>姓名</label>
                    <input 
                        className="form-input" 
                        value={supervisor.name} 
                        onChange={e => setSupervisor({ ...supervisor, name: e.target.value })}
                        placeholder="請輸入您的姓名"
                    />
                </div>

                <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => router.push('/')}>取消</button>
                    <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleApprove}>核准解鎖</button>
                </div>
            </div>

            {showScanner && (
                <QRScanner 
                    title="掃描主管身分碼"
                    onScan={(val) => {
                        setSupervisor({ ...supervisor, agcode: val.toUpperCase() });
                        setShowScanner(false);
                    }}
                    onClose={() => setShowScanner(false)}
                />
            )}


            <style jsx>{`
                .auth-full-screen {
                    min-height: 100vh;
                    background: #f5f5f7;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                }
                .auth-card {
                    background: white;
                    border-radius: 24px;
                    padding: 32px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.08);
                    text-align: center;
                }
                .auth-icon-circle {
                    width: 72px;
                    height: 72px;
                    background: rgba(0, 122, 255, 0.08);
                    border-radius: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }
                .auth-icon-circle.success { background: rgba(52, 199, 89, 0.1); }
                .auth-icon-circle.error { background: rgba(255, 59, 48, 0.1); }
                .auth-field-group { text-align: left; }
                .auth-field-group label { display: block; font-size: 0.85rem; color: #86868b; margin-bottom: 6px; margin-left: 4px; }
                .form-input {
                    width: 100%;
                    padding: 14px 16px;
                    border: 1px solid #d2d2d7;
                    border-radius: 12px;
                    font-size: 1rem;
                    transition: all 0.2s;
                }
                .form-input:focus { border-color: var(--blue); outline: none; box-shadow: 0 0 0 4px rgba(0,122,255,0.1); }
                .btn { padding: 14px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; }
                .btn-primary { background: #007aff; color: white; }
                .btn-primary:hover { background: #0062cc; }
                .btn-ghost { background: #f5f5f7; color: #1d1d1f; }
                .btn-ghost:hover { background: #e5e5e7; }
                .loading-spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default function AuthorizePage() {
    return (
        <Suspense fallback={<div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}><span className="spinner"></span></div>}>
            <AuthorizeContent />
        </Suspense>
    );
}
