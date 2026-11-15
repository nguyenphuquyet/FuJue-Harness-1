'use client'

import {
  Alert, Button, Divider, Empty, Form, Input, Message, Popconfirm, Select, Table, Tag,
} from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconDesktop, IconLock, IconSafe, IconSettings, IconPoweroff } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatBalance, formatDateTime } from '@/lib/format'
import type { AccountTokenSummary } from '@/lib/tokens'

/** Account fields the settings forms edit. */
export interface SettingsUser {
  readonly name: string
  readonly email: string
  readonly locale: string
  readonly balanceUsd: string
  readonly bonusUsd: string
  readonly createdAt: string
}

async function errorMessage(response: Response): Promise<string> {
  const payload: unknown = await response.json().catch(() => null)
  if (typeof payload === 'object' && payload !== null) {
    return String((payload as { error?: { message?: unknown } }).error?.message ?? 'Yêu cầu không thành công.')
  }
  return 'Yêu cầu không thành công.'
}

/**
 * Account settings: profile, password, connected devices, sessions, and billing.
 *
 * @param props - account fields and the desktop grants loaded on the server.
 * @returns the settings page content.
 */
export function SettingsView({
  user,
  devices,
}: {
  readonly user: SettingsUser
  readonly devices: readonly AccountTokenSummary[]
}) {
  const router = useRouter()
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [devicesState, setDevicesState] = useState<AccountTokenSummary[]>([...devices])

  const saveProfile = async (values: { name: string; locale: string }) => {
    setSavingProfile(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: values.name, locale: values.locale }),
      })
      if (!response.ok) {
        Message.error(await errorMessage(response))
        return
      }
      Message.success('Đã lưu hồ sơ.')
      router.refresh()
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (values: { current: string; next: string; confirm: string }) => {
    if (values.next !== values.confirm) {
      Message.error('Mật khẩu mới nhập lại không khớp.')
      return
    }
    setSavingPassword(true)
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current_password: values.current, new_password: values.next }),
      })
      if (!response.ok) {
        Message.error(await errorMessage(response))
        return
      }
      passwordForm.resetFields()
      Message.success('Đã đổi mật khẩu.')
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setSavingPassword(false)
    }
  }

  const revokeDevice = async (id: string) => {
    setRevoking(id)
    try {
      const response = await fetch(`/api/account/devices/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        Message.error(await errorMessage(response))
        return
      }
      setDevicesState(current =>
        current.map(device => (device.id === id ? { ...device, revokedAt: new Date().toISOString() } : device)),
      )
      Message.success('Đã thu hồi quyền của thiết bị.')
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setRevoking(null)
    }
  }

  const revokeAllDevices = async () => {
    try {
      const response = await fetch('/api/account/devices/revoke-all', { method: 'POST' })
      if (!response.ok) {
        Message.error(await errorMessage(response))
        return
      }
      const payload = (await response.json()) as { revoked: number }
      setDevicesState(current =>
        current.map(device => (device.revokedAt === null ? { ...device, revokedAt: new Date().toISOString() } : device)),
      )
      Message.success(`Đã thu hồi ${payload.revoked} thiết bị.`)
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    }
  }

  const signOutEverywhere = async () => {
    try {
      const response = await fetch('/api/auth/logout-all', { method: 'POST' })
      if (!response.ok) {
        Message.error(await errorMessage(response))
        return
      }
      const payload = (await response.json()) as { removed: number }
      Message.success(`Đã đăng xuất ${payload.removed} phiên trình duyệt khác.`)
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    }
  }

  const active = devicesState.filter(device => device.revokedAt === null)
  const total = Number(user.balanceUsd) + Number(user.bonusUsd)

  const columns: TableColumnProps<AccountTokenSummary>[] = [
    {
      title: 'Thiết bị',
      dataIndex: 'label',
      render: (_value, device) => (
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
            <IconDesktop />
          </span>
          <div>
            <div style={{ fontWeight: 550 }}>{device.label}</div>
            <span className="fj-dim" style={{ fontSize: 11.5 }}>
              {device.osVersion ?? device.deviceModel ?? 'FuJue Harness'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Kết nối',
      dataIndex: 'createdAt',
      width: 160,
      render: value => <span className="fj-muted" style={{ fontSize: 12.5 }}>{formatDateTime(String(value))}</span>,
    },
    {
      title: 'Dùng lần cuối',
      dataIndex: 'lastUsedAt',
      width: 160,
      render: value => (
        <span className="fj-muted" style={{ fontSize: 12.5 }}>
          {formatDateTime(value === null ? null : String(value))}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'revokedAt',
      width: 130,
      render: value => (value === null ? <Tag color="green">Đang kết nối</Tag> : <Tag color="gray">Đã thu hồi</Tag>),
    },
    {
      title: '',
      dataIndex: 'id',
      width: 110,
      align: 'right',
      render: (value, device) =>
        device.revokedAt === null ? (
          <Popconfirm
            title="Thu hồi thiết bị này?"
            content="Ứng dụng Desktop trên thiết bị sẽ mất quyền và phải đăng nhập lại."
            okText="Thu hồi"
            cancelText="Huỷ"
            onOk={() => revokeDevice(String(value))}
          >
            <Button size="small" status="danger" type="text" loading={revoking === device.id}>
              Thu hồi
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Cài đặt</h1>
          <p>Hồ sơ, mật khẩu, thiết bị đã kết nối và số dư của bạn.</p>
        </div>
        <Tag color="arcoblue" icon={<IconSettings />}>
          {active.length} thiết bị đang kết nối
        </Tag>
      </div>

      <div className="fj-grid fj-grid--2" style={{ alignItems: 'start' }}>
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Hồ sơ</h2>
              <p>Thông tin hiển thị trong bảng điều khiển và thông báo Desktop.</p>
            </div>
          </div>
          <Form
            form={profileForm}
            layout="vertical"
            initialValues={{ name: user.name, locale: user.locale }}
            onSubmit={saveProfile}
          >
            <Form.Item label="Tên hiển thị" field="name" rules={[{ required: true, message: 'Nhập tên của bạn' }]}>
              <Input size="large" maxLength={120} />
            </Form.Item>
            <Form.Item label="Email">
              <Input size="large" value={user.email} readOnly disabled />
            </Form.Item>
            <Form.Item label="Ngôn ngữ giao diện" field="locale">
              <Select size="large">
                <Select.Option value="vi">Tiếng Việt</Select.Option>
                <Select.Option value="en">English</Select.Option>
              </Select>
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={savingProfile}>
              Lưu hồ sơ
            </Button>
          </Form>
          <Divider />
          <p className="fj-dim" style={{ fontSize: 12.5 }}>
            Tài khoản tạo ngày {formatDateTime(user.createdAt)}. Ngôn ngữ ở đây quyết định ngôn ngữ thông báo mà Desktop
            nhận được.
          </p>
        </section>

        <section className="fj-panel" id="billing">
          <div className="fj-panel-head">
            <div>
              <h2>Thanh toán</h2>
              <p>Số dư dùng chung cho Playground, API và Desktop.</p>
            </div>
          </div>
          <div className="fj-spread" style={{ alignItems: 'baseline' }}>
            <span className="fj-muted" style={{ fontSize: 13 }}>
              Số dư khả dụng
            </span>
            <span style={{ fontSize: 30, fontWeight: 680 }}>${total.toFixed(2)}</span>
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <div className="fj-stack" style={{ gap: 10, fontSize: 13 }}>
            <div className="fj-spread">
              <span className="fj-muted">Tín dụng thưởng</span>
              <span>${formatBalance(user.bonusUsd)}</span>
            </div>
            <div className="fj-spread">
              <span className="fj-muted">Số dư đã nạp</span>
              <span>${formatBalance(user.balanceUsd)}</span>
            </div>
          </div>
          <Alert
            type="info"
            showIcon
            style={{ marginTop: 18 }}
            content="Nạp bằng chuyển khoản ngân hàng; quản trị viên cộng số dư sau khi đối soát. Số dư dùng chung cho Playground, API và Desktop."
          />
          <Button long size="large" style={{ marginTop: 16 }} href="/top_up">
            Mở trang nạp tiền
          </Button>
        </section>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Thiết bị đã kết nối</h2>
            <p>Mỗi lần đăng nhập bằng trình duyệt tạo một token riêng cho thiết bị.</p>
          </div>
          <Button
            status="danger"
            size="small"
            disabled={active.length === 0}
            onClick={revokeAllDevices}
          >
            Thu hồi tất cả
          </Button>
        </div>
        {devicesState.length === 0 ? (
          <Empty description="Chưa có thiết bị nào kết nối. Đăng nhập từ FuJue Harness Desktop để tạo." />
        ) : (
          <Table data={devicesState} columns={columns} rowKey="id" pagination={false} border={false} />
        )}
      </section>

      <div className="fj-grid fj-grid--2" style={{ alignItems: 'start' }}>
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Đổi mật khẩu</h2>
              <p>Áp dụng ngay cho lần đăng nhập tiếp theo.</p>
            </div>
            <IconLock style={{ color: 'var(--fj-accent)' }} />
          </div>
          <Form form={passwordForm} layout="vertical" onSubmit={savePassword}>
            <Form.Item
              label="Mật khẩu hiện tại"
              field="current"
              rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
            >
              <Input.Password size="large" autoComplete="current-password" />
            </Form.Item>
            <Form.Item
              label="Mật khẩu mới"
              field="next"
              rules={[{ required: true, message: 'Nhập mật khẩu mới' }, { minLength: 8, message: 'Tối thiểu 8 ký tự' }]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Nhập lại mật khẩu mới"
              field="confirm"
              rules={[{ required: true, message: 'Nhập lại mật khẩu mới' }]}
            >
              <Input.Password size="large" autoComplete="new-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={savingPassword}>
              Cập nhật mật khẩu
            </Button>
          </Form>
        </section>

        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Phiên trình duyệt</h2>
              <p>Thu hồi cookie đăng nhập trên các trình duyệt khác.</p>
            </div>
            <IconSafe style={{ color: 'var(--fj-green)' }} />
          </div>
          <p className="fj-muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
            Phiên hiện tại vẫn được giữ lại. Dùng khi bạn đăng nhập trên máy công cộng hoặc muốn đổi mật khẩu xong thì
            đăng xuất mọi nơi.
          </p>
          <div className="fj-stack" style={{ marginTop: 18 }}>
            <Button long onClick={signOutEverywhere}>
              <IconPoweroff /> Đăng xuất các phiên khác
            </Button>
            <Popconfirm
              title="Thu hồi toàn bộ thiết bị Desktop?"
              content="Mọi ứng dụng FuJue Harness đã kết nối sẽ phải đăng nhập lại."
              okText="Thu hồi"
              cancelText="Huỷ"
              onOk={revokeAllDevices}
            >
              <Button long status="danger" disabled={active.length === 0}>
                Thu hồi toàn bộ token Desktop
              </Button>
            </Popconfirm>
          </div>
        </section>
      </div>
    </>
  )
}
