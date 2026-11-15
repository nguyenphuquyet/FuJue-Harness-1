'use client'

import { Alert, Button, Form, Input, Message } from '@arco-design/web-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Login or registration mode supported by the shared form. */
export type AuthMode = 'login' | 'register'

const emailRule = { type: 'email' as const, message: 'Email không hợp lệ' }

/**
 * Browser sign-in and sign-up form.
 *
 * @param props - form mode and the path to open after success.
 * @returns the authenticated form card.
 */
export function AuthForm({ mode, next }: { readonly mode: AuthMode; readonly next: string }) {
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (values: Record<string, string>) => {
    setLoading(true)
    setError(null)
    try {
      const body =
        mode === 'register'
          ? { name: values.name, email: values.email, password: values.password, locale: 'vi' }
          : { email: values.email, password: values.password }
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === 'object' && payload !== null
            ? String((payload as { error?: { message?: unknown } }).error?.message ?? 'Yêu cầu không thành công.')
            : 'Yêu cầu không thành công.'
        setError(message)
        return
      }
      Message.success(mode === 'register' ? 'Tài khoản đã sẵn sàng.' : 'Đăng nhập thành công.')
      router.replace(next)
      router.refresh()
    } catch {
      setError('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>{mode === 'register' ? 'Tạo tài khoản FuJue' : 'Chào mừng trở lại'}</h2>
      <p className="fj-sub">
        {mode === 'register'
          ? 'Miễn phí, không cần thẻ. Bạn nhận ngay 1.00 USD tín dụng dùng thử.'
          : 'Đăng nhập để quản lý khoá, xem chi phí và đồng bộ FuJue Harness Desktop.'}
      </p>

      {error === null ? null : (
        <Alert type="error" showIcon content={error} style={{ marginTop: 18 }} />
      )}

      <Form form={form} layout="vertical" onSubmit={submit} style={{ marginTop: 22 }} autoComplete="on">
        {mode === 'register' ? (
          <Form.Item label="Tên hiển thị" field="name" rules={[{ required: true, message: 'Nhập tên của bạn' }]}>
            <Input placeholder="Nguyễn Phú Quyết" size="large" autoComplete="name" />
          </Form.Item>
        ) : null}
        <Form.Item label="Email" field="email" rules={[{ required: true, message: 'Nhập email' }, emailRule]}>
          <Input placeholder="ban@congty.vn" size="large" autoComplete="email" />
        </Form.Item>
        <Form.Item
          label="Mật khẩu"
          field="password"
          rules={[{ required: true, message: 'Nhập mật khẩu' }, { minLength: mode === 'register' ? 8 : 1, message: 'Tối thiểu 8 ký tự' }]}
        >
          <Input.Password placeholder={mode === 'register' ? 'Tối thiểu 8 ký tự' : '••••••••'} size="large" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
        </Form.Item>
        {mode === 'register' ? (
          <Form.Item
            label="Nhập lại mật khẩu"
            field="confirm"
            rules={[
              { required: true, message: 'Nhập lại mật khẩu' },
              {
                validator: (value: string | undefined, callback: (message?: string) => void) => {
                  if (value === form.getFieldValue('password')) callback()
                  else callback('Mật khẩu nhập lại không khớp')
                },
              },
            ]}
          >
            <Input.Password placeholder="Nhập lại mật khẩu" size="large" autoComplete="new-password" />
          </Form.Item>
        ) : null}
        <Button type="primary" htmlType="submit" long size="large" loading={loading}>
          {mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập'}
        </Button>
      </Form>

      <p className="fj-auth-foot">
        {mode === 'register' ? (
          <>
            Đã có tài khoản? <Link href={`/login?next=${encodeURIComponent(next)}`}>Đăng nhập</Link>
          </>
        ) : (
          <>
            Chưa có tài khoản? <Link href={`/register?next=${encodeURIComponent(next)}`}>Tạo miễn phí</Link>
          </>
        )}
      </p>

      {mode === 'login' ? (
        <p className="fj-dim" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
          Tài khoản demo: <span className="fj-mono">demo@fujue.ai</span> · <span className="fj-mono">fujue123</span>
        </p>
      ) : (
        <p className="fj-dim" style={{ marginTop: 16, fontSize: 12, textAlign: 'center' }}>
          Bằng việc tạo tài khoản, bạn đồng ý sử dụng hợp lý và chính sách dữ liệu của FuJue Platform.
        </p>
      )}
    </div>
  )
}
