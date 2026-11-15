'use client'

import { Empty, Table, Tag } from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import type { AuditEntry } from '@/lib/admin'
import { formatDateTime } from '@/lib/format'

const COLUMNS: TableColumnProps<AuditEntry>[] = [
  {
    title: 'Thời điểm',
    dataIndex: 'createdAt',
    width: 170,
    render: value => <span className="fj-table-sub">{formatDateTime(String(value))}</span>,
  },
  {
    title: 'Quản trị viên',
    dataIndex: 'actorEmail',
    width: 220,
    render: value => <span className="fj-table-sub">{String(value)}</span>,
  },
  {
    title: 'Hành động',
    dataIndex: 'action',
    width: 170,
    render: value => (
      <Tag size="small" color="arcoblue">
        {String(value)}
      </Tag>
    ),
  },
  {
    title: 'Đối tượng',
    dataIndex: 'subject',
    width: 220,
    render: value => (
      <span className="fj-table-sub fj-mono" style={{ wordBreak: 'break-all' }}>
        {String(value)}
      </span>
    ),
  },
  {
    title: 'Chi tiết',
    dataIndex: 'detail',
    render: value => <span className="fj-table-sub">{String(value)}</span>,
  },
]

/**
 * Administrator audit trail.
 *
 * @param props - newest recorded actions.
 * @returns the audit log page.
 */
export function AdminAuditView({ entries }: { readonly entries: readonly AuditEntry[] }) {
  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Nhật ký quản trị</h1>
          <p>Mỗi thay đổi về mô hình, nhà cung cấp, tài khoản và thông báo đều được ghi lại.</p>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Hoạt động gần đây</h2>
            <p>{entries.length} bản ghi mới nhất</p>
          </div>
        </div>
        {entries.length === 0 ? (
          <Empty description="Chưa có thao tác quản trị nào." />
        ) : (
          <Table
            data={[...entries]}
            columns={COLUMNS}
            rowKey="id"
            pagination={entries.length > 50 ? { pageSize: 50, size: 'small' } : false}
            border={false}
            scroll={{ x: 900 }}
          />
        )}
      </section>
    </>
  )
}
