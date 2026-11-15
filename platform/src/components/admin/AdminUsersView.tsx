'use client'

import {
  Button, Empty, Input, InputNumber, Message, Modal, Select, Table, Tag,
} from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconEdit, IconSearch, IconUser } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { AdminUserRow } from '@/lib/admin'
import { formatCount, formatDateTime, formatTokens, formatUsd } from '@/lib/format'
import { sendAdminJson } from './api'

interface UserDraft {
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  grantUsd: number
  balanceUsd: number
  bonusUsd: number
}

function draftOf(user: AdminUserRow): UserDraft {
  return {
    role: user.role,
    status: user.status,
    grantUsd: 0,
    balanceUsd: Number(user.balanceUsd),
    bonusUsd: Number(user.bonusUsd),
  }
}

/**
 * Account administration: roles, suspension, balances, and usage.
 *
 * @param props - account rows, the active search term, and the signed-in administrator id.
 * @returns the user management page.
 */
export function AdminUsersView({
  users,
  query,
  selfId,
}: {
  readonly users: readonly AdminUserRow[]
  readonly query: string
  readonly selfId: string
}) {
  const router = useRouter()
  const [search, setSearch] = useState(query)
  const [editing, setEditing] = useState<AdminUserRow | null>(null)
  const [draft, setDraft] = useState<UserDraft>({ role: 'user', status: 'active', grantUsd: 0, balanceUsd: 0, bonusUsd: 0 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitSearch = () => {
    const term = search.trim()
    router.push(term === '' ? '/admin/users' : `/admin/users?q=${encodeURIComponent(term)}`)
  }

  const open = (user: AdminUserRow) => {
    setDraft(draftOf(user))
    setEditing(user)
    setError(null)
  }

  const close = () => {
    setEditing(null)
    setError(null)
  }

  const save = async () => {
    if (editing === null) return
    const patch: Record<string, unknown> = {}
    if (draft.role !== editing.role) patch.role = draft.role
    if (draft.status !== editing.status) patch.status = draft.status
    if (draft.grantUsd > 0) patch.grantUsd = draft.grantUsd
    if (draft.balanceUsd !== Number(editing.balanceUsd)) patch.balanceUsd = draft.balanceUsd
    if (draft.bonusUsd !== Number(editing.bonusUsd)) patch.bonusUsd = draft.bonusUsd
    if (Object.keys(patch).length === 0) {
      setError('Chưa có thay đổi nào để lưu.')
      return
    }
    setSaving(true)
    const failure = await sendAdminJson('PATCH', `/api/admin/users/${encodeURIComponent(editing.id)}`, patch)
    setSaving(false)
    if (failure !== null) {
      setError(failure)
      return
    }
    Message.success('Đã cập nhật tài khoản.')
    close()
    router.refresh()
  }

  const columns: TableColumnProps<AdminUserRow>[] = [
    {
      title: 'Tài khoản',
      dataIndex: 'name',
      render: (_value, user) => (
        <div className="fj-list-title">
          <span className="fj-avatar-sm">{user.name.trim().charAt(0).toUpperCase() || 'F'}</span>
          <div style={{ minWidth: 0 }}>
            <div className="fj-cell-strong">{user.name}</div>
            <div className="fj-table-sub">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      width: 110,
      render: value =>
        value === 'admin' ? (
          <Tag size="small" color="arcoblue">
            Quản trị
          </Tag>
        ) : (
          <Tag size="small" color="gray">
            Người dùng
          </Tag>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: value =>
        value === 'active' ? (
          <Tag size="small" color="green">
            Hoạt động
          </Tag>
        ) : (
          <Tag size="small" color="red">
            Đã khoá
          </Tag>
        ),
    },
    {
      title: 'Số dư',
      dataIndex: 'balanceUsd',
      width: 150,
      render: (_value, user) => (
        <div>
          <div className="fj-cell-strong">{formatUsd(Number(user.balanceUsd) + Number(user.bonusUsd))}</div>
          <div className="fj-table-sub">Thưởng {formatUsd(Number(user.bonusUsd))}</div>
        </div>
      ),
    },
    {
      title: 'Sử dụng',
      dataIndex: 'requests',
      width: 170,
      render: (_value, user) => (
        <div>
          <div>{formatCount(user.requests)} yêu cầu</div>
          <div className="fj-table-sub">
            {formatTokens(user.tokens)} token · {formatUsd(user.costUsd)}
          </div>
        </div>
      ),
    },
    {
      title: 'Thiết bị',
      dataIndex: 'devices',
      width: 110,
      render: (_value, user) => (
        <div className="fj-table-sub">
          {formatCount(user.devices)} desktop · {formatCount(user.keys)} khoá
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 160,
      render: value => <span className="fj-table-sub">{formatDateTime(String(value))}</span>,
    },
    {
      title: '',
      dataIndex: 'id',
      width: 90,
      align: 'right',
      render: (_value, user) => (
        <Button size="small" type="text" onClick={() => open(user)}>
          <IconEdit /> Sửa
        </Button>
      ),
    },
  ]

  const isSelf = editing !== null && editing.id === selfId

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Người dùng</h1>
          <p>Đổi vai trò, khoá tài khoản, cấp thêm số dư và xem mức sử dụng từng người.</p>
        </div>
        <div className="fj-row" style={{ gap: 8 }}>
          <Input
            value={search}
            placeholder="Tìm theo tên hoặc email"
            prefix={<IconSearch />}
            allowClear
            style={{ width: 260 }}
            onChange={value => setSearch(value)}
            onPressEnter={submitSearch}
          />
          <Button onClick={submitSearch}>Tìm</Button>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Tài khoản</h2>
            <p>
              {users.length} tài khoản{query === '' ? '' : ` khớp “${query}”`}
            </p>
          </div>
        </div>
        {users.length === 0 ? (
          <Empty description={query === '' ? 'Chưa có tài khoản nào.' : 'Không tìm thấy tài khoản phù hợp.'} />
        ) : (
          <Table
            data={[...users]}
            columns={columns}
            rowKey="id"
            pagination={users.length > 25 ? { pageSize: 25, size: 'small' } : false}
            border={false}
            scroll={{ x: 1080 }}
          />
        )}
      </section>

      <Modal
        title={editing === null ? 'Sửa tài khoản' : `Sửa ${editing.name}`}
        visible={editing !== null}
        onCancel={close}
        style={{ width: 'min(620px, 94vw)' }}
        footer={
          <div className="fj-row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close} disabled={saving}>
              Huỷ
            </Button>
            <Button type="primary" onClick={save} loading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        }
      >
        {editing === null ? null : (
          <>
            <div className="fj-list-row" style={{ paddingTop: 0 }}>
              <div className="fj-list-title">
                <span className="fj-avatar-sm">
                  <IconUser />
                </span>
                <div>
                  <div className="fj-cell-strong">{editing.email}</div>
                  <div className="fj-table-sub">Tạo lúc {formatDateTime(editing.createdAt)}</div>
                </div>
              </div>
            </div>
            {isSelf ? (
              <p className="fj-form-note" style={{ margin: '10px 0 16px' }}>
                Đây là tài khoản đang đăng nhập: không thể tự hạ quyền hoặc tự khoá.
              </p>
            ) : null}
            <div className="fj-field-grid">
              <div className="fj-field">
                <label>Vai trò</label>
                <Select
                  value={draft.role}
                  disabled={isSelf}
                  onChange={value =>
                    setDraft(current => ({ ...current, role: String(value) === 'admin' ? 'admin' : 'user' }))
                  }
                >
                  <Select.Option value="user">Người dùng</Select.Option>
                  <Select.Option value="admin">Quản trị</Select.Option>
                </Select>
              </div>
              <div className="fj-field">
                <label>Trạng thái</label>
                <Select
                  value={draft.status}
                  disabled={isSelf}
                  onChange={value =>
                    setDraft(current => ({
                      ...current,
                      status: String(value) === 'suspended' ? 'suspended' : 'active',
                    }))
                  }
                >
                  <Select.Option value="active">Hoạt động</Select.Option>
                  <Select.Option value="suspended">Khoá đăng nhập</Select.Option>
                </Select>
              </div>
              <div className="fj-field">
                <label htmlFor="user-balance">Số dư nạp (USD)</label>
                <InputNumber
                  id="user-balance"
                  value={draft.balanceUsd}
                  min={0}
                  step={1}
                  precision={2}
                  style={{ width: '100%' }}
                  onChange={value => setDraft(current => ({ ...current, balanceUsd: value ?? 0 }))}
                />
              </div>
              <div className="fj-field">
                <label htmlFor="user-bonus">Số dư thưởng (USD)</label>
                <InputNumber
                  id="user-bonus"
                  value={draft.bonusUsd}
                  min={0}
                  step={1}
                  precision={2}
                  style={{ width: '100%' }}
                  onChange={value => setDraft(current => ({ ...current, bonusUsd: value ?? 0 }))}
                />
              </div>
              <div className="fj-field fj-field-grid--full">
                <label htmlFor="user-grant">Cộng thêm vào số dư nạp (USD)</label>
                <InputNumber
                  id="user-grant"
                  value={draft.grantUsd}
                  min={0}
                  max={10_000}
                  step={1}
                  precision={2}
                  style={{ width: '100%' }}
                  onChange={value => setDraft(current => ({ ...current, grantUsd: value ?? 0 }))}
                />
                <span className="fj-field-hint">
                  Cộng vào số dư hiện tại. Nếu nhập cả số dư tuyệt đối ở trên, số dư tuyệt đối được ghi sau cùng.
                </span>
              </div>
            </div>
            {error === null ? null : (
              <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 12 }}>{error}</div>
            )}
          </>
        )}
      </Modal>
    </>
  )
}
