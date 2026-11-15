import Link from 'next/link'
import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'

/**
 * Chrome for the Platform pages FuJue Harness Desktop opens in its own view.
 *
 * The embedded view is a single document without the dashboard sidebar, so the
 * bar only carries the brand, the signed-in address, and the way back.
 *
 * @param props - signed-in address and the page content.
 * @returns the standalone page frame.
 */
export function StandaloneShell({ email, children }: { readonly email: string; readonly children: ReactNode }) {
  return (
    <div className="fj-embed">
      <header className="fj-embed-bar">
        <Brand />
        <div className="fj-embed-bar-end">
          <span className="fj-embed-email fj-dim">{email}</span>
          <Link className="fj-embed-link" href="/app">
            Bảng điều khiển
          </Link>
        </div>
      </header>
      <main className="fj-embed-body">{children}</main>
      <footer className="fj-embed-foot">
        FuJue Platform · trang này dùng chung phiên đăng nhập với FuJue Harness Desktop
      </footer>
    </div>
  )
}
