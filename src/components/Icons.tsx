// Shared loading components
export function LoadingState({ label = '載入中...' }: { label?: string }) {
    return (
        <div className="loading-state">
            <div className="loading-ring" />
            <span className="loading-label">{label}</span>
        </div>
    );
}

export function SkeletonRows({ cols = 4, rows = 3 }: { cols?: number; rows?: number }) {
    const widths = ['60%', '80%', '40%', '70%', '55%', '90%'];
    return (
        <>
            {Array.from({ length: rows }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                    {Array.from({ length: cols }).map((_, j) => (
                        <td key={j}>
                            <div className="skeleton-block" style={{ width: widths[(i * cols + j) % widths.length] }} />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}

// Minimal SF-Symbols-inspired SVG icons (24×24 viewBox, stroke-based)
const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function IconCheckCircle({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg>;
}

export function IconRun({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><circle cx="13" cy="4" r="1.5" /><path d="M6 20l4-8 2 3 3-5 3 5" /><path d="M8 12l2-4 3 2" /></svg>;
}

export function IconBriefcase({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><line x1="12" y1="12" x2="12" y2="12" /></svg>;
}

export function IconCalendarOff({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><path d="M9 16l2 2 4-4" strokeWidth={1.6} /></svg>;
}

export function IconMapPin({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
}

export function IconSearch({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}

export function IconGrid({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
}

export function IconUsers({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

export function IconClipboard({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>;
}

export function IconInbox({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
}

export function IconCalendar({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

export function IconSettings({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
}

export function IconMessageSquare({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

export function IconShield({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

export function IconLogo({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12l2 2 4-4" /></svg>;
}

export function IconChevronRight({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><polyline points="9 18 15 12 9 6" /></svg>;
}

export function IconDownload({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

export function IconPlus({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

export function IconX({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

export function IconEdit({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
}

export function IconTrash({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
}

export function IconLogOut({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

export function IconCheck({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><polyline points="20 6 9 17 4 12" /></svg>;
}

export function IconAlertTriangle({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
}

export function IconDatabase({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
}

export function IconLock({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}

export function IconClock({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>;
}

export function IconSend({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>;
}

export function IconBell({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}

export function IconInfo({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
}

export function IconRefreshCw({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}

export function IconQrcode({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3m3 0h0m0 3h-3m3 3h-3m0-3h-3m3 0v3m-3-3v3m3-6v3" /></svg>;
}

export function IconCamera({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="3" /></svg>;
}

export function IconEye({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export function IconShieldCheck({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>;
}

export function IconUserEdit({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
    return <svg {...props} width={size} height={size} stroke={color}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M18 10l3 3-5 5-2-2 4-6z" /></svg>;
}
