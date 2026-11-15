'use client'

import { Button } from '@arco-design/web-react'
import { IconArrowRight } from '@arco-design/web-react/icon'
import Link from 'next/link'
import { Brand } from './Brand'

/**
 * Public site header with the primary navigation and account entry points.
 *
 * @param props - `signedIn` swaps the calls to action for the dashboard link.
 * @returns the sticky header.
 */
export function SiteHeader({ signedIn = false }: { readonly signedIn?: boolean }) {
  return (
    <header className="fj-header">
      <div className="fj-container fj-header-inner">
        <Brand />
        <nav className="fj-nav" aria-label="Điều hướng chính">
          <Link href="/#features">Tính năng</Link>
          <Link href="/#models">Mô hình</Link>
          <Link href="/#pricing">Bảng giá</Link>
          <Link href="/docs">Tài liệu</Link>
          <Link href="/download">Tải ứng dụng</Link>
        </nav>
        <div className="fj-header-actions">
          {signedIn ? (
            <Button type="primary" href="/app">
              Mở bảng điều khiển <IconArrowRight />
            </Button>
          ) : (
            <>
              <Link className="fj-link-btn" href="/login">
                Đăng nhập
              </Link>
              <Button type="primary" href="/register">
                Bắt đầu miễn phí
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
