import type { Metadata } from 'next';
import './global.css';
import { ACONGM_THEME_BOOT_SCRIPT } from '@/lib/theme';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3200',
  ),
  title: {
    default: 'Acongm Chat',
    template: '%s | Acongm Chat',
  },
  description: '知识库 AI 对话 — 按模块与文章隔离上下文',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ACONGM_THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
