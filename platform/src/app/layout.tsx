import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Providers } from '@/components/Providers'
import '@arco-design/web-react/dist/css/arco.css'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'FuJue Platform · Nền tảng AI cho FuJue Harness',
    template: '%s · FuJue Platform',
  },
  description:
    'Tài khoản, khoá API, đo lường sử dụng và cổng mô hình cho FuJue Harness. Đăng nhập một lần, Desktop và API dùng chung một phiên.',
  applicationName: 'FuJue Platform',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#f7f8fa',
  width: 'device-width',
  initialScale: 1,
}

/**
 * Root document: light Arco theme, Vietnamese locale, and global styles.
 *
 * @param props - the routed page tree.
 * @returns the HTML shell.
 */
export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
