'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthorizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Support both ?id= and ?authSessionId= for backward compatibility
    const sessionId = searchParams.get('id') || searchParams.get('authSessionId');

    type PageStatus = 'LOADING' | 'READY' | 'CONFIRMING' | 'SUCCESS' | 'ERROR';
    const [pageStatus, setPageStatus] = useState<PageStatus>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');
    const [countdown, setCountdown] = useState(3);

    // Read identity from localStorage (already logged in on this device)
    const agcode = typeof window !== 'undefined' ? (localStorage.getItem('agcode') || '') : '';
    const name   = typeof window !== 'undefined' ? (localStorage.getItem('userName') || '') : '';

    useEffect(() => {
        if (!sessionId) {
            setPageStatus('ERROR');
            setErrorMsg('授權鏈結無效（缺少 ID），請重新掃描 QR Code');
            return;
        }
        if (!agcode) {
            setPageStatus('ERROR');
            setErrorMsg('您尚未登入打卡系統，請先回到首頁完成登入後再掃描授權。');
            return;
        }
        // Check session status
        fetch(`/api/hr/auth?id=${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (data.session) {
                    setPageStatus(data.session.status === 'approved' ? 'SUCCESS' : 'READY');
                } else {
                    setPageStatus('ERROR');
                    setErrorMsg('找不到此授權請求，可能已過期，請重新掃描。');
                }
            })
            .catch(() => {
                setPageStatus('ERROR');
                setErrorMsg('連線失敗，請稍後再試。');
            });
    }, [sessionId, agcode]);

    // Auto-redirect countdown after SUCCESS
    useEffect(() => {
        if (pageStatus !== 'SUCCESS') return;
        if (countdown <= 0) {
            router.replace('/');
            return;
        }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [pageStatus, countdown, router]);

    const handleApprove = async () => {
        setPageStatus('CONFIRMING');
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approveAuthSession',
                    id: sessionId,
                    supervisorAgcode: agcode,
                    supervisorName: name,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setPageStatus('SUCCESS');
            } else {
                setPageStatus('ERROR');
                setErrorMsg(data.error || '授權失敗，請稍後再試');
            }
        } catch {
            setPageStatus('ERROR');
            setErrorMsg('網路連線失敗');
        }
    };

    const containerStyle: React.CSSProperties = {
        minHeight: '100vh',
        background: '#f5f5f7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    };

    const cardStyle: React.CSSProperties = {
        background: 'white',
        borderRadius: 28,
        padding: '44px 32px',
        width: '100%',
        maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        textAlign: 'center',
    };

    if (pageStatus === 'LOADING' || pageStatus === 'CONFIRMING') {
        const label = pageStatus === 'LOADING' ? '載入中⋯' : '授權中⋯';
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{ padding: '40px 0' }}>
                        <div style={{
                            width: 48, height: 48, border: '4px solid #eee',
                            borderTopColor: '#007aff', borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite', margin: '0 auto 20px'
                        }} />
                        <p style={{ color: '#86868b', fontWeight: 500 }}>{label}</p>
                    </div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        );
    }

    if (pageStatus === 'SUCCESS') {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{
                        width: 88, height: 88, borderRadius: 44,
                        background: 'rgba(52,199,89,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px'
                    }}>
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <path d="m9 12 2 2 4-4"/>
                        </svg>
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>授權完成 ✓</h2>
                    <p style={{ color: '#86868b', marginBottom: 8 }}>
                        授權者：<strong style={{ color: '#1d1d1f' }}>{name || agcode}</strong>
                    </p>
                    <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 32 }}>
                        電腦端將自動繼續操作
                    </p>
                    <div style={{
                        background: '#f5f5f7', borderRadius: 14, padding: '14px 20px',
                        fontSize: '0.9rem', color: '#86868b', marginBottom: 24
                    }}>
                        {countdown > 0 ? `${countdown} 秒後自動返回首頁` : '正在返回首頁⋯'}
                    </div>
                    <button
                        onClick={() => router.replace('/')}
                        style={{
                            width: '100%', padding: '14px',
                            background: '#34C759', color: 'white',
                            border: 'none', borderRadius: 14,
                            fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
                        }}
                    >
                        立即返回首頁
                    </button>
                </div>
            </div>
        );
    }

    if (pageStatus === 'ERROR') {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 40,
                        background: 'rgba(255,59,48,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px'
                    }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 700 }}>無法完成授權</h2>
                    <p style={{ color: '#86868b', marginBottom: 32, lineHeight: 1.6 }}>{errorMsg}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => router.replace('/')}
                            style={{ flex: 1, padding: '13px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                            回首頁
                        </button>
                        {agcode && (
                            <button
                                onClick={() => window.location.reload()}
                                style={{ flex: 1, padding: '13px', background: '#007aff', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                                重試
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // READY — show identity confirmation
    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <div style={{
                    width: 80, height: 80, borderRadius: 40,
                    background: 'rgba(0,122,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px'
                }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                        <polyline points="16,11 18,13 22,9"/>
                    </svg>
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700 }}>確認授權</h2>
                <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 28 }}>以下身分將作為本次授權簽署者</p>

                <div style={{ background: '#f5f5f7', borderRadius: 16, padding: '20px', marginBottom: 28, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <span style={{ fontSize: '0.82rem', color: '#86868b', fontWeight: 600 }}>業務代號</span>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em', color: '#1d1d1f' }}>{agcode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.82rem', color: '#86868b', fontWeight: 600 }}>授權姓名</span>
                        <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{name || '—'}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => router.replace('/')}
                        style={{ flex: 1, padding: '14px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleApprove}
                        style={{ flex: 2, padding: '14px', background: '#007aff', color: 'white', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                    >
                        確認授權 ✓
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AuthorizePage() {
    return (
        <Suspense fallback={
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
                <div style={{ width: 40, height: 40, border: '4px solid #eee', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        }>
            <AuthorizeContent />
        </Suspense>
    );
}
