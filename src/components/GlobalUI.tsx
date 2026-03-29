'use client';

import { useState, useEffect } from 'react';
import { IconAlertTriangle, IconCheckCircle } from '@/components/Icons';
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

export type FullscreenAnimType = 'checkin-success' | 'checkin-fail' | 'leave-success' | 'leave-fail';

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
        if (type === 'checkin-success') playSystemSound('success');
        if (type === 'checkin-fail') playSystemSound('error');
        if (type === 'leave-success') playSystemSound('whoosh');
        if (type === 'leave-fail') playSystemSound('error');

        this.animListeners.forEach(l => l({ type, msg }));
        setTimeout(() => {
            this.animListeners.forEach(l => l(null));
        }, 2500); // Overlay auto dismiss
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

        UIManager.toastListeners.push(tListener);
        UIManager.confirmListeners.push(cListener);
        UIManager.animListeners.push(aListener);
        return () => {
            UIManager.toastListeners = UIManager.toastListeners.filter(l => l !== tListener);
            UIManager.confirmListeners = UIManager.confirmListeners.filter(l => l !== cListener);
            UIManager.animListeners = UIManager.animListeners.filter(l => l !== aListener);
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

            {/* Fullscreen Special Animations */}
            {animOpts && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', zIndex: 11000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' }}>
                    {/* Checkin Success: Time clock punching */}
                    {animOpts.type === 'checkin-success' && (
                        <div className="anim-checkin-success">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <path className="anim-check-mark" d="M9 16l2 2 4-4" />
                            </svg>
                        </div>
                    )}
                    {/* Checkin Fail: Broken shaken time clock */}
                    {animOpts.type === 'checkin-fail' && (
                        <div className="anim-checkin-fail">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                                <line x1="9" y1="14" x2="15" y2="20" />
                                <line x1="15" y1="14" x2="9" y2="20" />
                            </svg>
                        </div>
                    )}
                    {/* Leave Success: Paper airplane flying up */}
                    {animOpts.type === 'leave-success' && (
                        <div className="anim-leave-success">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </div>
                    )}
                    {/* Leave Fail: Paper airplane crashing / X mark */}
                    {animOpts.type === 'leave-fail' && (
                        <div className="anim-leave-fail">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                <circle cx="12" cy="12" r="10" strokeWidth="2" strokeDasharray="4 4" />
                                <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2" />
                                <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2" />
                            </svg>
                        </div>
                    )}
                    <div style={{ marginTop: 24, fontSize: '1.4rem', fontWeight: 600, color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.5)', animation: 'slideUp 0.5s var(--spring)' }}>
                        {animOpts.msg}
                    </div>
                </div>
            )}
        </>
    );
}
