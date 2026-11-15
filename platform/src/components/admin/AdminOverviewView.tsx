'use client'

import { Button, Tag } from '@arco-design/web-react'
import {
  IconApps, IconArrowRight, IconDownload, IconNotification, IconStorage, IconThunderbolt, IconUser,
} from '@arco-design/web-react/icon'
import Link from 'next/link'
import type { AdminTotals, AdminUsage, AdminUserRow, AuditEntry } from '@/lib/admin'
import { formatCount, formatDayLabel, formatTokens, formatUsd } from '@/lib/format'

/**
 * Admin overview: platform counters, recent sign-ups, and the audit tail.
 *
 * @param props - totals, usage series, newest accounts, and the audit tail.
 * @returns the admin landing content.
 */
export function AdminOverviewView({
  totals,
  usage,
  users,
  audit,
}: {
  readonly totals: AdminTotals
  readonly usage: AdminUsage
  readonly users: readonly AdminUserRow[]
  readonly audit: readonly AuditEntry[]
}) {
  const maxCost = Math.max(...usage.daily.map(bucket => bucket.costUsd), 0.0001)
  const recentUsers = users.slice(0, 6)

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Tổng quan quản trị</h1>
          <p>Tài khoản, danh mục mô hình và chi phí của toàn bộ nền tảng.</p>
        </div>
        <div className="fj-row" style={{ gap: 10 }}>
          <Button href="/admin/models">Quản lý mô hình</Button>
          <Button type="primary" href="/admin/users">
            Quản lý người dùng <IconArrowRight />
          </Button>
        </div>
      </div>

      <div className="fj-stats">
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconUser /> Tài khoản
          </div>
          <div className="fj-stat-value">{formatCount(totals.users)}</div>
          <div className="fj-stat-foot">
            {formatCount(totals.activeUsers)} đang hoạt động · {formatCount(totals.signups7d)} mới trong 7 ngày
          </div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconStorage /> Thiết bị Desktop
          </div>
          <div className="fj-stat-value">{formatCount(totals.desktopDevices)}</div>
          <div className="fj-stat-foot">{formatCount(totals.apiKeys)} khoá API đang hoạt động</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Yêu cầu 24 giờ
          </div>
          <div className="fj-stat-value">{formatCount(totals.requests24h)}</div>
          <div className="fj-stat-foot">
            {formatTokens(totals.tokens24h)} token · {formatUsd(totals.cost24h)}
          </div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconApps /> Chi phí 30 ngày
          </div>
          <div className="fj-stat-value">{formatUsd(totals.cost30d)}</div>
          <div className="fj-stat-foot">
            {formatCount(totals.models)} mô hình · {formatCount(totals.providers)} nhà cung cấp
          </div>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Chi phí 14 ngày</h2>
            <p>Đơn vị USD, tổng theo ngày</p>
          </div>
          <Link href="/admin/usage" className="fj-link-inline">
            Xem chi tiết <IconArrowRight />
          </Link>
        </div>
        <div className="fj-bars" style={{ height: 180 }} role="img" aria-label="Biểu đồ chi phí 14 ngày">
          {usage.daily.map((bucket, index) => (
            <div
              key={bucket.date}
              className="fj-bar-col"
              title={`${formatDayLabel(bucket.date)} · ${formatUsd(bucket.costUsd)} · ${formatCount(bucket.requests)} yêu cầu`}
            >
              <div className="fj-bar" style={{ height: `${Math.max(3, (bucket.costUsd / maxCost) * 155)}px` }} />
              <span className="fj-bar-label">
                {index % Math.ceil(usage.daily.length / 7) === 0 ? formatDayLabel(bucket.date) : ''}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="fj-grid fj-grid--2">
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Tài khoản mới</h2>
              <p>Xếp theo ngày đăng ký</p>
            </div>
            <Link href="/admin/users" className="fj-link-inline">
              Tất cả <IconArrowRight />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="fj-muted">Chưa có tài khoản nào.</p>
          ) : (
            recentUsers.map(user => (
              <div key={user.id} className="fj-list-row">
                <div className="fj-list-title">
                  <span className="fj-avatar-sm">{user.name.trim().charAt(0).toUpperCase() || 'F'}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 550 }}>{user.name}</div>
                    <div className="fj-dim" style={{ fontSize: 12 }}>
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="fj-row" style={{ gap: 8 }}>
                  {user.role === 'admin' ? (
                    <Tag size="small" color="arcoblue">
                      Quản trị
                    </Tag>
                  ) : null}
                  <span className="fj-dim" style={{ fontSize: 12 }}>
                    {formatUsd(Number(user.balanceUsd) + Number(user.bonusUsd))}
                  </span>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Nhật ký quản trị</h2>
              <p>Thay đổi gần đây</p>
            </div>
            <Link href="/admin/audit" className="fj-link-inline">
              Tất cả <IconArrowRight />
            </Link>
          </div>
          {audit.length === 0 ? (
            <p className="fj-muted">Chưa có thao tác quản trị nào.</p>
          ) : (
            audit.map(entry => (
              <div key={entry.id} className="fj-list-row">
                <div className="fj-list-title">
                  <IconNotification style={{ color: 'var(--fj-dim)' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 550 }}>{entry.action}</div>
                    <div className="fj-dim" style={{ fontSize: 12 }}>
                      {entry.detail || entry.subject}
                    </div>
                  </div>
                </div>
                <span className="fj-dim" style={{ fontSize: 12 }}>
                  {new Date(entry.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="fj-quick">
        <Link href="/admin/providers">
          <strong>Nhà cung cấp</strong>
          <span>Thêm dịch vụ mô hình bên thứ ba và khoá API</span>
        </Link>
        <Link href="/admin/notifications">
          <strong>Thông báo Desktop</strong>
          <span>Gửi thông điệp tới người dùng trong ứng dụng</span>
        </Link>
        <Link href="/admin/downloads">
          <strong>Tải ứng dụng</strong>
          <span>Cập nhật liên kết cài FuJue Harness</span>
        </Link>
      </div>
    </>
  )
}
