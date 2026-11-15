'use client'

import { Avatar, Button, Dropdown, Menu, Tag } from '@arco-design/web-react'
import {
  IconApps, IconBook, IconClose, IconDashboard, IconDown, IconDownload, IconLock, IconMenu, IconMessage,
  IconPoweroff, IconSafe, IconSettings, IconStorage,
} from '@arco-design/web-react/icon'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'
import { useMobileNav } from '@/components/useMobileNav'

/** Account facts the shell renders in the sidebar and account menu. */
export interface ShellUser {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly avatarUrl: string | null
  readonly balanceUsd: string
  readonly bonusUsd: string
  /** Live desktop grants, so the shell can report whether the app is connected. */
  readonly desktopDevices: number
  /** Administrators see the console entry in the sidebar. */
  readonly isAdmin: boolean
}

const PRIMARY = [
  { href: '/app', label: 'Tổng quan', icon: <IconDashboard /> },
  { href: '/app/playground', label: 'Playground', icon: <IconMessage /> },
]

const RESOURCES = [
  { href: '/app/keys', label: 'Khoá API', icon: <IconLock /> },
  { href: '/app/usage', label: 'Sử dụng', icon: <IconStorage /> },
  { href: '/app/models', label: 'Mô hình', icon: <IconApps /> },
]

const WORKSPACE = [
  { href: '/app/settings', label: 'Cài đặt', icon: <IconSettings /> },
  { href: '/app/docs', label: 'Tài liệu', icon: <IconBook /> },
  { href: '/download', label: 'Tải Harness', icon: <IconDownload /> },
]

const ADMIN = [{ href: '/admin', label: 'Quản trị', icon: <IconSafe /> }]

/** One sidebar link. */
interface NavItem {
  readonly href: string
  readonly label: string
  readonly icon: ReactNode
}

const TITLES: Readonly<Record<string, { title: string; subtitle: string }>> = {
  '/app': { title: 'Tổng quan', subtitle: 'Số dư, chi phí và hoạt động gần đây' },
  '/app/keys': { title: 'Khoá API', subtitle: 'Tạo, xem và thu hồi khoá truy cập' },
  '/app/usage': { title: 'Sử dụng', subtitle: 'Token, chi phí và phân bổ theo mô hình' },
  '/app/models': { title: 'Mô hình', subtitle: 'Danh mục và giá của từng mô hình' },
  '/app/playground': { title: 'Playground', subtitle: 'Thử mô hình với số dư của bạn' },
  '/app/settings': { title: 'Cài đặt', subtitle: 'Hồ sơ, bảo mật và thanh toán' },
  '/app/docs': { title: 'Tài liệu', subtitle: 'API, Desktop và tích hợp' },
}

function isActive(pathname: string, href: string): boolean {
  return href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Authenticated dashboard shell: sidebar navigation, balance, and account menu.
 *
 * The sidebar stays a sidebar on phones: it slides in over the content from a
 * menu button in the top bar.
 *
 * @param props - signed-in account and the routed page.
 * @returns the dashboard layout.
 */
export function AppShell({ user, children }: { readonly user: ShellUser; readonly children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = useMobileNav()
  const page = TITLES[pathname] ?? { title: 'FuJue Platform', subtitle: 'Bảng điều khiển' }
  const total = Number(user.balanceUsd) + Number(user.bonusUsd)
  const initial = user.name.trim().charAt(0).toUpperCase() || 'F'

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  const menu = (
    <Menu
      onClickMenuItem={key => {
        if (key === 'settings') router.push('/app/settings')
        if (key === 'docs') router.push('/app/docs')
        if (key === 'admin') router.push('/admin')
        if (key === 'logout') void logout()
      }}
    >
      <Menu.Item key="email" disabled>
        <span style={{ fontSize: 12 }}>{user.email}</span>
      </Menu.Item>
      <Menu.Item key="settings">Cài đặt tài khoản</Menu.Item>
      <Menu.Item key="docs">Tài liệu</Menu.Item>
      {user.isAdmin ? <Menu.Item key="admin">Bảng quản trị</Menu.Item> : null}
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
      {nav.open ? (
        <button
          type="button"
          className="fj-scrim"
          aria-label="Đóng điều hướng"
          onClick={nav.close}
          tabIndex={-1}
        />
      ) : null}
      <aside
        id="fj-sidebar"
        className={`fj-sidebar${nav.open ? ' fj-sidebar--open' : ''}`}
      >
        <div className="fj-sidebar-top">
          <Brand />
          <button type="button" className="fj-icon-btn fj-sidebar-close" aria-label="Đóng điều hướng" onClick={nav.close}>
            <IconClose />
          </button>
          <Tag size="small" color="gray" className="fj-sidebar-beta">
            Beta
          </Tag>
        </div>
        {navGroup('Bảng điều khiển', PRIMARY)}
        {navGroup('Tài nguyên', RESOURCES)}
        {navGroup('Không gian', WORKSPACE)}
        {user.isAdmin ? navGroup('Quản trị', [...PRIMARY.slice(0, 0), ...ADMIN]) : null}
        <div className="fj-sidebar-foot">
          <div className="fj-balance-card">
            <span>Số dư khả dụng</span>
            <strong>${total.toFixed(2)}</strong>
            <div className="fj-dim" style={{ fontSize: 11, marginTop: 4 }}>
              Thưởng ${Number(user.bonusUsd).toFixed(2)} · Nạp ${Number(user.balanceUsd).toFixed(2)}
            </div>
            <Button size="small" type="primary" long style={{ marginTop: 12 }} href="/app/settings#billing">
              Nạp thêm
            </Button>
          </div>
          <div className="fj-dim" style={{ fontSize: 11, padding: '0 6px' }}>
            FuJue Platform v0.1 · Đồng bộ Desktop
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
              aria-controls="fj-sidebar"
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
          <div className="fj-row" style={{ gap: 10 }}>
            {user.desktopDevices > 0 ? (
              <Tag color="green" size="small" className="fj-device-tag">
                {user.desktopDevices} thiết bị Desktop
              </Tag>
            ) : (
              <Tag color="gray" size="small" className="fj-device-tag">
                Chưa kết nối Desktop
              </Tag>
            )}
            <Dropdown droplist={menu} position="br" trigger="click">
              <button type="button" className="fj-account-btn" aria-label="Mở menu tài khoản">
                <Avatar size={28} style={{ background: 'var(--fj-accent)', color: '#fff', fontWeight: 600 }}>
                  {initial}
                </Avatar>
                <span className="fj-account-name">{user.name}</span>
                <IconDown style={{ fontSize: 12, opacity: 0.6 }} />
              </button>
            </Dropdown>
          </div>
        </header>
        <main className="fj-content">{children}</main>
      </div>
    </div>
  )
}
