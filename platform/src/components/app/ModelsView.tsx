'use client'

import { Button, Table, Tag } from '@arco-design/web-react'
import type { TableColumnProps } from '@arco-design/web-react'
import { IconArrowRight, IconCheck, IconCloud } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { formatPrice, type PlatformModel } from '@/lib/models'

/**
 * Model catalog page with capability cards and a comparison table.
 *
 * @param props - served models, in selector order.
 * @returns the models page content.
 */
export function ModelsView({ models }: { readonly models: readonly PlatformModel[] }) {
  const router = useRouter()

  const columns: TableColumnProps<PlatformModel>[] = [
    {
      title: 'Mô hình',
      dataIndex: 'name',
      render: (_value, model) => (
        <div>
          <div style={{ fontWeight: 560 }}>{model.name}</div>
          <span className="fj-dim" style={{ fontSize: 11, fontFamily: 'var(--fj-mono)' }}>
            {model.id}
          </span>
        </div>
      ),
    },
    {
      title: 'Ngữ cảnh',
      dataIndex: 'contextWindow',
      width: 110,
      render: value => `${(Number(value) / 1_048_576).toFixed(0)}M token`,
    },
    {
      title: 'Ra tối đa',
      dataIndex: 'maxOutputTokens',
      width: 110,
      render: value => `${(Number(value) / 1024).toFixed(0)}K token`,
    },
    {
      title: 'Đầu vào',
      dataIndex: 'inputModalities',
      width: 130,
      render: value => (Array.isArray(value) && value.includes('image') ? 'Văn bản, ảnh' : 'Văn bản'),
    },
    {
      title: 'Giá vào / 1M',
      dataIndex: 'pricing',
      width: 120,
      align: 'right',
      render: value => formatPrice((value as PlatformModel['pricing']).input),
    },
    {
      title: 'Giá ra / 1M',
      dataIndex: 'pricing',
      width: 120,
      align: 'right',
      render: value => formatPrice((value as PlatformModel['pricing']).output),
    },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Mô hình</h1>
          <p>Cùng một khoá API. Đổi mô hình bằng cách đổi trường <span className="fj-mono">model</span>.</p>
        </div>
        <Button type="primary" href="/app/playground">
          Mở Playground <IconArrowRight />
        </Button>
      </div>

      <div className="fj-grid fj-grid--2">
        {models.map(model => (
          <article key={model.id} className={`fj-model-card${model.recommended === true ? ' fj-model-card--featured' : ''}`}>
            <div className="fj-model-head">
              <div>
                <div className="fj-model-name">{model.name}</div>
                <div className="fj-model-tagline">{model.tagline}</div>
              </div>
              {model.badge === undefined ? (
                <Tag color="gray">Ổn định</Tag>
              ) : (
                <Tag color={model.badge.tone === 'success' ? 'green' : 'arcoblue'}>{model.badge.text.vi}</Tag>
              )}
            </div>
            <p className="fj-muted" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              {model.description}
            </p>
            <div className="fj-chip-row">
              {model.capabilities.map(capability => (
                <span key={capability} className="fj-chip">
                  <IconCheck /> {capability}
                </span>
              ))}
            </div>
            <div className="fj-price">
              <div>
                <span>Token vào · 1M</span>
                <strong>{formatPrice(model.pricing.input)}</strong>
              </div>
              <div>
                <span>Token ra · 1M</span>
                <strong>{formatPrice(model.pricing.output)}</strong>
              </div>
            </div>
            <div className="fj-row" style={{ gap: 10 }}>
              <Button
                type={model.recommended === true ? 'primary' : 'secondary'}
                long
                onClick={() => router.push(`/app/playground?model=${model.id}`)}
              >
                Thử trong Playground
              </Button>
              <Button long onClick={() => router.push('/app/docs#api')}>
                Xem API
              </Button>
            </div>
          </article>
        ))}
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>So sánh</h2>
            <p>Giá tính bằng USD trên một triệu token, làm tròn để hiển thị.</p>
          </div>
          <Tag color="gray" icon={<IconCloud />}>
            Sẵn sàng
          </Tag>
        </div>
        <Table data={[...models]} columns={columns} rowKey="id" pagination={false} border={false} />
      </section>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Ánh xạ mô hình</h2>
            <p>Platform chuyển id nội bộ sang nhà cung cấp; Desktop và API luôn dùng id của Platform.</p>
          </div>
        </div>
        <div className="fj-code-block">{`{
  "model": "deepseek-flash",
  "messages": [{ "role": "user", "content": "Tóm tắt thay đổi trong PR này" }],
  "stream": true
}`}</div>
        <p className="fj-dim" style={{ marginTop: 12, fontSize: 12.5 }}>
          Muốn ánh xạ sang tên khác? Đặt biến môi trường <span className="fj-mono">DEEPSEEK_MODEL_MAP</span> dạng JSON
          trên máy chủ, ví dụ <span className="fj-mono">{'{"deepseek-flash":"provider-model"}'}</span>.
        </p>
      </section>
    </>
  )
}
