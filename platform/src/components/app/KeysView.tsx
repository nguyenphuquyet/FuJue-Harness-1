'use client'

import { Button, Empty, Input, Message, Modal, Popconfirm, Tag, Table } from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconCopy, IconDelete, IconLock, IconPlus } from '@arco-design/web-react/icon'
import { useState } from 'react'
import type { ApiKeySummary } from '@/lib/tokens'
import { formatDateTime } from '@/lib/format'

/**
 * API key management: create once-visible secrets and revoke keys.
 *
 * @param props - keys loaded on the server.
 * @returns the keys panel.
 */
export function KeysView({ initialKeys }: { readonly initialKeys: readonly ApiKeySummary[] }) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([...initialKeys])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const create = async () => {
    if (name.trim() === '') {
      setError('Đặt tên cho khoá để dễ quản lý.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        setError(
          typeof payload === 'object' && payload !== null
            ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Không tạo được khoá.')
            : 'Không tạo được khoá.',
        )
        return
      }
      const created = payload as { record: ApiKeySummary; secret: string }
      setKeys(current => [created.record, ...current])
      setCreating(false)
      setName('')
      setSecret(created.secret)
    } catch {
      setError('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setSaving(false)
    }
  }

  const revoke = async (id: string) => {
    const response = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      Message.error('Không thu hồi được khoá. Thử lại sau.')
      return
    }
    setKeys(current => current.map(key => (key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)))
    Message.success('Đã thu hồi khoá.')
  }

  const copy = async () => {
    if (secret === null) return
    try {
      await navigator.clipboard.writeText(secret)
      Message.success('Đã sao chép khoá.')
    } catch {
      Message.error('Trình duyệt chặn sao chép. Hãy chọn và sao chép thủ công.')
    }
  }

  const columns: TableColumnProps<ApiKeySummary>[] = [
    {
      title: 'Tên khoá',
      dataIndex: 'name',
      render: (_value, key) => (
        <div className="fj-row" style={{ gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(143,123,255,0.12)',
              color: 'var(--fj-accent)',
              flex: 'none',
            }}
          >
            <IconLock />
          </span>
          <div>
            <div style={{ fontWeight: 550 }}>{key.name}</div>
            <span className="fj-key-chip">{key.prefix}…</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'revokedAt',
      width: 130,
      render: value => (value === null ? <Tag color="green">Đang hoạt động</Tag> : <Tag color="gray">Đã thu hồi</Tag>),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 160,
      render: value => <span className="fj-muted" style={{ fontSize: 12.5 }}>{formatDateTime(String(value))}</span>,
    },
    {
      title: 'Dùng lần cuối',
      dataIndex: 'lastUsedAt',
      width: 160,
      render: value => <span className="fj-muted" style={{ fontSize: 12.5 }}>{formatDateTime(value === null ? null : String(value))}</span>,
    },
    {
      title: '',
      dataIndex: 'id',
      width: 110,
      align: 'right',
      render: (value, key) =>
        key.revokedAt === null ? (
          <Popconfirm
            title="Thu hồi khoá này?"
            content="Mọi ứng dụng đang dùng khoá sẽ nhận lỗi 401 ngay lập tức."
            okText="Thu hồi"
            cancelText="Huỷ"
            onOk={() => revoke(String(value))}
          >
            <Button size="small" status="danger" type="text">
              <IconDelete /> Thu hồi
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Khoá API</h1>
          <p>Mỗi khoá là một mật khẩu cho ứng dụng. Chỉ hiển thị một lần khi tạo.</p>
        </div>
        <Button type="primary" onClick={() => setCreating(true)}>
          <IconPlus /> Tạo khoá mới
        </Button>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Danh sách khoá</h2>
            <p>{keys.filter(key => key.revokedAt === null).length} khoá đang hoạt động</p>
          </div>
        </div>
        {keys.length === 0 ? (
          <Empty description="Chưa có khoá nào. Tạo khoá đầu tiên để gọi mô hình." />
        ) : (
          <Table data={[...keys]} columns={columns} rowKey="id" pagination={false} border={false} />
        )}
      </section>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Cách dùng khoá</h2>
            <p>Khoá hoạt động với API OpenAI, cổng Anthropic và FuJue Harness Desktop.</p>
          </div>
        </div>
        <div className="fj-code-block">{`curl https://platform.fujue.ai/v1/chat/completions \\
  -H "Authorization: Bearer fjk_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"Xin chào"}]}'`}</div>
        <p className="fj-dim" style={{ marginTop: 12, fontSize: 12.5 }}>
          Khoá chỉ được lưu dưới dạng băm SHA-256. Nếu mất khoá, hãy thu hồi và tạo khoá mới.
        </p>
      </section>

      <Modal
        title="Tạo khoá API"
        visible={creating}
        onCancel={() => {
          setCreating(false)
          setError(null)
        }}
        onOk={create}
        okText="Tạo khoá"
        cancelText="Huỷ"
        confirmLoading={saving}
      >
        <p className="fj-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Đặt tên theo ứng dụng hoặc môi trường, ví dụ “Desktop - MacBook” hoặc “Production backend”.
        </p>
        <Input placeholder="Tên khoá" value={name} onChange={setName} maxLength={120} allowClear autoFocus />
        {error === null ? null : (
          <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 10 }}>{error}</div>
        )}
      </Modal>

      <Modal
        title="Lưu khoá này ngay"
        visible={secret !== null}
        onCancel={() => setSecret(null)}
        footer={
          <div className="fj-row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={copy}>
              <IconCopy /> Sao chép
            </Button>
            <Button type="primary" onClick={() => setSecret(null)}>
              Tôi đã lưu
            </Button>
          </div>
        }
      >
        <p className="fj-muted" style={{ fontSize: 13 }}>
          Đây là lần duy nhất khoá hiển thị đầy đủ. Dán vào ứng dụng hoặc trình quản lý bí mật trước khi đóng.
        </p>
        <div className="fj-code-block" style={{ marginTop: 14, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
          {secret ?? ''}
        </div>
      </Modal>
    </>
  )
}
