'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconX, IconCamera, IconQrcode } from '@/components/Icons';

interface AuthScannerProps {
    onCodeSubmited: (code: string) => void;
    onClose: () => void;
    title?: string;
}

const SCANNER_ID = 'qr-camera-reader';

export default function AuthScanner({ onCodeSubmited, onClose, title = '🔑 掃碼 / 輸入授權' }: AuthScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const runningRef = useRef(false);

    useEffect(() => {
        if (runningRef.current) return;
        runningRef.current = true;

        const scanner = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = scanner;

        scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 240, height: 240 } },
            (decoded) => {
                scanner.stop().catch(() => {});
                onCodeSubmited(decoded);
            },
            () => { /* ignore per-frame errors */ }
        ).catch((e: Error) => {
            const isNotAllowed = e?.name === 'NotAllowedError' || e?.message?.includes('NotAllowedError');
            if (isNotAllowed) {
                setError('系統阻擋了相機。請直接在下方輸入數字！');
            } else {
                setError('相機無法存取，請直接使用下方輸入框輸入授權碼！');
            }
        });

        return () => {
            scanner.stop().catch(() => {});
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim().length === 6 || manualCode.trim() !== '') {
            onCodeSubmited(manualCode.trim());
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
        }}>
            <div style={{
                background: '#f2f2f7', borderRadius: 24,
                width: '100%', maxWidth: 420,
                overflow: 'hidden',
                boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
                animation: 'qrPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fff', borderBottom: '1px solid #e5e5ea',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconQrcode size={20} color="#007aff" />
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1d1d1f' }}>{title}</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f2f2f7', border: 'none',
                            width: 32, height: 32, borderRadius: 16,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <IconX size={18} />
                    </button>
                </div>

                {/* Body: Camera Section (Top) */}
                <div style={{ background: '#000', position: 'relative' }}>
                    {error ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center', background: '#fff' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
                            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ff3b30', marginBottom: 16 }}>相機無法啟動</p>
                            <p style={{ fontSize: '0.9rem', color: '#d70015', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{error}</p>
                        </div>
                    ) : (
                        <>
                            <div id={SCANNER_ID} style={{ width: '100%', minHeight: 280 }} />
                            <div style={{ 
                                position: 'absolute', bottom: 12, left: 0, right: 0, 
                                textAlign: 'center', color: '#fff', fontSize: '0.88rem', textShadow: '0 1px 4px rgba(0,0,0,0.5)' 
                            }}>
                                將 QR Code 對準鏡頭即可自動授權
                            </div>
                        </>
                    )}
                </div>

                {/* Body: Manual Input Section (Bottom) */}
                <div style={{ padding: '24px 20px', background: '#fff' }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: '0.85rem', color: '#86868b', fontWeight: 600, letterSpacing: 1 }}>或者手動輸入授權碼</span>
                        <div style={{ height: 1, background: '#f2f2f7', marginTop: 12 }}></div>
                    </div>
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 12 }}>
                        <input 
                            type="number"
                            placeholder="輸入 6 位數字" 
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            style={{
                                flex: 1, padding: '14px 16px', borderRadius: 12, border: '1px solid #d1d1d6',
                                fontSize: '1.2rem', fontWeight: 600, letterSpacing: 2, textAlign: 'center', outline: 'none'
                            }}
                            autoFocus={!!error}
                        />
                        <button 
                            type="submit" 
                            disabled={manualCode.trim().length === 0}
                            style={{
                                background: manualCode.trim().length > 0 ? '#007aff' : '#d1d1d6',
                                color: '#fff', border: 'none', borderRadius: 12, padding: '0 24px',
                                fontWeight: 700, fontSize: '1rem', cursor: manualCode.trim().length > 0 ? 'pointer' : 'not-allowed',
                                transition: '0.2s'
                            }}
                        >
                            確認
                        </button>
                    </form>
                </div>
            </div>
            <style>{`@keyframes qrPop { from { transform:scale(0.88);opacity:0 } to { transform:scale(1);opacity:1 } }`}</style>
        </div>
    );
}
