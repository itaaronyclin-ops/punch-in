'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { IconShieldCheck, IconUserCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';

function AuthorizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');

    const [status, setStatus] = useState<'LOADING' | 'READY' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'>('LOADING');
    const [session, setSession] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Supervisor identity pre-filled from localStorage (set on login)
    const [agcode, setAgcode] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('agcode');
        const savedName = localStorage.getItem('userName');
        if (saved) { setAgcode(saved); setName(savedName || ''); }

        if (!id) { setStatus('ERROR'); setErrorMsg('請求無效（缺少 ID）'); return; }

        (async () => {
            try {
                const res = await fetch(`/api/hr/auth?id=${id}`);
                const data = await res.json();
                if (data.session) {
                    if (data.session.status === 'approved') {
                        setStatus('SUCCESS'); // Already approved
                    } else {
                        setSession(data.session);
                        setStatus('READY');
                    }
                } else {
                    setStatus('ERROR');
                    setErrorMsg('找不到此驗證請求或已過期');
                }
            } catch {
                setStatus('ERROR');
                setErrorMsg('連線失敗，請稍後再試');
            }
        })();
    }, [id]);

    const handleApprove = async () => {
        if (!agcode) { alert('請填入您的業務代號'); return; }
        setStatus('CONFIRMING');
        try {
            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approveAuthSession',
                    id,
                    supervisorAgcode: agcode.toUpperCase(),
                    supervisorName: name,
                }),
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('agcode', agcode.toUpperCase());
                if (name) localStorage.setItem('userName', name);
                setStatus('SUCCESS');
            } else {
                setStatus('ERROR');
                setErrorMsg(data.error || '授權失敗，請稍後再試');
            }
        } catch {
            setStatus('ERROR');
            setErrorMsg('網路連線失敗');
        }
    };

    const screen = (content: React.ReactNode) => (
        <div style={{
            minHeight: '100vh', background: '#f5f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        }}>
            <div style={{
                background: 'white', borderRadius: 28, padding: '40px 32px',
                width: '100%', maxWidth: 420,
                boxShadow: '0 20px 50px rgba(0,0,0,0.1)', textAlign: 'center',
            }}>
                {content}
            </div>
        </div>
    );

    if (status === 'LOADING') return screen(
        <div style={{ padding: '40px 0' }}>
            <IconLoader2 size={40} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 16, color: '#86868b' }}>載入中⋯</p>
            <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );

    if (status === 'CONFIRMING') return screen(
        <div style={{ padding: '40px 0' }}>
            <IconLoader2 size={40} color="#007aff" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 16, color: '#86868b' }}>授權中⋯</p>
            <style>{`@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
        </div>
    );

    if (status === 'SUCCESS') return screen(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconShieldCheck size={44} color="#34C759" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>授權完成</h2>
            <p style={{ color: '#86868b', marginBottom: 32 }}>您已成功核准此請求，電腦端將自動繼續。</p>
            <button
                onClick={() => router.push('/')}
                style={{ width: '100%', padding: '14px', background: '#34C759', color: 'white', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
            >
                返回打卡首頁
            </button>
        </>
    );

    if (status === 'ERROR') return screen(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconAlertCircle size={44} color="#FF3B30" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700 }}>發生錯誤</h2>
            <p style={{ color: '#86868b', marginBottom: 32 }}>{errorMsg}</p>
            <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>
                重新嘗試
            </button>
        </>
    );

    // READY — show confirm screen
    return screen(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <IconUserCheck size={40} color="#007aff" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 700 }}>主管授權確認</h2>
            <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 28 }}>
                {agcode
                    ? `以下身分將作為授權簽署者：`
                    : '請填入您的業務代號以進行授權：'}
            </p>

            <div style={{ textAlign: 'left', marginBottom: 16 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#86868b', display: 'block', marginBottom: 6 }}>業務代號 (AGCODE)</label>
                <input
                    value={agcode}
                    onChange={e => setAgcode(e.target.value.toUpperCase())}
                    placeholder="例：AG001"
                    style={{ width: '100%', padding: '13px 14px', border: '1.5px solid #d2d2d7', borderRadius: 12, fontSize: '1rem', boxSizing: 'border-box', fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
            </div>
            <div style={{ textAlign: 'left', marginBottom: 28 }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#86868b', display: 'block', marginBottom: 6 }}>姓名</label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="您的姓名"
                    style={{ width: '100%', padding: '13px 14px', border: '1.5px solid #d2d2d7', borderRadius: 12, fontSize: '1rem', boxSizing: 'border-box' }}
                />
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
