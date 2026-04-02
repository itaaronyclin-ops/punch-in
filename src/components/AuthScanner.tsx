'use client';

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { IconX, IconQrcode } from '@/components/Icons';

interface AuthScannerProps {
    onCodeSubmited: (code: string) => void;
    onClose: () => void;
    title?: string;
    standalone?: boolean;
}

export default function AuthScanner({ onCodeSubmited, onClose, title = '🔑 掃碼 / 輸入授權', standalone = false }: AuthScannerProps) {
    const [error, setError] = useState<string | null>(null);

    
    // Custom scanner references
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const isScanningRef = useRef(true);

    // Stop all media tracks and cancel loops
    const cleanupCamera = () => {
        isScanningRef.current = false;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        let isMounted = true;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                if (!isMounted) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.setAttribute('playsinline', 'true'); // necessary for iOS Safari
                    videoRef.current.play().catch(() => {});
                }

                const tick = () => {
                    if (!isScanningRef.current || !isMounted) return;
                    const video = videoRef.current;
                    const canvas = canvasRef.current;
                    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
                        // Dynamically adjust canvas to match video internal resolution
                        canvas.height = video.videoHeight;
                        canvas.width = video.videoWidth;
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            // Pure JS payload processing
                            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                                inversionAttempts: 'dontInvert'
                            });
                            
                            if (code && code.data) {
                                cleanupCamera();
                                onCodeSubmited(code.data);
                                return; 
                            }
                        }
                    }
                    animFrameRef.current = requestAnimationFrame(tick);
                };
                animFrameRef.current = requestAnimationFrame(tick);
            })
            .catch((e: Error) => {
                if (!isMounted) return;
                console.warn("Camera init failed:", e);
                // Graceful fallback purely to UI keyboard layout
                setError('無法存取相機，或您處於封閉瀏覽器中。請直接使用下方輸入框輸入打字！');
            });

        return () => {
            isMounted = false;
            cleanupCamera();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps



    return (
        <div style={standalone ? {
            width: '100%', height: '100%', background: '#f2f2f7', overflowY: 'auto'
        } : {
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div style={standalone ? {
                background: '#f2f2f7',
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column'
            } : {
                background: '#f2f2f7', borderRadius: 24,
                width: '100%', maxWidth: 420,
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 30px 60px rgba(0,0,0,0.25)',
                animation: 'qrPop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'flex', flexDirection: 'column'
            }}>
                {/* Header: Hide if standalone as parent provides navigation */}
                {!standalone && (
                    <div style={{
                        padding: '16px 20px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#fff', borderBottom: '1px solid #e5e5ea',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <IconQrcode size={20} color="#007aff" />
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1d1d1f' }}>{title}</span>
                        </div>
                        <button
                            onClick={() => { cleanupCamera(); onClose(); }}
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
                )}

                {/* Body: Native Camera UI (Top) */}
                <div style={{ 
                    background: '#000', position: 'relative', flexShrink: 0,
                    // Use larger area if standalone
                    width: '100%', height: standalone ? '400px' : '240px', overflow: 'hidden'
                 }}>
                    {error ? (
                        <div style={{ padding: '32px 20px', textAlign: 'center', background: '#fff', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🚫</div>
                            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ff3b30', marginBottom: 12 }}>相機無法啟動</p>
                            <p style={{ fontSize: '0.85rem', color: '#d70015', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Hidden canvas for computing standard frame sizes independent of layout shape */}
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            
                            {/* Object-fit automatically handles dynamic CSS vs standard pixel dimension mapping */}
                            <video 
                                ref={videoRef} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                autoPlay playsInline muted 
                            />
                            
                            <div style={{ 
                                position: 'absolute', bottom: 12, left: 0, right: 0, 
                                textAlign: 'center', color: '#fff', fontSize: '0.85rem', textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                                fontWeight: 500
                            }}>
                                聚焦並對準條碼即可自動填寫
                            </div>
                        </>
                    )}
                </div>


            </div>
            <style>{`@keyframes qrPop { from { transform:scale(0.88);opacity:0 } to { transform:scale(1);opacity:1 } }`}</style>
        </div>
    );
}
