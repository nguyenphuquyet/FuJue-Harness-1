'use client'

import { Button, Empty, Radio, Table, Tag } from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconLock, IconStorage, IconThunderbolt } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { formatCount, formatDayLabel, formatDateTime, formatTokens, formatUsd } from '@/lib/format'
import type { UsageEntry, UsageGroup, UsageSummary } from '@/lib/usage'

const sourceLabel: Record<UsageEntry['source'], string> = {
  playground: 'Playground',
  api: 'API',
  desktop: 'Desktop',
}

/**
 * Usage dashboard with window filters, a daily chart, and rollups by model, key, and request.
 *
 * @param props - aggregates, the route that re-renders the window filter, and whether to offer the Playground shortcut.
 * @returns the usage page content.
 */
export function UsageView({
  summary,
  basePath = '/app/usage',
  showPlayground = true,
}: {
  readonly summary: UsageSummary
  readonly basePath?: string
  readonly showPlayground?: boolean
}) {
  const router = useRouter()
  const maxCost = Math.max(...summary.daily.map(bucket => bucket.costUsd), 0.000001)

  const groupColumns: TableColumnProps<UsageGroup>[] = [
    {
      title: 'Tên',
      dataIndex: 'label',
      render: value => <span style={{ fontWeight: 520 }}>{String(value)}</span>,
    },
    {
      title: 'Yêu cầu',
      dataIndex: 'requests',
      width: 100,
      align: 'right',
      render: value => formatCount(Number(value)),
    },
    {
      title: 'Token',
      dataIndex: 'tokens',
      width: 100,
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
  ]

  const recentColumns: TableColumnProps<UsageEntry>[] = [
    {
      title: 'Mô hình',
      dataIndex: 'modelName',
      render: (_value, entry) => (
        <div>
          <div style={{ fontWeight: 540 }}>{entry.modelName}</div>
          <span className="fj-dim" style={{ fontSize: 11, fontFamily: 'var(--fj-mono)' }}>
            {entry.model}
          </span>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      width: 120,
      render: value => (
        <Tag size="small" color={value === 'desktop' ? 'green' : value === 'api' ? 'arcoblue' : 'purple'}>
          {sourceLabel[value as UsageEntry['source']]}
        </Tag>
      ),
    },
    {
      title: 'Token',
      dataIndex: 'tokens',
      width: 100,
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
      width: 160,
      render: value => <span className="fj-dim" style={{ fontSize: 12 }}>{formatDateTime(String(value))}</span>,
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Sử dụng</h1>
          <p>Mọi yêu cầu đều được ghi nhận khi hoàn tất, kể cả phản hồi stream.</p>
        </div>
        <Radio.Group
          type="button"
          value={summary.days}
          onChange={value => router.push(`${basePath}?days=${Number(value)}`)}
        >
          <Radio value={7}>7 ngày</Radio>
          <Radio value={14}>14 ngày</Radio>
          <Radio value={30}>30 ngày</Radio>
          <Radio value={90}>90 ngày</Radio>
        </Radio.Group>
      </div>

      <div className="fj-stats">
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Tổng chi phí
          </div>
          <div className="fj-stat-value">{formatUsd(summary.totals.costUsd)}</div>
          <div className="fj-stat-foot">Trong {summary.days} ngày</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconStorage /> Token
          </div>
          <div className="fj-stat-value">{formatTokens(summary.totals.tokens)}</div>
          <div className="fj-stat-foot">Vào và ra cộng lại</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconLock /> Yêu cầu
          </div>
          <div className="fj-stat-value">{formatCount(summary.totals.requests)}</div>
          <div className="fj-stat-foot">Trung bình {formatTokens(summary.totals.requests === 0 ? 0 : summary.totals.tokens / summary.totals.requests)}/yêu cầu</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Chi phí trung bình
          </div>
          <div className="fj-stat-value">{formatUsd(summary.totals.requests === 0 ? 0 : summary.totals.costUsd / summary.totals.requests)}</div>
          <div className="fj-stat-foot">Mỗi yêu cầu</div>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Chi phí theo ngày</h2>
            <p>{summary.days} ngày · đơn vị USD</p>
          </div>
        </div>
        {summary.totals.requests === 0 ? (
          <Empty description="Chưa có yêu cầu trong khoảng này." />
        ) : (
          <div className="fj-bars" style={{ height: 190 }} role="img" aria-label="Biểu đồ chi phí theo ngày">
            {summary.daily.map((bucket, index) => (
              <div key={bucket.date} className="fj-bar-col" title={`${formatDayLabel(bucket.date)} · ${formatUsd(bucket.costUsd)}`}>
                <div className="fj-bar" style={{ height: `${Math.max(3, (bucket.costUsd / maxCost) * 165)}px` }} />
                <span className="fj-bar-label">{index % Math.ceil(summary.daily.length / 10) === 0 ? formatDayLabel(bucket.date) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="fj-grid fj-grid--2" style={{ alignItems: 'start' }}>
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Theo mô hình</h2>
              <p>Phân bổ chi phí giữa các mô hình</p>
            </div>
          </div>
          {summary.byModel.length === 0 ? (
            <Empty description="Chưa có dữ liệu" />
          ) : (
            <Table data={[...summary.byModel]} columns={groupColumns} rowKey="key" pagination={false} border={false} size="small" />
          )}
        </section>

        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Theo khoá</h2>
              <p>Khoá và nguồn Playground/Desktop</p>
            </div>
          </div>
          {summary.byKey.length === 0 ? (
            <Empty description="Chưa có dữ liệu" />
          ) : (
            <Table data={[...summary.byKey]} columns={groupColumns} rowKey="key" pagination={false} border={false} size="small" />
          )}
        </section>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Yêu cầu gần đây</h2>
            <p>20 yêu cầu mới nhất của tài khoản</p>
          </div>
          {showPlayground ? (
            <Button size="small" href="/app/playground">
              Mở Playground
            </Button>
          ) : null}
        </div>
        {summary.recent.length === 0 ? (
          <Empty description="Chưa có yêu cầu nào" />
        ) : (
          <Table data={[...summary.recent]} columns={recentColumns} rowKey="id" pagination={false} border={false} size="small" />
        )}
      </section>
    </>
  )
}
