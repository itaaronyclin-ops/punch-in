'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { IconX, IconCamera } from '@/components/Icons';

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    title?: string;
}

export default function QRScanner({ onScan, onClose, title = '掃描 QR Code' }: QRScannerProps) {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scannerRef.current.render(
            (decodedText) => {
                // Success
                onScan(decodedText);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error);
                }
            },
            (errorMessage) => {
                // Ignore frequent scan errors
                // console.log(errorMessage);
            }
        );

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, []);

    return (
        <div className="scanner-overlay">
            <div className="scanner-modal">
                <div className="scanner-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconCamera size={20} color="var(--blue)" />
                        <span className="scanner-title">{title}</span>
                    </div>
                    <button className="scanner-close" onClick={onClose}><IconX size={20} /></button>
                </div>
                
                <div id="reader" style={{ width: '100%' }}></div>
                
                <div className="scanner-footer">
                    <p>請將 QR Code 對準鏡頭中央</p>
                </div>
            </div>

            <style jsx>{`
                .scanner-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(4px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .scanner-modal {
                    background: white;
                    border-radius: 24px;
                    width: 100%;
                    max-width: 450px;
                    overflow: hidden;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.2);
                    animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes modalPop {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .scanner-header {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #f2f2f7;
                }
                .scanner-title {
                    font-weight: 700;
                    font-size: 1.05rem;
                    color: #1d1d1f;
                }
                .scanner-close {
                    background: #f2f2f7;
                    border: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                #reader {
                    border: none !important;
                }
                #reader__scan_region {
                    background: #000;
                }
                .scanner-footer {
                    padding: 20px;
                    text-align: center;
                    color: #86868b;
                    font-size: 0.9rem;
                }
            `}</style>
        </div>
    );
}
