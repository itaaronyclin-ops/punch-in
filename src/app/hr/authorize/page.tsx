'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthorizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const sessionId = searchParams.get('id') || searchParams.get('authSessionId');

    type Status = 'LOADING' | 'READY' | 'SUBMITTING' | 'SUCCESS' | 'ERROR' | 'INVALID';
    const [status, setStatus] = useState<Status>('LOADING');
    const [errorMsg, setErrorMsg] = useState('');
    const [countdown, setCountdown] = useState(3);
    const [agcodeInput, setAgcodeInput] = useState('');

    const agcode = typeof window !== 'undefined' ? (localStorage.getItem('agcode') || '') : '';
    const name   = typeof window !== 'undefined' ? (localStorage.getItem('userName') || '') : '';
    const isCached = !!agcode;

    useEffect(() => {
        if (!sessionId) {
            setStatus('INVALID');
            setErrorMsg('授權連結無效（缺少驗證碼），請重新掃描。');
            return;
        }

        // Check session is still pending
        fetch(`/api/hr/auth?id=${sessionId}`)
            .then(r => r.json())
            .then(data => {
                if (!data.session) {
                    setStatus('INVALID');
                    setErrorMsg('此授權請求已過期或不存在，請重新掃描。');
                } else if (data.session.status === 'approved') {
                    setStatus('SUCCESS');
                } else {
                    setStatus('READY');
                    if (isCached) {
                        setAgcodeInput(agcode);
                    }
                }
            })
            .catch(() => {
                setStatus('INVALID');
                setErrorMsg('連線失敗，請確認網路後重試。');
            });
    }, [sessionId, agcode, isCached]);

    // Auto-redirect countdown after SUCCESS
    useEffect(() => {
        if (status !== 'SUCCESS') return;
        if (countdown <= 0) { router.replace('/'); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [status, countdown, router]);

    const handleApprove = async () => {
        const code = agcodeInput.trim().toUpperCase();
        if (!code) return;
        setStatus('SUBMITTING');

        try {
            // Verify AGCODE if not cached
            let finalName = name;
            if (!isCached || code !== agcode) {
                const memberRes = await fetch(`/api/member?agcode=${code}`);
                const memberData = await memberRes.json();
                if (!memberData.member) {
                    setStatus('READY');
                    setErrorMsg('找不到此業務代號，請確認後重試。');
                    return;
                }
                finalName = memberData.member.name;
            }

            const res = await fetch('/api/hr/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'approveAuthSession',
                    id: sessionId,
                    supervisorAgcode: code,
                    supervisorName: finalName,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setStatus('SUCCESS');
            } else {
                setStatus('READY');
                setErrorMsg(data.error || '授權失敗，請稍後再試。');
            }
        } catch {
            setStatus('READY');
            setErrorMsg('網路連線失敗，請稍後再試。');
        }
    };

    const wrap = (children: React.ReactNode) => (
        <div style={{
            minHeight: '100vh', background: '#f5f5f7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        }}>
            <div style={{
                background: 'white', borderRadius: 28, padding: '44px 28px',
                width: '100%', maxWidth: 400,
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)', textAlign: 'center',
            }}>
                {children}
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                input { font-size: 16px; } /* prevent iOS zoom */
            `}</style>
        </div>
    );

    if (status === 'LOADING') return wrap(
        <div style={{ padding: '40px 0' }}>
            <div style={{ width: 44, height: 44, border: '4px solid #eee', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: '#86868b' }}>載入中⋯</p>
        </div>
    );

    if (status === 'SUBMITTING') return wrap(
        <div style={{ padding: '40px 0' }}>
            <div style={{ width: 44, height: 44, border: '4px solid #eee', borderTopColor: '#34C759', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: '#86868b' }}>驗證中，請稍候⋯</p>
        </div>
    );

    if (status === 'SUCCESS') return wrap(
        <>
            <div style={{ width: 88, height: 88, borderRadius: 44, background: 'rgba(52,199,89,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                </svg>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>授權完成 ✓</h2>
            <p style={{ color: '#86868b', marginBottom: 8 }}>電腦端將自動繼續操作</p>
            <div style={{ background: '#f5f5f7', borderRadius: 14, padding: '14px 20px', fontSize: '0.9rem', color: '#86868b', marginBottom: 24 }}>
                {countdown > 0 ? `${countdown} 秒後自動返回首頁` : '正在返回⋯'}
            </div>
            <button onClick={() => router.replace('/')} style={{ width: '100%', padding: '14px', background: '#34C759', color: 'white', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                立即返回首頁
            </button>
        </>
    );

    if (status === 'INVALID') return wrap(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(255,59,48,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h2 style={{ margin: '0 0 12px', fontSize: '1.4rem', fontWeight: 700 }}>連結或狀態無效</h2>
            <p style={{ color: '#86868b', marginBottom: 32, lineHeight: 1.6 }}>{errorMsg}</p>
            <button onClick={() => router.replace('/')} style={{ width: '100%', padding: '13px', background: '#007aff', color: 'white', border: 'none', borderRadius: 12, fontWeight: 600, cursor: 'pointer' }}>
                回到首頁
            </button>
        </>
    );

    // READY
    return wrap(
        <>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#007aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/><polyline points="16,11 18,13 22,9"/>
                </svg>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 700 }}>主管身份確認</h2>
            <p style={{ color: '#86868b', fontSize: '0.9rem', marginBottom: 28 }}>
                {isCached ? '請確認是否以此身份進行授權' : '請輸入您的業務代號以進行授權'}
            </p>

            {errorMsg && (
                <div style={{ background: 'rgba(255,59,48,0.08)', border: '1px solid rgba(255,59,48,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#FF3B30' }}>
                    {errorMsg}
                </div>
            )}

            {isCached ? (
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
            ) : (
                <input
                    type="text"
                    autoCapitalize="characters"
                    autoFocus
                    placeholder="請輸入業務代號 AGCODE"
                    value={agcodeInput}
                    onChange={e => { setAgcodeInput(e.target.value.toUpperCase()); setErrorMsg(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleApprove()}
                    style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '14px 16px', borderRadius: 14,
                        border: '1.5px solid #d2d2d7', background: '#fafafa',
                        fontSize: '1rem', fontWeight: 600, letterSpacing: '0.05em',
                        textAlign: 'center', marginBottom: 16, outline: 'none',
                        fontFamily: 'monospace'
                    }}
                />
            )}

            <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => router.replace('/')} style={{ flex: 1, padding: '14px', background: '#f2f2f7', color: '#1d1d1f', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                    取消
                </button>
                <button
                    onClick={handleApprove}
                    disabled={!agcodeInput.trim()}
                    style={{ flex: 2, padding: '14px', background: agcodeInput.trim() ? '#007aff' : '#c7c7cc', color: 'white', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: '1rem', cursor: agcodeInput.trim() ? 'pointer' : 'default', transition: 'background 0.2s' }}
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
                <div style={{ width: 40, height: 40, border: '4px solid #eee', borderTopColor: '#007aff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        }>
            <AuthorizeContent />
        </Suspense>
    );
}
