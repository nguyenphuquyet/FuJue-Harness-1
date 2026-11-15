'use client'

import { Alert, Button, Empty, Table, Tag } from '@arco-design/web-react'
import { IconArrowRight, IconLock, IconPlus, IconStorage, IconThunderbolt } from '@arco-design/web-react/icon'
import type { TableColumnProps } from '@arco-design/web-react'
import Link from 'next/link'
import type { ApiKeySummary } from '@/lib/tokens'
import { formatCount, formatDateTime, formatDayLabel, formatTokens, formatUsd } from '@/lib/format'
import type { UsageEntry, UsageSummary } from '@/lib/usage'
import type { NotificationPayload } from '@/lib/notifications'

/** Account facts the overview greeting and balance card render. */
interface OverviewUser {
  readonly name: string
  readonly balanceUsd: string
  readonly bonusUsd: string
}

const sourceLabel: Record<UsageEntry['source'], string> = {
  playground: 'Playground',
  api: 'API',
  desktop: 'Desktop',
}

/**
 * Dashboard overview: balances, 30-day totals, cost chart, recent requests, and shortcuts.
 *
 * @param props - account, usage aggregates, keys, and unconsumed notifications.
 * @returns the overview page content.
 */
export function OverviewView({
  user,
  summary,
  keys,
  notifications,
}: {
  readonly user: OverviewUser
  readonly summary: UsageSummary
  readonly keys: readonly ApiKeySummary[]
  readonly notifications: readonly NotificationPayload[]
}) {
  const total = Number(user.balanceUsd) + Number(user.bonusUsd)
  const first = user.name.trim().split(/\s+/).at(-1) ?? user.name
  const maxCost = Math.max(...summary.daily.map(bucket => bucket.costUsd), 0.000001)
  const activeKeys = keys.filter(key => key.revokedAt === null)
  const notice = notifications[0]

  const columns: TableColumnProps<UsageEntry>[] = [
    {
      title: 'Mô hình',
      dataIndex: 'modelName',
      ellipsis: true,
      render: (_value, entry) => (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 550 }}>{entry.modelName}</div>
          <div className="fj-dim" style={{ fontSize: 11, fontFamily: 'var(--fj-mono)' }}>
            {entry.model}
          </div>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      width: 110,
      render: value => <Tag size="small" color={value === 'desktop' ? 'green' : value === 'api' ? 'arcoblue' : 'purple'}>{sourceLabel[value as UsageEntry['source']]}</Tag>,
    },
    {
      title: 'Token',
      dataIndex: 'tokens',
      width: 90,
      align: 'right',
      render: value => formatTokens(Number(value)),
    },
    {
      title: 'Chi phí',
      dataIndex: 'costUsd',
      width: 100,
      align: 'right',
      render: value => formatUsd(Number(value)),
    },
    {
      title: 'Thời điểm',
      dataIndex: 'createdAt',
      width: 150,
      ellipsis: true,
      render: value => <span className="fj-dim" style={{ fontSize: 12 }}>{formatDateTime(String(value))}</span>,
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Xin chào, {first}.</h1>
          <p>Đây là toàn bộ hoạt động của tài khoản trong 30 ngày gần nhất.</p>
        </div>
        <div className="fj-row">
          <Button type="primary" href="/app/playground">
            <IconThunderbolt /> Mở Playground
          </Button>
          <Button href="/app/keys">
            <IconPlus /> Tạo khoá
          </Button>
        </div>
      </div>

      {notice === undefined ? null : (
        <Alert
          type="info"
          showIcon
          content={
            <div className="fj-spread">
              <div>
                <strong style={{ fontSize: 13.5 }}>{notice.title}</strong>
                <div className="fj-muted" style={{ fontSize: 13, marginTop: 4 }}>
                  {notice.body}
                </div>
              </div>
              <Link href="/app/docs" className="fj-row" style={{ gap: 6, fontSize: 13, color: 'var(--fj-accent)', flex: 'none' }}>
                Tìm hiểu <IconArrowRight />
              </Link>
            </div>
          }
        />
      )}

      <div className="fj-stats">
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Số dư khả dụng
          </div>
          <div className="fj-stat-value">${total.toFixed(2)}</div>
          <div className="fj-stat-foot">
            Thưởng ${Number(user.bonusUsd).toFixed(2)} · Nạp ${Number(user.balanceUsd).toFixed(2)}
          </div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconStorage /> Chi tiêu 30 ngày
          </div>
          <div className="fj-stat-value">{formatUsd(summary.totals.costUsd)}</div>
          <div className="fj-stat-foot">Tính theo giá niêm yết của từng mô hình</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Token đã dùng
          </div>
          <div className="fj-stat-value">{formatTokens(summary.totals.tokens)}</div>
          <div className="fj-stat-foot">Token vào và ra cộng lại</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconLock /> Yêu cầu
          </div>
          <div className="fj-stat-value">{formatCount(summary.totals.requests)}</div>
          <div className="fj-stat-foot">
            {activeKeys.length} khoá đang hoạt động
          </div>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Chi phí theo ngày</h2>
            <p>30 ngày gần nhất · đơn vị USD</p>
          </div>
          <Tag color="arcoblue">{formatUsd(summary.daily.reduce((sum, bucket) => sum + bucket.costUsd, 0))}</Tag>
        </div>
        {summary.totals.requests === 0 ? (
          <Empty description="Chưa có yêu cầu nào. Mở Playground để bắt đầu." />
        ) : (
          <div className="fj-bars" role="img" aria-label="Biểu đồ chi phí theo ngày">
            {summary.daily.map((bucket, index) => (
              <div key={bucket.date} className="fj-bar-col" title={`${formatDayLabel(bucket.date)} · ${formatUsd(bucket.costUsd)} · ${formatCount(bucket.requests)} yêu cầu`}>
                <div className="fj-bar" style={{ height: `${Math.max(3, (bucket.costUsd / maxCost) * 150)}px` }} />
                <span className="fj-bar-label">{index % 5 === 0 ? formatDayLabel(bucket.date) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Yêu cầu gần đây</h2>
            <p>Mọi nguồn: Playground, API và Desktop</p>
          </div>
          <Button size="small" href="/app/usage">
            Xem tất cả
          </Button>
        </div>
        {summary.recent.length === 0 ? (
          <Empty description="Chưa có yêu cầu" />
        ) : (
          <Table
            data={summary.recent.slice(0, 6)}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="small"
            border={false}
          />
        )}
      </section>

      <div className="fj-grid fj-grid--2" style={{ alignItems: 'start' }}>
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Khoá API</h2>
              <p>{activeKeys.length} khoá đang hoạt động</p>
            </div>
            <Button size="small" href="/app/keys">
              Quản lý
            </Button>
          </div>
          {keys.length === 0 ? (
            <Empty description="Chưa có khoá nào" />
          ) : (
            keys.slice(0, 3).map(key => (
              <div key={key.id} className="fj-list-row">
                <div className="fj-list-title">
                  <IconLock style={{ color: 'var(--fj-accent)' }} />
                  <div>
                    <div>{key.name}</div>
                    <div className="fj-dim" style={{ fontSize: 11 }}>
                      {key.revokedAt === null ? 'Đang hoạt động' : 'Đã thu hồi'}
                    </div>
                  </div>
                </div>
                <span className="fj-key-chip">{key.prefix}…</span>
              </div>
            ))
          )}
        </section>

        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Bắt đầu nhanh</h2>
              <p>Ba việc nên làm tiếp theo</p>
            </div>
          </div>
          <div className="fj-quick">
            <Link href="/app/keys">
              <strong>Tạo khoá API</strong>
              <span>Gọi mô hình từ ứng dụng của bạn</span>
            </Link>
            <Link href="/app/playground">
              <strong>Thử mô hình</strong>
              <span>So sánh Flash và Pro</span>
            </Link>
            <Link href="/app/docs#desktop">
              <strong>Nối Desktop</strong>
              <span>Cấu hình platformOrigin</span>
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
