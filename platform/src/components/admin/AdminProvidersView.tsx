'use client'

import {
  Button, Empty, Input, Message, Modal, Popconfirm, Switch, Table, Tag,
} from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import {
  IconDelete, IconEdit, IconLink, IconPlus, IconRefresh, IconStorage,
} from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ProviderView } from '@/lib/model-store'
import { sendAdminJson } from './api'

/** Deployment defaults shown when a provider leaves a field empty. */
export interface ProviderFallback {
  readonly chatBaseUrl: string
  /** Anthropic root configured for the whole deployment, or null when none is. */
  readonly anthropicBaseUrl: string | null
  readonly keyConfigured: boolean
}

interface ProviderDraft {
  name: string
  chatBaseUrl: string
  anthropicBaseUrl: string
  apiKey: string
  note: string
  enabled: boolean
  clearApiKey: boolean
}

function draftOf(provider: ProviderView | null): ProviderDraft {
  return {
    name: provider?.name ?? '',
    chatBaseUrl: provider?.chatBaseUrl ?? '',
    anthropicBaseUrl: provider?.anthropicBaseUrl ?? '',
    apiKey: '',
    note: provider?.note ?? '',
    enabled: provider?.enabled ?? true,
    clearApiKey: false,
  }
}

/**
 * Third-party model providers: base URLs, credentials, and connection tests.
 *
 * @param props - stored providers and the deployment fallback configuration.
 * @returns the provider management page.
 */
export function AdminProvidersView({
  providers,
  fallback,
}: {
  readonly providers: readonly ProviderView[]
  readonly fallback: ProviderFallback
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<ProviderView | null | undefined>(undefined)
  const [draft, setDraft] = useState<ProviderDraft>(draftOf(null))
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const open = (provider: ProviderView | null) => {
    setDraft(draftOf(provider))
    setEditing(provider)
    setError(null)
  }

  const close = () => {
    setEditing(undefined)
    setError(null)
  }

  const save = async () => {
    if (draft.name.trim() === '') {
      setError('Nhập tên nhà cung cấp.')
      return
    }
    setSaving(true)
    const common = {
      name: draft.name.trim(),
      chatBaseUrl: draft.chatBaseUrl.trim(),
      anthropicBaseUrl: draft.anthropicBaseUrl.trim(),
      note: draft.note.trim(),
      enabled: draft.enabled,
    }
    const failure =
      editing === undefined || editing === null
        ? await sendAdminJson('POST', '/api/admin/providers', { ...common, apiKey: draft.apiKey.trim() })
        : await sendAdminJson('PATCH', `/api/admin/providers/${encodeURIComponent(editing.id)}`, {
            ...common,
            ...(draft.apiKey.trim() === '' ? {} : { apiKey: draft.apiKey.trim() }),
            ...(draft.clearApiKey ? { clearApiKey: true } : {}),
          })
    setSaving(false)
    if (failure !== null) {
      setError(failure)
      return
    }
    Message.success(editing === undefined || editing === null ? 'Đã thêm nhà cung cấp.' : 'Đã cập nhật nhà cung cấp.')
    close()
    router.refresh()
  }

  const remove = async (provider: ProviderView) => {
    const failure = await sendAdminJson('DELETE', `/api/admin/providers/${encodeURIComponent(provider.id)}`)
    if (failure !== null) {
      Message.error(failure)
      return
    }
    Message.success('Đã xoá nhà cung cấp.')
    router.refresh()
  }

  const test = async (provider: ProviderView) => {
    setTesting(provider.id)
    try {
      const response = await fetch(`/api/admin/providers/${encodeURIComponent(provider.id)}/test`, {
        method: 'POST',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null
            ? (payload as { error?: { message?: unknown } }).error?.message
            : undefined
        Message.error(typeof message === 'string' && message !== '' ? message : 'Không kết nối được nhà cung cấp.')
        return
      }
      const models =
        typeof payload === 'object' && payload !== null ? Number((payload as { models?: unknown }).models ?? 0) : 0
      Message.success(`Kết nối thành công · ${models.toLocaleString('vi-VN')} mô hình khả dụng.`)
    } catch {
      Message.error('Không kết nối được máy chủ. Thử lại sau.')
    } finally {
      setTesting(null)
    }
  }

  const columns: TableColumnProps<ProviderView>[] = [
    {
      title: 'Nhà cung cấp',
      dataIndex: 'name',
      render: (_value, provider) => (
        <div className="fj-list-title">
          <span className="fj-avatar-sm">
            <IconStorage />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="fj-cell-strong">{provider.name}</div>
            <div className="fj-table-sub">
              <span className="fj-inline-code">{provider.id}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'URL tương thích OpenAI',
      dataIndex: 'chatBaseUrl',
      render: value => (
        <span className="fj-table-sub fj-mono" style={{ wordBreak: 'break-all' }}>
          {value === null || value === '' ? fallback.chatBaseUrl : String(value)}
        </span>
      ),
    },
    {
      title: 'Khoá API',
      dataIndex: 'apiKeyHint',
      width: 150,
      render: (_value, provider) =>
        provider.apiKeySet ? (
          <Tag size="small" color="green">
            {provider.apiKeyHint ?? 'Đã lưu'}
          </Tag>
        ) : fallback.keyConfigured ? (
          <Tag size="small" color="gray">
            Dùng biến môi trường
          </Tag>
        ) : (
          <Tag size="small" color="orange">
            Chưa có khoá
          </Tag>
        ),
    },
    {
      title: 'Mô hình',
      dataIndex: 'modelCount',
      width: 100,
      render: value => <span className="fj-table-sub">{Number(value).toLocaleString('vi-VN')}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'enabled',
      width: 120,
      render: value =>
        value === true ? (
          <Tag size="small" color="green">
            Đang dùng
          </Tag>
        ) : (
          <Tag size="small" color="gray">
            Đã tắt
          </Tag>
        ),
    },
    {
      title: '',
      dataIndex: 'id',
      width: 220,
      align: 'right',
      render: (_value, provider) => (
        <div className="fj-table-actions">
          <Button size="small" type="text" loading={testing === provider.id} onClick={() => test(provider)}>
            <IconRefresh /> Kiểm tra
          </Button>
          <Button size="small" type="text" onClick={() => open(provider)}>
            <IconEdit /> Sửa
          </Button>
          <Popconfirm
            title="Xoá nhà cung cấp này?"
            content="Mô hình đang trỏ tới đây sẽ quay về cấu hình mặc định của máy chủ."
            okText="Xoá"
            cancelText="Huỷ"
            onOk={() => remove(provider)}
          >
            <Button size="small" type="text" status="danger">
              <IconDelete />
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Nhà cung cấp</h1>
          <p>Mỗi mô hình được phục vụ bởi một dịch vụ bên thứ ba. Điền URL và khoá API tại đây.</p>
        </div>
        <Button type="primary" onClick={() => open(null)}>
          <IconPlus /> Thêm nhà cung cấp
        </Button>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Dịch vụ đã cấu hình</h2>
            <p>
              Mặc định hiện tại: <span className="fj-inline-code">{fallback.chatBaseUrl}</span>
            </p>
          </div>
        </div>
        {providers.length === 0 ? (
          <Empty description="Chưa có nhà cung cấp nào. Thêm dịch vụ đầu tiên để phục vụ mô hình." />
        ) : (
          <Table
            data={[...providers]}
            columns={columns}
            rowKey="id"
            pagination={false}
            border={false}
            scroll={{ x: 960 }}
          />
        )}
      </section>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Cách hoạt động</h2>
            <p>Thứ tự ưu tiên khi một yêu cầu suy luận được gửi tới.</p>
          </div>
        </div>
        <div className="fj-stack">
          <div className="fj-step">
            <span className="fj-step-number">1</span>
            <div>
              <h4>Mô hình chọn nhà cung cấp</h4>
              <p>
                Trường <span className="fj-inline-code">Nhà cung cấp</span> trên mô hình quyết định dịch vụ nhận yêu
                cầu. Bỏ trống để dùng biến môi trường của máy chủ.
              </p>
            </div>
          </div>
          <div className="fj-step">
            <span className="fj-step-number">2</span>
            <div>
              <h4>Khoá API lưu trong cơ sở dữ liệu</h4>
              <p>
                Khoá chỉ ghi một chiều: giao diện chỉ thấy bốn ký tự cuối. Để trống khi sửa nghĩa là giữ nguyên khoá
                đang dùng.
              </p>
            </div>
          </div>
          <div className="fj-step">
            <span className="fj-step-number">3</span>
            <div>
              <h4>Kiểm tra kết nối</h4>
              <p>
                Nút <strong>Kiểm tra</strong> gọi <span className="fj-inline-code">/models</span> của nhà cung cấp bằng
                khoá đã lưu, giúp phát hiện sai URL hoặc khoá hết hạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Modal
        title={editing === undefined || editing === null ? 'Thêm nhà cung cấp' : `Sửa ${editing.name}`}
        visible={editing !== undefined}
        onCancel={close}
        style={{ width: 'min(680px, 94vw)' }}
        footer={
          <div className="fj-row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close} disabled={saving}>
              Huỷ
            </Button>
            <Button type="primary" onClick={save} loading={saving}>
              {editing === undefined || editing === null ? 'Thêm' : 'Lưu thay đổi'}
            </Button>
          </div>
        }
      >
        <div className="fj-field-grid">
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="provider-name">Tên</label>
            <Input
              id="provider-name"
              value={draft.name}
              placeholder="OpenRouter, Together, DeepSeek…"
              onChange={value => setDraft(current => ({ ...current, name: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="provider-chat">URL tương thích OpenAI</label>
            <Input
              id="provider-chat"
              value={draft.chatBaseUrl}
              placeholder={fallback.chatBaseUrl}
              onChange={value => setDraft(current => ({ ...current, chatBaseUrl: value }))}
            />
            <span className="fj-field-hint">
              Dùng cho <span className="fj-inline-code">/chat/completions</span> và kiểm tra kết nối.
            </span>
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="provider-anthropic">URL tương thích Anthropic (tuỳ chọn)</label>
            <Input
              id="provider-anthropic"
              value={draft.anthropicBaseUrl}
              placeholder={fallback.anthropicBaseUrl ?? 'Để trống để dùng chuyển đổi OpenAI'}
              onChange={value => setDraft(current => ({ ...current, anthropicBaseUrl: value }))}
            />
            <span className="fj-field-hint">
              Điền khi nhà cung cấp có sẵn cổng Anthropic; để trống thì FuJue Platform tự chuyển
              <span className="fj-inline-code">/anthropic/v1/messages</span> sang
              <span className="fj-inline-code">/chat/completions</span> của URL OpenAI ở trên.
            </span>
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="provider-key">
              Khoá API {editing?.apiKeySet === true ? `(đang lưu ${editing.apiKeyHint ?? ''})` : ''}
            </label>
            <Input.Password
              id="provider-key"
              value={draft.apiKey}
              placeholder={editing?.apiKeySet === true ? 'Để trống nếu không đổi khoá' : 'sk-…'}
              onChange={value => setDraft(current => ({ ...current, apiKey: value }))}
            />
            {editing?.apiKeySet === true ? (
              <label className="fj-row" style={{ gap: 8, fontSize: 12.5, color: 'var(--fj-muted)' }}>
                <Switch
                  size="small"
                  checked={draft.clearApiKey}
                  onChange={checked => setDraft(current => ({ ...current, clearApiKey: checked }))}
                />
                Xoá khoá đã lưu
              </label>
            ) : (
              <span className="fj-field-hint">
                Bỏ trống để dùng <span className="fj-inline-code">DEEPSEEK_API_KEY</span> của máy chủ.
              </span>
            )}
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="provider-note">Ghi chú</label>
            <Input
              id="provider-note"
              value={draft.note}
              placeholder="Hạn mức, khu vực, người phụ trách…"
              maxLength={255}
              onChange={value => setDraft(current => ({ ...current, note: value }))}
            />
          </div>
          <div className="fj-field">
            <label>Trạng thái</label>
            <Switch
              checked={draft.enabled}
              onChange={checked => setDraft(current => ({ ...current, enabled: checked }))}
            />
            <span className="fj-field-hint">Tắt để chặn mọi yêu cầu qua nhà cung cấp này.</span>
          </div>
        </div>
        {error === null ? null : (
          <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}
      </Modal>

      <div className="fj-panel">
        <div className="fj-row" style={{ gap: 10 }}>
          <IconLink style={{ color: 'var(--fj-dim)' }} />
          <span className="fj-form-note">
            Khoá nhà cung cấp là bí mật của cơ sở dữ liệu. Chỉ quản trị viên tạo được khoá mới; API công khai không bao
            giờ trả lại giá trị đầy đủ.
          </span>
        </div>
      </div>
    </>
  )
}
