'use client'

import {
  Button, Empty, Input, Message, Modal, Popconfirm, Radio, Select, Table, Tag,
} from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconDelete, IconNotification, IconPlus } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { AdminNotification } from '@/lib/admin'
import { formatDateTime } from '@/lib/format'
import { sendAdminJson } from './api'

interface NoticeDraft {
  titleVi: string
  titleEn: string
  bodyVi: string
  bodyEn: string
  actionLabelVi: string
  actionLabelEn: string
  actionStyle: 'primary' | 'secondary'
  audience: 'all' | 'user'
  userId: string
  href: string
}

const EMPTY: NoticeDraft = {
  titleVi: '',
  titleEn: '',
  bodyVi: '',
  bodyEn: '',
  actionLabelVi: 'Mở FuJue Harness',
  actionLabelEn: 'Open FuJue Harness',
  actionStyle: 'primary',
  audience: 'all',
  userId: '',
  href: '',
}

/**
 * Desktop notices: publish bilingual messages and inspect delivery.
 *
 * @param props - published notices and the accounts a notice can target.
 * @returns the notification management page.
 */
export function AdminNotificationsView({
  notifications,
  users,
}: {
  readonly notifications: readonly AdminNotification[]
  readonly users: readonly { readonly id: string; readonly email: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<NoticeDraft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = () => {
    setDraft(EMPTY)
    setError(null)
    setOpen(true)
  }

  const close = () => {
    setOpen(false)
    setError(null)
  }

  const publish = async () => {
    if (draft.titleVi.trim() === '' || draft.titleEn.trim() === '') {
      setError('Nhập tiêu đề cho cả hai ngôn ngữ.')
      return
    }
    if (draft.bodyVi.trim() === '' || draft.bodyEn.trim() === '') {
      setError('Nhập nội dung cho cả hai ngôn ngữ.')
      return
    }
    if (draft.audience === 'user' && draft.userId === '') {
      setError('Chọn tài khoản nhận thông báo.')
      return
    }
    setSaving(true)
    const failure = await sendAdminJson('POST', '/api/admin/notifications', {
      titleVi: draft.titleVi.trim(),
      titleEn: draft.titleEn.trim(),
      bodyVi: draft.bodyVi.trim(),
      bodyEn: draft.bodyEn.trim(),
      actionLabelVi: draft.actionLabelVi.trim(),
      actionLabelEn: draft.actionLabelEn.trim(),
      actionStyle: draft.actionStyle,
      audience: draft.audience,
      userId: draft.audience === 'user' ? draft.userId : null,
      href: draft.href.trim() === '' ? null : draft.href.trim(),
    })
    setSaving(false)
    if (failure !== null) {
      setError(failure)
      return
    }
    Message.success('Đã phát thông báo tới Desktop.')
    close()
    router.refresh()
  }

  const remove = async (notice: AdminNotification) => {
    const failure = await sendAdminJson('DELETE', `/api/admin/notifications/${encodeURIComponent(notice.id)}`)
    if (failure !== null) {
      Message.error(failure)
      return
    }
    Message.success('Đã xoá thông báo.')
    router.refresh()
  }

  const columns: TableColumnProps<AdminNotification>[] = [
    {
      title: 'Thông báo',
      dataIndex: 'titleVi',
      render: (_value, notice) => (
        <div className="fj-list-title">
          <span className="fj-avatar-sm">
            <IconNotification />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="fj-cell-strong">{notice.titleVi}</div>
            <div className="fj-table-sub">{notice.titleEn}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Người nhận',
      dataIndex: 'audience',
      width: 190,
      render: (_value, notice) =>
        notice.audience === 'all' ? (
          <Tag size="small" color="arcoblue">
            Tất cả tài khoản
          </Tag>
        ) : (
          <span className="fj-table-sub">{notice.userEmail ?? 'Một tài khoản'}</span>
        ),
    },
    {
      title: 'Liên kết',
      dataIndex: 'href',
      width: 180,
      render: value =>
        value === null ? (
          <span className="fj-table-sub">—</span>
        ) : (
          <span className="fj-table-sub fj-mono" style={{ wordBreak: 'break-all' }}>
            {String(value)}
          </span>
        ),
    },
    {
      title: 'Đã đọc',
      dataIndex: 'consumed',
      width: 100,
      render: value => <span className="fj-table-sub">{Number(value).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Phát lúc',
      dataIndex: 'publishedAt',
      width: 160,
      render: value => <span className="fj-table-sub">{formatDateTime(String(value))}</span>,
    },
    {
      title: '',
      dataIndex: 'id',
      width: 70,
      align: 'right',
      render: (_value, notice) => (
        <Popconfirm
          title="Xoá thông báo này?"
          content="Thông báo biến mất khỏi Desktop; người đã đọc không bị ảnh hưởng."
          okText="Xoá"
          cancelText="Huỷ"
          onOk={() => remove(notice)}
        >
          <Button size="small" type="text" status="danger">
            <IconDelete />
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Thông báo Desktop</h1>
          <p>Thông điệp hiển thị trong FuJue Harness, gửi cho mọi tài khoản hoặc một người cụ thể.</p>
        </div>
        <Button type="primary" onClick={start}>
          <IconPlus /> Phát thông báo
        </Button>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Đã phát</h2>
            <p>{notifications.length} thông báo</p>
          </div>
        </div>
        {notifications.length === 0 ? (
          <Empty description="Chưa có thông báo nào. Phát thông điệp đầu tiên tới người dùng." />
        ) : (
          <Table
            data={[...notifications]}
            columns={columns}
            rowKey="id"
            pagination={notifications.length > 25 ? { pageSize: 25, size: 'small' } : false}
            border={false}
            scroll={{ x: 900 }}
          />
        )}
      </section>

      <Modal
        title="Phát thông báo mới"
        visible={open}
        onCancel={close}
        style={{ width: 'min(720px, 94vw)' }}
        footer={
          <div className="fj-row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close} disabled={saving}>
              Huỷ
            </Button>
            <Button type="primary" onClick={publish} loading={saving}>
              Phát thông báo
            </Button>
          </div>
        }
      >
        <div className="fj-field-grid">
          <div className="fj-field">
            <label htmlFor="notice-title-vi">Tiêu đề tiếng Việt</label>
            <Input
              id="notice-title-vi"
              value={draft.titleVi}
              maxLength={200}
              onChange={value => setDraft(current => ({ ...current, titleVi: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="notice-title-en">Tiêu đề tiếng Anh</label>
            <Input
              id="notice-title-en"
              value={draft.titleEn}
              maxLength={200}
              onChange={value => setDraft(current => ({ ...current, titleEn: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="notice-body-vi">Nội dung tiếng Việt</label>
            <Input.TextArea
              id="notice-body-vi"
              value={draft.bodyVi}
              autoSize={{ minRows: 2, maxRows: 5 }}
              onChange={value => setDraft(current => ({ ...current, bodyVi: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="notice-body-en">Nội dung tiếng Anh</label>
            <Input.TextArea
              id="notice-body-en"
              value={draft.bodyEn}
              autoSize={{ minRows: 2, maxRows: 5 }}
              onChange={value => setDraft(current => ({ ...current, bodyEn: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="notice-action-vi">Nhãn nút tiếng Việt</label>
            <Input
              id="notice-action-vi"
              value={draft.actionLabelVi}
              maxLength={80}
              onChange={value => setDraft(current => ({ ...current, actionLabelVi: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="notice-action-en">Nhãn nút tiếng Anh</label>
            <Input
              id="notice-action-en"
              value={draft.actionLabelEn}
              maxLength={80}
              onChange={value => setDraft(current => ({ ...current, actionLabelEn: value }))}
            />
          </div>
          <div className="fj-field">
            <label>Kiểu nút</label>
            <Select
              value={draft.actionStyle}
              onChange={value =>
                setDraft(current => ({ ...current, actionStyle: String(value) === 'secondary' ? 'secondary' : 'primary' }))
              }
            >
              <Select.Option value="primary">Chính</Select.Option>
              <Select.Option value="secondary">Phụ</Select.Option>
            </Select>
          </div>
          <div className="fj-field">
            <label htmlFor="notice-href">Liên kết khi bấm</label>
            <Input
              id="notice-href"
              value={draft.href}
              placeholder="https://platform.fujue.ai/download"
              maxLength={512}
              onChange={value => setDraft(current => ({ ...current, href: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label>Người nhận</label>
            <Radio.Group
              type="button"
              value={draft.audience}
              onChange={value =>
                setDraft(current => ({ ...current, audience: String(value) === 'user' ? 'user' : 'all' }))
              }
            >
              <Radio value="all">Tất cả tài khoản</Radio>
              <Radio value="user">Một tài khoản</Radio>
            </Radio.Group>
          </div>
          {draft.audience === 'user' ? (
            <div className="fj-field fj-field-grid--full">
              <label>Tài khoản nhận</label>
              <Select
                showSearch
                value={draft.userId === '' ? undefined : draft.userId}
                placeholder="Chọn theo email"
                onChange={value => setDraft(current => ({ ...current, userId: String(value) }))}
              >
                {users.map(user => (
                  <Select.Option key={user.id} value={user.id}>
                    {user.email}
                  </Select.Option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        {error === null ? null : (
          <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}
      </Modal>
    </>
  )
}
