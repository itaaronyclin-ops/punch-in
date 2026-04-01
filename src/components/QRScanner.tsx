'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconX, IconCamera } from '@/components/Icons';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
}

const SCANNER_ID = 'qr-camera-reader';

export default function QRScanner({ onScan, onClose, title = '掃描 QR Code' }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null);
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
                onScan(decoded);
            },
            () => { /* ignore per-frame errors */ }
        ).catch((e: Error) => {
            const isNotAllowed = e?.name === 'NotAllowedError' || e?.message?.includes('NotAllowedError');
            if (isNotAllowed) {
                setError('系統阻擋了相機權限！若您在 LINE 或無痕模式中，請點選右上角「以 Safari 開啟」並允許相機權限。');
            } else {
                setError('無法存取相機，請確認已授予權限，且不在封閉的 App 內建瀏覽器中。');
            }
        });

        return () => {
            scanner.stop().catch(() => {});
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                background: 'white', borderRadius: 24,
                width: '100%', maxWidth: 420,
                overflow: 'hidden',
                boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
                animation: 'qrPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid #f2f2f7',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconCamera size={20} color="#007aff" />
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1d1d1f' }}>{title}</span>
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

                {/* Body */}
                {error ? (
                    <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📷</div>
                        <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ff3b30', marginBottom: 16 }}>相機無法啟動</p>
                        <div style={{ background: '#fff0f0', borderRadius: 12, padding: '16px', border: '1px solid #ffcccc', textAlign: 'left', marginBottom: 20 }}>
                            <p style={{ fontSize: '0.9rem', color: '#d70015', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>{error}</p>
                            <p style={{ fontSize: '0.85rem', color: '#86868b', margin: '12px 0 0 0', lineHeight: 1.5 }}>
                                • LINE/FB 等內建網頁<b>無法</b>使用相機<br/>
                                • Safari <b>無痕模式</b>可能強制封鎖相機<br/>
                                • 請改用一般模式的 Safari 或 Chrome 打開
                            </p>
                        </div>
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', padding: 14, borderRadius: 12 }}
                            onClick={onClose}
                        >關閉掃描器</button>
                    </div>
                ) : (
                    <>
                        <div id={SCANNER_ID} style={{ width: '100%', minHeight: 280, background: '#000' }} />
                        <div style={{ padding: 16, textAlign: 'center', color: '#86868b', fontSize: '0.88rem' }}>
                            請將 QR Code 對準鏡頭中央
                        </div>
                    </>
                )}
            </div>
            <style>{`@keyframes qrPop { from { transform:scale(0.88);opacity:0 } to { transform:scale(1);opacity:1 } }`}</style>
        </div>
    );
}
