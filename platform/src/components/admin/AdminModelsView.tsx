'use client'

import {
  Button, Checkbox, Empty, Input, InputNumber, InputTag, Message, Modal, Popconfirm, Select, Switch, Table, Tag,
} from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconDelete, IconEdit, IconPlus, IconRobot } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PlatformModel } from '@/lib/models'
import { formatPrice } from '@/lib/models'
import { formatTokens } from '@/lib/format'
import { sendAdminJson } from './api'

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | ''

interface ModelDraft {
  id: string
  name: string
  tagline: string
  description: string
  contextWindow: number
  maxOutputTokens: number
  inputModalities: ('text' | 'image')[]
  inputPriceUsd: number
  outputPriceUsd: number
  capabilities: string[]
  badgeTextVi: string
  badgeTextEn: string
  badgeTone: BadgeTone
  recommended: boolean
  enabled: boolean
  providerId: string
  upstreamId: string
  sortOrder: number
}

function draftOf(model: PlatformModel | null): ModelDraft {
  if (model === null) {
    return {
      id: '',
      name: '',
      tagline: '',
      description: '',
      contextWindow: 131_072,
      maxOutputTokens: 8_192,
      inputModalities: ['text'],
      inputPriceUsd: 0,
      outputPriceUsd: 0,
      capabilities: [],
      badgeTextVi: '',
      badgeTextEn: '',
      badgeTone: '',
      recommended: false,
      enabled: true,
      providerId: '',
      upstreamId: '',
      sortOrder: 100,
    }
  }
  return {
    id: model.id,
    name: model.name,
    tagline: model.tagline,
    description: model.description,
    contextWindow: model.contextWindow,
    maxOutputTokens: model.maxOutputTokens,
    inputModalities: [...model.inputModalities],
    inputPriceUsd: model.pricing.input,
    outputPriceUsd: model.pricing.output,
    capabilities: [...model.capabilities],
    badgeTextVi: model.badge?.text.vi ?? '',
    badgeTextEn: model.badge?.text.en ?? '',
    badgeTone: model.badge?.tone ?? '',
    recommended: model.recommended === true,
    enabled: model.enabled,
    providerId: model.providerId ?? '',
    upstreamId: model.upstreamId ?? '',
    sortOrder: model.sortOrder,
  }
}

/**
 * Model catalog administration: prices, capabilities, provider mapping, and availability.
 *
 * @param props - every stored model plus the providers a model can reference.
 * @returns the model management page.
 */
export function AdminModelsView({
  models,
  providers,
}: {
  readonly models: readonly PlatformModel[]
  readonly providers: readonly { readonly id: string; readonly name: string }[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<PlatformModel | null | undefined>(undefined)
  const [draft, setDraft] = useState<ModelDraft>(draftOf(null))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const providerName = (id: string | null): string =>
    id === null ? 'Mặc định' : (providers.find(provider => provider.id === id)?.name ?? id)

  const open = (model: PlatformModel | null) => {
    setDraft(draftOf(model))
    setEditing(model)
    setError(null)
  }

  const close = () => {
    setEditing(undefined)
    setError(null)
  }

  const save = async () => {
    if (draft.name.trim() === '') {
      setError('Nhập tên hiển thị của mô hình.')
      return
    }
    if (editing === null && !/^[a-z0-9][a-z0-9._-]*$/.test(draft.id)) {
      setError('Id chỉ gồm chữ thường, số, dấu chấm, gạch ngang hoặc gạch dưới.')
      return
    }
    if (draft.inputModalities.length === 0) {
      setError('Chọn ít nhất một loại đầu vào.')
      return
    }
    const badgeVi = draft.badgeTextVi.trim()
    const badgeEn = draft.badgeTextEn.trim()
    const payload = {
      name: draft.name.trim(),
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      contextWindow: draft.contextWindow,
      maxOutputTokens: draft.maxOutputTokens,
      inputModalities: draft.inputModalities,
      inputPriceUsd: draft.inputPriceUsd,
      outputPriceUsd: draft.outputPriceUsd,
      capabilities: draft.capabilities.map(entry => entry.trim()).filter(entry => entry !== ''),
      badgeTextVi: badgeVi === '' ? null : badgeVi,
      badgeTextEn: badgeEn === '' ? null : badgeEn,
      badgeTone: draft.badgeTone === '' ? null : draft.badgeTone,
      recommended: draft.recommended,
      enabled: draft.enabled,
      providerId: draft.providerId === '' ? null : draft.providerId,
      upstreamId: draft.upstreamId.trim() === '' ? null : draft.upstreamId.trim(),
      sortOrder: draft.sortOrder,
    }
    setSaving(true)
    const failure =
      editing === null || editing === undefined
        ? await sendAdminJson('POST', '/api/admin/models', { id: draft.id.trim(), ...payload })
        : await sendAdminJson('PATCH', `/api/admin/models/${encodeURIComponent(editing.id)}`, payload)
    setSaving(false)
    if (failure !== null) {
      setError(failure)
      return
    }
    Message.success(editing === null || editing === undefined ? 'Đã thêm mô hình.' : 'Đã cập nhật mô hình.')
    close()
    router.refresh()
  }

  const remove = async (model: PlatformModel) => {
    const failure = await sendAdminJson('DELETE', `/api/admin/models/${encodeURIComponent(model.id)}`)
    if (failure !== null) {
      Message.error(failure)
      return
    }
    Message.success('Đã xoá mô hình khỏi danh mục.')
    router.refresh()
  }

  const columns: TableColumnProps<PlatformModel>[] = [
    {
      title: 'Mô hình',
      dataIndex: 'name',
      render: (_value, model) => (
        <div className="fj-list-title">
          <span className="fj-avatar-sm">
            <IconRobot />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="fj-cell-strong">{model.name}</div>
            <div className="fj-table-sub">
              <span className="fj-inline-code">{model.id}</span>
              {model.tagline === '' ? null : ` · ${model.tagline}`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Nhà cung cấp',
      dataIndex: 'providerId',
      width: 170,
      render: (_value, model) => (
        <div>
          <div>{providerName(model.providerId)}</div>
          <div className="fj-table-sub">{model.upstreamId ?? 'gửi id nền tảng'}</div>
        </div>
      ),
    },
    {
      title: 'Giá / 1M token',
      dataIndex: 'pricing',
      width: 170,
      render: (_value, model) => (
        <div className="fj-table-sub">
          <span className="fj-cell-strong">{formatPrice(model.pricing.input)}</span> vào ·{' '}
          <span className="fj-cell-strong">{formatPrice(model.pricing.output)}</span> ra
        </div>
      ),
    },
    {
      title: 'Ngữ cảnh',
      dataIndex: 'contextWindow',
      width: 110,
      render: value => <span className="fj-table-sub">{formatTokens(Number(value))}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'enabled',
      width: 190,
      render: (_value, model) => (
        <div className="fj-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {model.enabled ? (
            <Tag size="small" color="green">
              Đang phục vụ
            </Tag>
          ) : (
            <Tag size="small" color="gray">
              Đã tắt
            </Tag>
          )}
          {model.recommended === true ? (
            <Tag size="small" color="arcoblue">
              Đề xuất
            </Tag>
          ) : null}
        </div>
      ),
    },
    {
      title: '',
      dataIndex: 'id',
      width: 150,
      align: 'right',
      render: (_value, model) => (
        <div className="fj-table-actions">
          <Button size="small" type="text" onClick={() => open(model)}>
            <IconEdit /> Sửa
          </Button>
          <Popconfirm
            title="Xoá mô hình này?"
            content="Mô hình biến mất khỏi Desktop và API. Lịch sử sử dụng vẫn được giữ."
            okText="Xoá"
            cancelText="Huỷ"
            onOk={() => remove(model)}
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
          <h1>Mô hình</h1>
          <p>Danh mục hiển thị cho Desktop và API. Mỗi mô hình trỏ tới một nhà cung cấp bên thứ ba.</p>
        </div>
        <Button type="primary" onClick={() => open(null)}>
          <IconPlus /> Thêm mô hình
        </Button>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Danh mục</h2>
            <p>
              {models.filter(model => model.enabled).length}/{models.length} mô hình đang phục vụ
            </p>
          </div>
        </div>
        {models.length === 0 ? (
          <Empty description="Danh mục trống. Thêm mô hình đầu tiên để bật suy luận." />
        ) : (
          <Table
            data={[...models]}
            columns={columns}
            rowKey="id"
            pagination={false}
            border={false}
            scroll={{ x: 900 }}
          />
        )}
      </section>

      <Modal
        title={editing === undefined || editing === null ? 'Thêm mô hình' : `Sửa ${editing.name}`}
        visible={editing !== undefined}
        onCancel={close}
        style={{ width: 'min(780px, 94vw)' }}
        footer={
          <div className="fj-row" style={{ justifyContent: 'flex-end' }}>
            <Button onClick={close} disabled={saving}>
              Huỷ
            </Button>
            <Button type="primary" onClick={save} loading={saving}>
              {editing === null ? 'Thêm mô hình' : 'Lưu thay đổi'}
            </Button>
          </div>
        }
      >
        <p className="fj-form-note fj-modal-note">
          Id là khoá kỹ thuật mà khách hàng gửi trong trường <span className="fj-inline-code">model</span>. Đổi id sẽ
          tạo mô hình mới; lịch sử cũ không bị ảnh hưởng.
        </p>
        <div className="fj-field-grid">
          <div className="fj-field">
            <label htmlFor="model-id">Id</label>
            <Input
              id="model-id"
              value={draft.id}
              disabled={editing !== null && editing !== undefined}
              placeholder="deepseek-flash"
              onChange={value => setDraft(current => ({ ...current, id: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-name">Tên hiển thị</label>
            <Input
              id="model-name"
              value={draft.name}
              placeholder="DeepSeek V4.1 Flash"
              onChange={value => setDraft(current => ({ ...current, name: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="model-tagline">Mô tả ngắn</label>
            <Input
              id="model-tagline"
              value={draft.tagline}
              placeholder="Mặc định cho mọi tác vụ"
              maxLength={240}
              onChange={value => setDraft(current => ({ ...current, tagline: value }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="model-description">Mô tả đầy đủ</label>
            <Input.TextArea
              id="model-description"
              value={draft.description}
              autoSize={{ minRows: 2, maxRows: 5 }}
              onChange={value => setDraft(current => ({ ...current, description: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-context">Ngữ cảnh (token)</label>
            <InputNumber
              id="model-context"
              value={draft.contextWindow}
              min={1024}
              step={1024}
              style={{ width: '100%' }}
              onChange={value => setDraft(current => ({ ...current, contextWindow: value ?? 1024 }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-output">Token ra tối đa</label>
            <InputNumber
              id="model-output"
              value={draft.maxOutputTokens}
              min={1}
              step={1024}
              style={{ width: '100%' }}
              onChange={value => setDraft(current => ({ ...current, maxOutputTokens: value ?? 1 }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-input-price">Giá vào / 1M token (USD)</label>
            <InputNumber
              id="model-input-price"
              value={draft.inputPriceUsd}
              min={0}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
              onChange={value => setDraft(current => ({ ...current, inputPriceUsd: value ?? 0 }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-output-price">Giá ra / 1M token (USD)</label>
            <InputNumber
              id="model-output-price"
              value={draft.outputPriceUsd}
              min={0}
              step={0.01}
              precision={4}
              style={{ width: '100%' }}
              onChange={value => setDraft(current => ({ ...current, outputPriceUsd: value ?? 0 }))}
            />
          </div>
          <div className="fj-field">
            <label>Đầu vào</label>
            <Checkbox.Group
              value={[...draft.inputModalities]}
              onChange={value =>
                setDraft(current => ({
                  ...current,
                  inputModalities: value.filter(
                    (entry): entry is 'text' | 'image' => entry === 'text' || entry === 'image',
                  ),
                }))
              }
            >
              <Checkbox value="text">Văn bản</Checkbox>
              <Checkbox value="image">Hình ảnh</Checkbox>
            </Checkbox.Group>
          </div>
          <div className="fj-field">
            <label htmlFor="model-sort">Thứ tự hiển thị</label>
            <InputNumber
              id="model-sort"
              value={draft.sortOrder}
              min={0}
              style={{ width: '100%' }}
              onChange={value => setDraft(current => ({ ...current, sortOrder: value ?? 0 }))}
            />
          </div>
          <div className="fj-field fj-field-grid--full">
            <label htmlFor="model-capabilities">Năng lực hiển thị</label>
            <InputTag
              value={draft.capabilities}
              placeholder="Nhập rồi Enter, ví dụ: Gọi công cụ"
              onChange={value => setDraft(current => ({ ...current, capabilities: value }))}
            />
            <span className="fj-field-hint">Mỗi nhãn là một chip trong trang mô hình của khách hàng.</span>
          </div>
          <div className="fj-field">
            <label htmlFor="model-badge-vi">Nhãn tiếng Việt</label>
            <Input
              id="model-badge-vi"
              value={draft.badgeTextVi}
              placeholder="Nhanh"
              maxLength={40}
              onChange={value => setDraft(current => ({ ...current, badgeTextVi: value }))}
            />
          </div>
          <div className="fj-field">
            <label htmlFor="model-badge-en">Nhãn tiếng Anh</label>
            <Input
              id="model-badge-en"
              value={draft.badgeTextEn}
              placeholder="Fast"
              maxLength={40}
              onChange={value => setDraft(current => ({ ...current, badgeTextEn: value }))}
            />
          </div>
          <div className="fj-field">
            <label>Tông nhãn</label>
            <Select
              value={draft.badgeTone}
              onChange={value => setDraft(current => ({ ...current, badgeTone: String(value) as BadgeTone }))}
            >
              <Select.Option value="">Không hiển thị</Select.Option>
              <Select.Option value="neutral">Trung tính</Select.Option>
              <Select.Option value="info">Thông tin</Select.Option>
              <Select.Option value="success">Thành công</Select.Option>
              <Select.Option value="warning">Cảnh báo</Select.Option>
            </Select>
          </div>
          <div className="fj-field">
            <label>Nhà cung cấp</label>
            <Select
              value={draft.providerId}
              onChange={value => setDraft(current => ({ ...current, providerId: String(value) }))}
            >
              <Select.Option value="">Mặc định theo biến môi trường</Select.Option>
              {providers.map(provider => (
                <Select.Option key={provider.id} value={provider.id}>
                  {provider.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="fj-field">
            <label htmlFor="model-upstream">Id phía nhà cung cấp</label>
            <Input
              id="model-upstream"
              value={draft.upstreamId}
              placeholder="Bỏ trống để dùng id nền tảng"
              onChange={value => setDraft(current => ({ ...current, upstreamId: value }))}
            />
          </div>
          <div className="fj-field">
            <label>Đề xuất</label>
            <Switch
              checked={draft.recommended}
              onChange={checked => setDraft(current => ({ ...current, recommended: checked }))}
            />
            <span className="fj-field-hint">Gắn nhãn “Đề xuất” cho mô hình mặc định.</span>
          </div>
          <div className="fj-field">
            <label>Phục vụ</label>
            <Switch
              checked={draft.enabled}
              onChange={checked => setDraft(current => ({ ...current, enabled: checked }))}
            />
            <span className="fj-field-hint">Tắt để ẩn khỏi Desktop và API mà không xoá dữ liệu.</span>
          </div>
        </div>
        {error === null ? null : (
          <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}
      </Modal>
    </>
  )
}
