'use client'

import { Dropdown, Menu, Tag } from '@arco-design/web-react'
import {
  IconApps, IconClose, IconDashboard, IconDown, IconDownload, IconMenu, IconNotification, IconPoweroff,
  IconSafe, IconSettings, IconStorage, IconUser, IconBook,
} from '@arco-design/web-react/icon'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { useMobileNav } from '@/components/useMobileNav'

const PRIMARY = [
  { href: '/admin', label: 'Tổng quan', icon: <IconDashboard /> },
  { href: '/admin/users', label: 'Người dùng', icon: <IconUser /> },
]

const CATALOG = [
  { href: '/admin/models', label: 'Mô hình', icon: <IconApps /> },
  { href: '/admin/providers', label: 'Nhà cung cấp', icon: <IconStorage /> },
]

const OPERATIONS = [
  { href: '/admin/usage', label: 'Sử dụng', icon: <IconBook /> },
  { href: '/admin/notifications', label: 'Thông báo', icon: <IconNotification /> },
  { href: '/admin/audit', label: 'Nhật ký', icon: <IconSafe /> },
  { href: '/admin/downloads', label: 'Tải ứng dụng', icon: <IconDownload /> },
]

/** One sidebar link. */
interface NavItem {
  readonly href: string
  readonly label: string
  readonly icon: ReactNode
}

const TITLES: Readonly<Record<string, { title: string; subtitle: string }>> = {
  '/admin': { title: 'Tổng quan quản trị', subtitle: 'Tài khoản, mô hình và hoạt động toàn nền tảng' },
  '/admin/users': { title: 'Người dùng', subtitle: 'Vai trò, trạng thái và số dư' },
  '/admin/models': { title: 'Mô hình', subtitle: 'Danh mục, giá và ánh xạ nhà cung cấp' },
  '/admin/providers': { title: 'Nhà cung cấp', subtitle: 'Dịch vụ mô hình bên thứ ba' },
  '/admin/usage': { title: 'Sử dụng', subtitle: 'Doanh thu, token và phân bổ toàn nền tảng' },
  '/admin/notifications': { title: 'Thông báo', subtitle: 'Thông điệp hiển thị trong ứng dụng Desktop' },
  '/admin/audit': { title: 'Nhật ký quản trị', subtitle: 'Mọi thay đổi do quản trị viên thực hiện' },
  '/admin/downloads': { title: 'Tải ứng dụng', subtitle: 'Bản cài FuJue Harness hiển thị công khai' },
}

function isActive(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Admin console shell with the same drawer sidebar behaviour as the dashboard.
 *
 * @param props - administrator identity and the routed page.
 * @returns the admin layout.
 */
export function AdminShell({ email, children }: { readonly email: string; readonly children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = useMobileNav()
  const page = TITLES[pathname] ?? { title: 'Quản trị', subtitle: 'FuJue Platform' }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  const menu = (
    <Menu
      onClickMenuItem={key => {
        if (key === 'dashboard') router.push('/app')
        if (key === 'settings') router.push('/app/settings')
        if (key === 'logout') void logout()
      }}
    >
      <Menu.Item key="email" disabled>
        <span style={{ fontSize: 12 }}>{email}</span>
      </Menu.Item>
      <Menu.Item key="dashboard">Bảng điều khiển</Menu.Item>
      <Menu.Item key="settings">Cài đặt tài khoản</Menu.Item>
      <Menu.Item key="logout">
        <span className="fj-row" style={{ gap: 8 }}>
          <IconPoweroff /> Đăng xuất
        </span>
      </Menu.Item>
    </Menu>
  )

  const navGroup = (label: string, items: readonly NavItem[]) => (
    <div>
      <div className="fj-sidebar-label">{label}</div>
      <nav className="fj-sidebar-nav" aria-label={label}>
        {items.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`fj-navitem${isActive(pathname, item.href) ? ' fj-navitem--active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="fj-shell">
      <button type="button" className="fj-scrim" aria-label="Đóng điều hướng" onClick={nav.close} tabIndex={-1} />
      <aside id="fj-admin-sidebar" className={`fj-sidebar${nav.open ? ' fj-sidebar--open' : ''}`}>
        <div className="fj-sidebar-top">
          <Brand />
          <button
            type="button"
            className="fj-icon-btn fj-sidebar-close"
            aria-label="Đóng điều hướng"
            onClick={nav.close}
          >
            <IconClose />
          </button>
          <Tag size="small" color="arcoblue" className="fj-sidebar-beta">
            Quản trị
          </Tag>
        </div>
        {navGroup('Quản trị', PRIMARY)}
        {navGroup('Danh mục', CATALOG)}
        {navGroup('Vận hành', OPERATIONS)}
        <div className="fj-sidebar-foot">
          <Link href="/app" className="fj-navitem">
            <IconSettings />
            Về bảng điều khiển
          </Link>
          <div className="fj-dim" style={{ fontSize: 11, padding: '0 6px' }}>
            {email}
          </div>
        </div>
      </aside>

      <div className="fj-main">
        <header className="fj-topbar">
          <div className="fj-topbar-lead">
            <button
              type="button"
              className="fj-icon-btn fj-menu-btn"
              aria-label="Mở điều hướng"
              aria-controls="fj-admin-sidebar"
              aria-expanded={nav.open}
              onClick={nav.toggle}
            >
              <IconMenu />
            </button>
            <div>
              <div className="fj-topbar-title">{page.title}</div>
              <div className="fj-topbar-sub">{page.subtitle}</div>
            </div>
          </div>
          <Dropdown droplist={menu} position="br" trigger="click">
            <button type="button" className="fj-account-btn" aria-label="Mở menu tài khoản">
              <span className="fj-admin-avatar">Q</span>
              <span className="fj-account-name">{email}</span>
              <IconDown style={{ fontSize: 12, opacity: 0.6 }} />
            </button>
          </Dropdown>
        </header>
        <main className="fj-content">{children}</main>
      </div>
    </div>
  )
}
