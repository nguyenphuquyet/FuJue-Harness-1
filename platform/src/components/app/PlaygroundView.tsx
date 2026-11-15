'use client'

import {
  Alert, Button, Form, Input, Popconfirm, Select, Slider, Tag,
} from '@arco-design/web-react'
import { IconDelete, IconSend, IconThunderbolt } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { formatTokens, formatUsd } from '@/lib/format'
import { formatPrice } from '@/lib/models'

interface ChatTurn {
  readonly id: number
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly model?: string
  readonly tokens?: number
  readonly costUsd?: number
}

/** One model the playground can call. */
interface PlaygroundModel {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly pricing: { readonly input: number; readonly output: number }
}

/**
 * Playground chat with model selection, sampling controls, and per-turn cost.
 *
 * @param props - starting model, available models, and the current balance.
 * @returns the playground page content.
 */
export function PlaygroundView({
  initialModel,
  models,
  balanceUsd,
}: {
  readonly initialModel: string
  readonly models: readonly PlaygroundModel[]
  readonly balanceUsd: number
}) {
  const router = useRouter()
  const [model, setModel] = useState(initialModel)
  const [system, setSystem] = useState('Bạn là trợ lý kỹ thuật của FuJue, trả lời ngắn gọn bằng tiếng Việt.')
  const [temperature, setTemperature] = useState(0.7)
  const [maxTokens, setMaxTokens] = useState(2048)
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionCost = turns.reduce((sum, turn) => sum + (turn.costUsd ?? 0), 0)
  const sessionTokens = turns.reduce((sum, turn) => sum + (turn.tokens ?? 0), 0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = scrollRef.current
    if (node !== null) node.scrollTop = node.scrollHeight
  }, [turns, sending])

  const selected = models.find(entry => entry.id === model) ?? models[0]

  const send = async () => {
    const text = input.trim()
    if (text === '' || sending) return
    if (balanceUsd <= 0) {
      setError('Số dư đã hết. Nạp thêm tín dụng rồi thử lại.')
      return
    }
    setSending(true)
    setError(null)
    const userTurn: ChatTurn = { id: Date.now(), role: 'user', content: text }
    const history = [...turns, userTurn]
    setTurns(history)
    setInput('')
    try {
      const messages = [
        ...(system.trim() === '' ? [] : [{ role: 'system' as const, content: system.trim() }]),
        ...history.map(turn => ({ role: turn.role, content: turn.content })),
      ]
      const response = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature, maxTokens }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null
            ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Không nhận được phản hồi.')
            : 'Không nhận được phản hồi.'
        setError(message)
        return
      }
      const body = payload as {
        content?: string
        costUsd?: number
        usage?: { promptTokens?: number; completionTokens?: number }
      }
      const promptTokens = Number(body.usage?.promptTokens ?? 0)
      const completionTokens = Number(body.usage?.completionTokens ?? 0)
      setTurns(current => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: body.content === undefined || body.content === '' ? '(Không có nội dung trả về)' : body.content,
          model: selected.name,
          tokens: promptTokens + completionTokens,
          costUsd: Number(body.costUsd ?? 0),
        },
      ])
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Playground</h1>
          <p>Thử mô hình với chính số dư dùng cho API. Mỗi lượt được ghi vào bảng sử dụng.</p>
        </div>
        <div className="fj-row" style={{ gap: 10 }}>
          <Tag color="green">${balanceUsd.toFixed(2)} khả dụng</Tag>
          <Popconfirm
            title="Xoá hội thoại?"
            content="Các lượt đã gửi vẫn được tính trong báo cáo sử dụng."
            okText="Xoá"
            cancelText="Huỷ"
            onOk={() => {
              setTurns([])
              setError(null)
            }}
          >
            <Button size="small" disabled={turns.length === 0}>
              <IconDelete /> Xoá hội thoại
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="fj-playground">
        <aside className="fj-panel" style={{ display: 'grid', gap: 18 }}>
          <div>
            <div className="fj-sidebar-label" style={{ padding: '0 0 8px' }}>
              Mô hình
            </div>
            <Select value={model} onChange={value => setModel(String(value))} size="large" style={{ width: '100%' }}>
              {models.map(entry => (
                <Select.Option key={entry.id} value={entry.id}>
                  {entry.name}
                </Select.Option>
              ))}
            </Select>
            <p className="fj-dim" style={{ marginTop: 8, fontSize: 12 }}>
              {selected?.tagline ?? ''}
            </p>
            {selected === undefined ? null : (
              <div className="fj-chip-row" style={{ marginTop: 10 }}>
                <span className="fj-chip">Vào {formatPrice(selected.pricing.input)}/1M</span>
                <span className="fj-chip">Ra {formatPrice(selected.pricing.output)}/1M</span>
              </div>
            )}
          </div>

          <Form layout="vertical">
            <Form.Item label="System prompt" style={{ marginBottom: 16 }}>
              <Input.TextArea
                value={system}
                onChange={setSystem}
                autoSize={{ minRows: 3, maxRows: 6 }}
                placeholder="Mô tả vai trò của trợ lý"
              />
            </Form.Item>
            <Form.Item label={`Temperature · ${temperature.toFixed(2)}`} style={{ marginBottom: 16 }}>
              <Slider min={0} max={2} step={0.05} value={temperature} onChange={value => setTemperature(Number(value))} />
            </Form.Item>
            <Form.Item label={`Độ dài tối đa · ${maxTokens} token`} style={{ marginBottom: 0 }}>
              <Slider
                min={256}
                max={8192}
                step={256}
                value={maxTokens}
                onChange={value => setMaxTokens(Number(value))}
              />
            </Form.Item>
          </Form>

          <div className="fj-glass" style={{ padding: 14, fontSize: 12.5 }}>
            <div className="fj-spread">
              <span className="fj-dim">Lượt trong phiên</span>
              <span>{turns.filter(turn => turn.role === 'assistant').length}</span>
            </div>
            <div className="fj-spread" style={{ marginTop: 8 }}>
              <span className="fj-dim">Token phiên</span>
              <span>{formatTokens(sessionTokens)}</span>
            </div>
            <div className="fj-spread" style={{ marginTop: 8 }}>
              <span className="fj-dim">Chi phí phiên</span>
              <span>{formatUsd(sessionCost)}</span>
            </div>
          </div>
        </aside>

        <div className="fj-chat">
          <div className="fj-chat-head">
            <span className="fj-row" style={{ gap: 8 }}>
              <IconThunderbolt style={{ color: 'var(--fj-accent)' }} />
              {selected?.name ?? model}
            </span>
            <span className="fj-dim" style={{ fontSize: 12 }}>
              {turns.length} tin nhắn
            </span>
          </div>

          <div className="fj-chat-body" ref={scrollRef}>
            {turns.length === 0 && !sending ? (
              <div className="fj-chat-empty">
                <strong>Bắt đầu một hội thoại</strong>
                <span>Đặt câu hỏi, dán log lỗi hoặc nhờ viết một đoạn code. Chi phí hiện ngay dưới mỗi câu trả lời.</span>
                <div className="fj-chip-row" style={{ justifyContent: 'center' }}>
                  {['Tóm tắt thay đổi trong PR này', 'Vì sao build Windows lỗi?', 'Viết test cho hàm parse'].map(
                    suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        className="fj-chip"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ) : (
              turns.map(turn => (
                <div key={turn.id} className={`fj-msg${turn.role === 'user' ? ' fj-msg--user' : ''}`}>
                  {turn.content}
                  {turn.role === 'assistant' ? (
                    <div className="fj-msg--meta">
                      {turn.model ?? ''} · {formatTokens(turn.tokens ?? 0)} token · {formatUsd(turn.costUsd ?? 0)}
                    </div>
                  ) : null}
                </div>
              ))
            )}
            {sending ? (
              <div className="fj-msg">
                Đang gọi {selected?.name ?? model}
                <span className="fj-typing">
                  <i />
                  <i />
                  <i />
                </span>
              </div>
            ) : null}
          </div>

          {error === null ? null : (
            <div style={{ padding: '0 14px' }}>
              <Alert type="error" showIcon content={error} />
            </div>
          )}

          <div className="fj-composer">
            <Input.TextArea
              value={input}
              onChange={setInput}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="Nhập tin nhắn… (Ctrl + Enter để gửi)"
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  void send()
                }
              }}
            />
            <div className="fj-composer-actions">
              <span>
                {system.trim() === '' ? 'Không có system prompt' : 'System prompt đang bật'} · temperature{' '}
                {temperature.toFixed(2)}
              </span>
              <div className="fj-row" style={{ gap: 8 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setTurns([])
                    setError(null)
                  }}
                  disabled={turns.length === 0 || sending}
                >
                  Làm mới
                </Button>
                <Button type="primary" onClick={() => void send()} loading={sending} disabled={input.trim() === ''}>
                  <IconSend /> Gửi
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {turns.length === 0 ? (
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Gợi ý sử dụng</h2>
              <p>Playground dùng đúng cổng mô hình như Desktop và API.</p>
            </div>
          </div>
          <div className="fj-quick">
            <div>
              <strong>So sánh mô hình</strong>
              <span>Gửi cùng một câu hỏi với Flash và Pro để thấy khác biệt.</span>
            </div>
            <div>
              <strong>Đo chi phí thật</strong>
              <span>Mỗi câu trả lời hiển thị token và USD ngay bên dưới.</span>
            </div>
            <div>
              <strong>Mang vào code</strong>
              <span>Xem tab Tài liệu để lấy mẫu curl và SDK.</span>
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
