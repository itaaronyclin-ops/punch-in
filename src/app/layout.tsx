import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'V-Link',
  description: '全方位業務連接平台',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'V-Link',
  },
  applicationName: 'V-Link',
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
