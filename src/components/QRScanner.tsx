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
        ).catch(() => {
            setError('無法存取相機，請確認已授予相機權限。');
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
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📷</div>
                        <p style={{ fontWeight: 600, color: '#ff3b30', marginBottom: 8 }}>相機無法啟動</p>
                        <p style={{ fontSize: '0.85rem', color: '#86868b' }}>{error}</p>
                        <button
                            className="btn btn-secondary"
                            style={{ marginTop: 20 }}
                            onClick={onClose}
                        >關閉</button>
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
