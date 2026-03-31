'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconShieldCheck, IconUserCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';

function AuthorizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('id');

    const [pageStatus, setPageStatus] = useState<'LOADING' | 'READY' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');

    // Auto-fill from localStorage (read-only)
    const [agcode] = useState<string>(() =>
        typeof window !== 'undefined' ? (localStorage.getItem('agcode') || '') : ''
    );
    const [name] = useState<string>(() =>
        typeof window !== 'undefined' ? (localStorage.getItem('userName') || '') : ''
    );

    useEffect(() => {
        if (!sessionId) { setPageStatus('ERROR'); setErrorMsg('請求無效（缺少 ID）'); return; }
        if (!agcode) { setPageStatus('ERROR'); setErrorMsg('請先回到首頁登入後再執行授權。'); return; }

        (async () => {
            try {
                const res = await fetch(`/api/hr/auth?id=${sessionId}`);
                const data = await res.json();
                if (data.session) {
                    if (data.session.status === 'approved') {
                        setPageStatus('SUCCESS');
                    } else {
                        setPageStatus('READY');
                    }
                } else {
                    setPageStatus('ERROR');
                    setErrorMsg('找不到此驗證請求或已過期');
                }
            } catch {
                setPageStatus('ERROR');
                setErrorMsg('連線失敗，請稍後再試');
            }
        })();
    }, [sessionId, agcode]);

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

    const card = (content: React.ReactNode) => (
        <div style={{
            minHeight: '100vh', background: '#f5f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        }}>
            <div style={{
                background: 'white', borderRadius: 28, padding: '44px 32px',
                width: '100%', maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center',
            }}>
                {content}
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const spinner = <IconLoader2 size={40} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} />;

    if (pageStatus === 'LOADING') return card(
        <div style={{ padding: '40px 0' }}>{spinner}<p style={{ marginTop: 16, color: '#86868b' }}>載入中⋯</p></div>
    );

    if (pageStatus === 'CONFIRMING') return card(
        <div style={{ padding: '40px 0' }}>{spinner}<p style={{ marginTop: 16, color: '#86868b' }}>授權中⋯</p></div>
    );

    if (pageStatus === 'SUCCESS') return card(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconShieldCheck size={44} color="#34C759" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>授權完成</h2>
            <p style={{ color: '#86868b', marginBottom: 12 }}>授權者：<strong>{name || agcode}</strong></p>
            <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 32 }}>電腦端將自動繼續，您可返回首頁。</p>
            <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '14px', background: '#34C759', color: 'white', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
                返回打卡首頁
            </button>
        </>
    );

    if (pageStatus === 'ERROR') return card(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconAlertCircle size={44} color="#FF3B30" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700 }}>發生錯誤</h2>
            <p style={{ color: '#86868b', marginBottom: 32 }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push('/')} style={{ flex: 1, padding: '13px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>
                    回首頁
                </button>
                {!agcode && null}
                {agcode && (
                    <button onClick={() => window.location.reload()} style={{ flex: 1, padding: '13px', background: '#007aff', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>
                        重試
                    </button>
                )}
            </div>
        </>
    );

    // READY — confirm with read-only info
    return card(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconUserCheck size={40} color="#007aff" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700 }}>確認授權</h2>
            <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 28 }}>以下身分將作為本次授權簽署者</p>

            {/* Read-only identity display */}
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
                    onClick={() => router.push('/')}
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
        </>
    );
}

export default function AuthorizePage() {
    return (
        <Suspense fallback={
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f7' }}>
                <div style={{ width: 40, height: 40, border: '4px solid #eee', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <AuthorizeContent />
        </Suspense>
    );
}
