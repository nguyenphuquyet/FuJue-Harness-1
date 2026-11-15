'use client'

import { Radio, Table } from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconApps, IconThunderbolt, IconUser } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import type { AdminUsage, AdminUsageGroup } from '@/lib/admin'
import { formatCount, formatDayLabel, formatTokens, formatUsd } from '@/lib/format'

const GROUP_COLUMNS: TableColumnProps<AdminUsageGroup>[] = [
  {
    title: 'Tên',
    dataIndex: 'label',
    render: (value, group) => (
      <div>
        <div className="fj-cell-strong">{String(value)}</div>
        <div className="fj-table-sub">{group.key}</div>
      </div>
    ),
  },
  {
    title: 'Yêu cầu',
    dataIndex: 'requests',
    width: 120,
    render: value => <span className="fj-table-sub">{formatCount(Number(value))}</span>,
  },
  {
    title: 'Token',
    dataIndex: 'tokens',
    width: 120,
    render: value => <span className="fj-table-sub">{formatTokens(Number(value))}</span>,
  },
  {
    title: 'Chi phí',
    dataIndex: 'costUsd',
    width: 120,
    align: 'right',
    render: value => <span className="fj-cell-strong">{formatUsd(Number(value))}</span>,
  },
]

/**
 * Platform-wide usage: daily cost, model mix, and the largest accounts.
 *
 * @param props - aggregated usage for the selected window.
 * @returns the admin usage page.
 */
export function AdminUsageView({ usage }: { readonly usage: AdminUsage }) {
  const router = useRouter()
  const maxCost = Math.max(...usage.daily.map(bucket => bucket.costUsd), 0.0001)

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Sử dụng toàn nền tảng</h1>
          <p>Token và chi phí ghi nhận khi yêu cầu hoàn tất, kể cả phản hồi stream.</p>
        </div>
        <Radio.Group
          type="button"
          value={usage.days}
          onChange={value => router.push(`/admin/usage?days=${Number(value)}`)}
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
            <IconThunderbolt /> Chi phí
          </div>
          <div className="fj-stat-value">{formatUsd(usage.totals.costUsd)}</div>
          <div className="fj-stat-foot">Trong {usage.days} ngày</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconApps /> Token
          </div>
          <div className="fj-stat-value">{formatTokens(usage.totals.tokens)}</div>
          <div className="fj-stat-foot">Đầu vào và đầu ra cộng lại</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconUser /> Yêu cầu
          </div>
          <div className="fj-stat-value">{formatCount(usage.totals.requests)}</div>
          <div className="fj-stat-foot">
            {formatCount(usage.byUser.length)} tài khoản có phát sinh
          </div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconApps /> Mô hình
          </div>
          <div className="fj-stat-value">{formatCount(usage.byModel.length)}</div>
          <div className="fj-stat-foot">Được gọi trong kỳ</div>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Chi phí theo ngày</h2>
            <p>Đơn vị USD</p>
          </div>
        </div>
        <div className="fj-bars" style={{ height: 200 }} role="img" aria-label="Biểu đồ chi phí theo ngày">
          {usage.daily.map((bucket, index) => (
            <div
              key={bucket.date}
              className="fj-bar-col"
              title={`${formatDayLabel(bucket.date)} · ${formatUsd(bucket.costUsd)} · ${formatCount(bucket.requests)} yêu cầu`}
            >
              <div className="fj-bar" style={{ height: `${Math.max(3, (bucket.costUsd / maxCost) * 175)}px` }} />
              <span className="fj-bar-label">
                {index % Math.ceil(usage.daily.length / 8) === 0 ? formatDayLabel(bucket.date) : ''}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="fj-grid fj-grid--2">
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Theo mô hình</h2>
              <p>Xếp theo chi phí</p>
            </div>
          </div>
          <Table
            data={[...usage.byModel]}
            columns={GROUP_COLUMNS}
            rowKey="key"
            pagination={false}
            border={false}
            noDataElement="Chưa có lượt gọi nào trong kỳ."
          />
        </section>
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Theo tài khoản</h2>
              <p>20 tài khoản chi nhiều nhất</p>
            </div>
          </div>
          <Table
            data={[...usage.byUser]}
            columns={GROUP_COLUMNS}
            rowKey="key"
            pagination={false}
            border={false}
            noDataElement="Chưa có lượt gọi nào trong kỳ."
          />
        </section>
      </div>
    </>
  )
}
