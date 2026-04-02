'use client';

import { useState, useEffect } from 'react';
import { IconAlertTriangle, IconCheckCircle, IconQrcode, IconShieldCheck, IconLock } from '@/components/Icons';
import { playSystemSound } from '@/lib/sounds';

type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
    id: string;
    msg: string;
    type: ToastType;
}

interface ConfirmOptions {
    msg: string;
    onConfirm: () => void;
}

export type FullscreenAnimType = 'checkin-success' | 'checkin-fail' | 'leave-success' | 'leave-fail' | 'visit-success' | 'visit-fail' | 'auth-success' | 'sso-opening' | 'sso-success';

interface AnimOptions {
    type: FullscreenAnimType;
    msg: string;
}

class UIManager {
    static toastListeners: ((opts: ToastOptions) => void)[] = [];
    static confirmListeners: ((opts: ConfirmOptions) => void)[] = [];
    static animListeners: ((opts: AnimOptions | null) => void)[] = [];

    static dispatchToast(msg: string, type: ToastType) {
        const id = Math.random().toString(36).slice(2);
        this.toastListeners.forEach(l => l({ id, msg, type }));
    }

    static dispatchConfirm(msg: string, onConfirm: () => void) {
        this.confirmListeners.forEach(l => l({ msg, onConfirm }));
    }

    static dispatchAnim(type: FullscreenAnimType, msg: string) {
        if (type === 'checkin-success' || type === 'auth-success' || type === 'sso-success') playSystemSound('success');
        if (type === 'checkin-fail') playSystemSound('error');
        if (type === 'leave-success') playSystemSound('whoosh');
        if (type === 'leave-fail') playSystemSound('error');
        if (type === 'sso-opening') playSystemSound('whoosh');

        this.animListeners.forEach(l => l({ type, msg }));
        
        // sso-opening doesn't auto-dismiss by timeout in GlobalUI if we want to control it, 
        // but for now let's keep it consistent or use a longer timeout for opening.
        const duration = type === 'sso-opening' ? 1800 : 2500;
        
        setTimeout(() => {
            this.animListeners.forEach(l => l(null));
        }, duration); 
    }
}

export const toast = {
    success: (msg: string) => UIManager.dispatchToast(msg, 'success'),
    error: (msg: string) => UIManager.dispatchToast(msg, 'error'),
    info: (msg: string) => UIManager.dispatchToast(msg, 'info'),
};

export const confirmDialog = (msg: string, onConfirm: () => void) => {
    UIManager.dispatchConfirm(msg, onConfirm);
};

export const showAnimation = (type: FullscreenAnimType, msg: string) => {
    UIManager.dispatchAnim(type, msg);
};

export default function GlobalUI() {
    const [toasts, setToasts] = useState<ToastOptions[]>([]);
    const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);
    const [animOpts, setAnimOpts] = useState<AnimOptions | null>(null);

    useEffect(() => {
        const tListener = (t: ToastOptions) => {
            setToasts(prev => [...prev, t]);
            setTimeout(() => {
                setToasts(prev => prev.filter(x => x.id !== t.id));
            }, 3500);
        };
        const cListener = (c: ConfirmOptions) => { setConfirmOpts(c); };
        const aListener = (a: AnimOptions | null) => { setAnimOpts(a); };

        const warmup = () => { playSystemSound('click'); window.removeEventListener('click', warmup); };
        window.addEventListener('click', warmup);

        UIManager.toastListeners.push(tListener);
        UIManager.confirmListeners.push(cListener);
        UIManager.animListeners.push(aListener);
        return () => {
            UIManager.toastListeners = UIManager.toastListeners.filter(l => l !== tListener);
            UIManager.confirmListeners = UIManager.confirmListeners.filter(l => l !== cListener);
            UIManager.animListeners = UIManager.animListeners.filter(l => l !== aListener);
            window.removeEventListener('click', warmup);
        };
    }, []);

    return (
        <>
            {/* Toasts */}
            <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        background: 'var(--surface-card)',
                        boxShadow: 'var(--shadow-modal)',
                        borderRadius: '100px',
                        padding: '12px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        animation: 'slideDown 0.3s var(--spring)',
                        minWidth: 260,
                        border: '1px solid var(--line)',
                        pointerEvents: 'auto',
                    }}>
                        {t.type === 'success' ? <div style={{ color: 'var(--primary)' }}><IconCheckCircle size={18} /></div> : null}
                        {t.type === 'error' ? <div style={{ color: 'var(--red)' }}><IconAlertTriangle size={18} /></div> : null}
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{t.msg}</div>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirmOpts && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'var(--surface-card)', padding: '28px', borderRadius: 'var(--r-2xl)', width: '90%', maxWidth: 360, boxShadow: 'var(--shadow-modal)', animation: 'scaleIn 0.25s var(--spring)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: 8, letterSpacing: '-0.02em' }}>確認操作</div>
                        <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 28, lineHeight: 1.5 }}>
                            {confirmOpts.msg}
                        </div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setConfirmOpts(null)}>取消</button>
                            <button className="btn btn-primary" onClick={() => { confirmOpts.onConfirm(); setConfirmOpts(null); }}>確定執行</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Special Animations — Premium Re-layout */}
            {animOpts && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(20px) saturate(180%)', // High-fidelity blur
                    zIndex: 11000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div className="anim-card-container">
                        {/* Dynamic Background Pulse */}
                        <div className={`anim-pulse-bg ${animOpts.type.includes('success') ? 'success' : 'fail'}`}></div>

                        <div className="anim-icon-stage">
                            {/* Checkin Success: Time clock punching */}
                            {animOpts.type === 'checkin-success' && (
                                <div className="anim-checkin-success">
                                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                        <path className="anim-check-mark" d="M9 16l2 2 4-4" />
                                    </svg>
                                </div>
                            )}

                            {/* Checkin Fail: Shaky broken clock */}
                            {animOpts.type === 'checkin-fail' && (
                                <div className="anim-checkin-fail">
                                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                        <path d="M15 14l-6 6M9 14l6 6" />
                                    </svg>
                                </div>
                            )}

                            {/* Leave Success: Paper airplane fly */}
                            {animOpts.type === 'leave-success' && (
                                <div className="anim-leave-success">
                                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                    </svg>
                                </div>
                            )}

                            {/* Leave Fail: Crash airplane */}
                            {animOpts.type === 'leave-fail' && (
                                <div className="anim-leave-fail">
                                    <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                                    </svg>
                                </div>
                            )}

                             {animOpts.type === 'visit-success' && (
                                 <div className="anim-checkin-success">
                                     <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                         <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                         <circle cx="12" cy="10" r="3" />
                                         <path className="anim-check-mark" d="M10 10l.5.5 1-1" />
                                     </svg>
                                 </div>
                             )}

                             {animOpts.type === 'auth-success' && (
                                 <div className="anim-checkin-success">
                                     <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                         <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                         <path className="anim-check-mark" d="m9 12 2 2 4-4"/>
                                     </svg>
                                 </div>
                             )}

                             {animOpts.type === 'visit-fail' && (
                                 <div className="anim-leave-fail">
                                     <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                         <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
                                     </svg>
                                 </div>
                             )}

                             {animOpts.type === 'sso-opening' && (
                                 <div className="premium-sso-container">
                                     <div className="premium-sso-glow"></div>
                                     <div className="premium-sso-shield-wrap">
                                         <div className="premium-sso-ring ring-1"></div>
                                         <div className="premium-sso-ring ring-2"></div>
                                         <div className="premium-sso-shield">
                                            <IconShieldCheck size={64} color="var(--blue)" />
                                         </div>
                                         <div className="premium-sso-radar"></div>
                                     </div>
                                 </div>
                             )}

                             {animOpts.type === 'sso-success' && (
                                 <div className="premium-sso-container success">
                                     <div className="premium-sso-glow success"></div>
                                     <div className="premium-sso-icon-success">
                                         <div className="premium-success-burst"></div>
                                         <IconCheckCircle size={100} color="var(--green)" />
                                     </div>
                                 </div>
                             )}
                        </div>

                        <div className="anim-message-area">
                            <div className="anim-title">
                                {animOpts.type === 'sso-opening' ? '安全環境檢查中' : 
                                 animOpts.type.includes('success') ? '恭喜！' : '哎呀⋯'}
                            </div>
                            <div className="anim-text">{animOpts.msg}</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
