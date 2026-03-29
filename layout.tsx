import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: '打卡系統',
  description: '業務出勤管理平台',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '打卡系統',
  },
  applicationName: '打卡系統',
};

export const viewport: Viewport = {
  themeColor: '#FAFAFC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import GlobalUI from '@/components/GlobalUI';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <GlobalUI />
        {children}
      </body>
    </html>
  );
}
