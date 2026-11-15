'use client'

import { Alert, Button, Divider, Tag } from '@arco-design/web-react'
import { IconCheck, IconClose, IconLock, IconSafe } from '@arco-design/web-react/icon'
import Link from 'next/link'
import { useState } from 'react'
import { AuthForm } from './AuthForm'

/** Consent data rendered before the browser returns to the desktop app. */
export interface AuthorizationSummary {
  readonly id: string
  readonly redirectUri: string
  readonly locale: string | null
  readonly loginSource: string | null
  readonly status: 'pending' | 'approved' | 'exchanged' | 'cancelled' | 'expired'
  readonly expiresAt: string
}

/**
 * Consent screen for a desktop sign-in, with inline login when no session exists.
 *
 * @param props - pending authorization and the signed-in account, if any.
 * @returns the consent card.
 */
export function AuthorizeView({
  authorization,
  authorizeId,
  user,
}: {
  readonly authorization: AuthorizationSummary | null
  readonly authorizeId: string | null
  readonly user: { readonly name: string; readonly email: string } | null
}) {
  const [loading, setLoading] = useState<'approve' | 'deny' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (authorization === null) {
    return (
      <div>
        <h2>Không tìm thấy yêu cầu</h2>
        <p className="fj-sub">Liên kết đăng nhập không hợp lệ hoặc đã bị xoá. Hãy quay lại ứng dụng và thử lại.</p>
        <Button type="primary" long size="large" href="/app" style={{ marginTop: 22 }}>
          Mở FuJue Platform
        </Button>
      </div>
    )
  }

  if (authorization.status !== 'pending') {
    const expired = authorization.status === 'expired'
    return (
      <div>
        <h2>Yêu cầu đã được xử lý</h2>
        <p className="fj-sub">
          {expired
            ? 'Yêu cầu đăng nhập đã hết hạn. Quay lại ứng dụng để tạo yêu cầu mới.'
            : 'Yêu cầu này đã được dùng hoặc đã huỷ. Nếu ứng dụng chưa đăng nhập, hãy thử lại từ Desktop.'}
        </p>
        <Alert type="warning" showIcon content="Mỗi mã uỷ quyền chỉ dùng được một lần." style={{ marginTop: 18 }} />
        <Button type="primary" long size="large" href="/app" style={{ marginTop: 22 }}>
          Mở bảng điều khiển
        </Button>
      </div>
    )
  }

  if (user === null) {
    let appOrigin = ''
    try {
      appOrigin = new URL(authorization.redirectUri).origin
    } catch {
      appOrigin = authorization.redirectUri
    }
    return (
      <div>
        <h2>Đăng nhập để tiếp tục</h2>
        <p className="fj-sub">
          <span className="fj-mono">{appOrigin}</span> đang yêu cầu kết nối với tài khoản FuJue Platform của bạn.
        </p>
        <Alert
          type="info"
          showIcon
          content="Bạn cần đăng nhập trước khi xem quyền mà ứng dụng yêu cầu."
          style={{ marginTop: 18 }}
        />
        <div style={{ marginTop: 22 }}>
          <AuthForm mode="login" next={authorizeId === null ? '/app' : `/dsh/authorize?authorize_id=${encodeURIComponent(authorizeId)}`} />
        </div>
      </div>
    )
  }

  let appOrigin = authorization.redirectUri
  try {
    appOrigin = new URL(authorization.redirectUri).origin
  } catch {
    // Keep the raw redirect text when it is not a valid URL.
  }

  const decide = async (decision: 'approve' | 'deny') => {
    setLoading(decision)
    setError(null)
    try {
      const response = await fetch('/api/dsh/authorize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ authorize_id: authorization.id, decision }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null
            ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Không thể xử lý yêu cầu.')
            : 'Không thể xử lý yêu cầu.'
        setError(message)
        return
      }
      const redirect = (payload as { redirect_url?: unknown }).redirect_url
      if (typeof redirect !== 'string') {
        setError('Phản hồi không hợp lệ từ máy chủ.')
        return
      }
      window.location.assign(redirect)
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div>
      <div className="fj-row" style={{ gap: 10 }}>
        <Tag color="green" icon={<IconSafe />}>
          Yêu cầu uỷ quyền
        </Tag>
        <span className="fj-dim" style={{ fontSize: 12 }}>
          Hết hạn sau ít phút
        </span>
      </div>
      <h2 style={{ marginTop: 16 }}>Cho phép FuJue Harness Desktop?</h2>
      <p className="fj-sub">
        Ứng dụng tại <span className="fj-mono">{appOrigin}</span> muốn dùng tài khoản của bạn. Chỉ cấp quyền cho
        ứng dụng bạn đang chạy.
      </p>

      <div className="fj-glass" style={{ padding: 18, marginTop: 20, display: 'grid', gap: 12 }}>
        <div className="fj-spread" style={{ fontSize: 13 }}>
          <span className="fj-muted">Tài khoản</span>
          <span>
            {user.name} · <span className="fj-dim">{user.email}</span>
          </span>
        </div>
        <Divider style={{ margin: 0 }} />
        <div className="fj-spread" style={{ fontSize: 13 }}>
          <span className="fj-muted">Ứng dụng</span>
          <span>FuJue Harness Desktop</span>
        </div>
        <Divider style={{ margin: 0 }} />
        <div className="fj-spread" style={{ fontSize: 13 }}>
          <span className="fj-muted">Thiết bị</span>
          <span>{authorization.loginSource === 'desktop' ? 'Ứng dụng Desktop' : 'Trình duyệt'}</span>
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'grid', gap: 10, fontSize: 13, color: 'var(--fj-muted)' }}>
        <span className="fj-row" style={{ gap: 10 }}>
          <IconCheck style={{ color: 'var(--fj-green)' }} /> Đọc hồ sơ, số dư và thông báo tài khoản
        </span>
        <span className="fj-row" style={{ gap: 10 }}>
          <IconCheck style={{ color: 'var(--fj-green)' }} /> Gọi mô hình bằng số dư của bạn và ghi nhận chi phí
        </span>
        <span className="fj-row" style={{ gap: 10 }}>
          <IconLock style={{ color: 'var(--fj-accent)' }} /> Không thể đổi mật khẩu hay tạo khoá API thay bạn
        </span>
      </div>

      {error === null ? null : <Alert type="error" showIcon content={error} style={{ marginTop: 18 }} />}

      <div className="fj-row" style={{ marginTop: 22, gap: 10 }}>
        <Button
          type="primary"
          long
          size="large"
          loading={loading === 'approve'}
          disabled={loading !== null}
          onClick={() => decide('approve')}
        >
          Cho phép kết nối
        </Button>
        <Button
          long
          size="large"
          status="danger"
          loading={loading === 'deny'}
          disabled={loading !== null}
          onClick={() => decide('deny')}
        >
          <IconClose /> Từ chối
        </Button>
      </div>

      <p className="fj-dim" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
        Không phải {user.email}?{' '}
        <button
          type="button"
          onClick={() => {
            void fetch('/api/auth/logout', { method: 'POST' }).then(() => {
              window.location.assign(
                `/login?next=${encodeURIComponent(`/dsh/authorize?authorize_id=${authorization.id}`)}`,
              )
            })
          }}
          style={{
            background: 'none',
            border: 0,
            padding: 0,
            font: 'inherit',
            color: 'var(--fj-accent)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Dùng tài khoản khác
        </button>
      </p>
    </div>
  )
}
