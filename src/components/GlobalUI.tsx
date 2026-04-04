'use client';

import { useState, useEffect } from 'react';
import { IconAlertTriangle, IconCheckCircle, IconQrcode, IconShieldCheck, IconLock, IconBriefcase, IconRun, IconMapPin, IconListCheck, IconTrash, IconAddressBook, IconLoader } from '@/components/Icons';
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

export type FullscreenAnimType = 'checkin-success' | 'checkin-fail' | 'leave-success' | 'leave-fail' | 'visit-success' | 'visit-fail' | 'auth-success' | 'sso-opening' | 'sso-success' | 'todo-success' | 'todo-complete' | 'todo-delete' | 'contact-add' | 'contact-load';

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
        if (type === 'checkin-success' || type === 'auth-success' || type === 'sso-success' || type === 'todo-success' || type === 'todo-complete' || type === 'contact-add') playSystemSound('success');
        if (type === 'checkin-fail') playSystemSound('error');
        if (type === 'leave-success' || type === 'todo-delete') playSystemSound('whoosh');
        if (type === 'leave-fail') playSystemSound('error');
        if (type === 'sso-opening' || type === 'contact-load') playSystemSound('whoosh');

        this.animListeners.forEach(l => l({ type, msg }));
        
        // sso-opening doesn't auto-dismiss by timeout in GlobalUI if we want to control it, 
        // but for now let's keep it consistent or use a longer timeout for opening.
        const duration = (type === 'sso-opening' || type === 'contact-load') ? 1800 : 2500;
        
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
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(40px) saturate(210%)', // Enhanced blur & saturation
                    zIndex: 11000,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.5s var(--ease)'
                }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                         <div style={{ height: 280, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                             
                             {/* Unified Premium Container */}
                             <div className={`premium-sso-container ${animOpts.type.includes('fail') ? 'fail' : animOpts.type.includes('success') || animOpts.type.includes('complete') || animOpts.type === 'contact-add' ? 'success' : ''}`}>
                                 <div className={`premium-sso-glow ${animOpts.type.includes('fail') ? 'fail' : animOpts.type.includes('success') || animOpts.type.includes('complete') || animOpts.type === 'contact-add' ? 'success' : ''}`}></div>
                                 
                                 {animOpts.type === 'sso-opening' || animOpts.type === 'contact-load' ? (
                                     <div className="premium-sso-shield-wrap">
                                         <div className="premium-sso-ring ring-1"></div>
                                         <div className="premium-sso-ring ring-2"></div>
                                         <div className="premium-sso-shield">
                                            {animOpts.type === 'sso-opening' ? <IconShieldCheck size={80} color="#fff" /> : <IconLoader size={80} color="#fff" className="spin" />}
                                         </div>
                                         <div className="premium-sso-radar"></div>
                                     </div>
                                 ) : (
                                     <div className="premium-sso-icon-success">
                                         <div className="premium-success-burst"></div>
                                         {/* Dynamic Icon Mapping */}
                                         {animOpts.type.includes('fail') ? <IconAlertTriangle size={90} color="#fff" /> : 
                                          animOpts.type.includes('checkin') ? <IconBriefcase size={90} color="#fff" /> :
                                          animOpts.type.includes('leave') ? <IconRun size={90} color="#fff" /> :
                                          animOpts.type.includes('visit') ? <IconMapPin size={90} color="#fff" /> :
                                          animOpts.type.includes('todo-success') ? <IconListCheck size={90} color="#fff" /> :
                                          animOpts.type.includes('todo-complete') ? <IconCheckCircle size={100} color="#fff" /> :
                                          animOpts.type.includes('todo-delete') ? <IconTrash size={90} color="#fff" /> :
                                          animOpts.type.includes('contact-add') ? <IconAddressBook size={90} color="#fff" /> :
                                          animOpts.type.includes('auth') || animOpts.type === 'sso-success' ? <IconCheckCircle size={100} color="#fff" /> :
                                          <IconCheckCircle size={100} color="#fff" />}
                                     </div>
                                 )}
                             </div>
                         </div>

                         <div style={{ marginTop: 24, textAlign: 'center', color: '#fff' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 10, letterSpacing: '-0.03em' }}>
                                {animOpts.type === 'sso-opening' || animOpts.type === 'contact-load' ? '載入中...' : 
                                 animOpts.type.includes('success') || animOpts.type.includes('complete') || animOpts.type === 'contact-add' ? '恭喜您！' : 
                                 animOpts.type.includes('fail') ? '系統提示' : '通知'}
                            </div>
                            <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, whiteSpace: 'pre-line', fontWeight: 500 }}>{animOpts.msg}</div>
                         </div>
                    </div>
                </div>
            )}
        </>
    );
}
