'use client'

import { Button, Spin } from '@arco-design/web-react'
import { IconLock } from '@arco-design/web-react/icon'
import { useEffect, useState } from 'react'

/** The `window.dsh` bridge the Desktop Platform preload installs. */
interface DesktopPlatformBridge {
  readonly displayMode: 'embedded'
  readonly getAuthToken: () => string
}

declare global {
  interface Window {
    /** Present only inside the embedded Platform view of FuJue Harness Desktop. */
    readonly dsh?: DesktopPlatformBridge
  }
}

type BridgeState =
  /** Exchanging the Desktop grant for a session cookie. */
  | 'connecting'
  /** No usable Desktop bridge, so the visitor must sign in with the browser. */
  | 'signed-out'
  /** The grant was rejected or the exchange failed. */
  | 'failed'

/**
 * Sign the embedded Desktop page in with the grant the application holds.
 *
 * The Desktop view clears cookies before every open, so each open posts the
 * account grant to `/api/auth/desktop-session` and reloads into a cookie
 * session. A browser without the bridge gets the sign-in card instead.
 *
 * @param props - destination reloaded once the session cookie exists.
 * @returns the authentication gate.
 */
export function DesktopSessionBridge({ next }: { readonly next: string }) {
  const [state, setState] = useState<BridgeState>('connecting')

  useEffect(() => {
    let token = ''
    try {
      const bridge = window.dsh
      if (bridge?.displayMode === 'embedded') token = bridge.getAuthToken()
    } catch {
      // The preload keeps embedded mode after a failed bootstrap and reports it by throwing.
      setState('signed-out')
      return
    }
    if (token === '') {
      setState('signed-out')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/auth/desktop-session', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        if (cancelled) return
        if (!response.ok) {
          setState('failed')
          return
        }
        window.location.replace(next)
      } catch {
        if (!cancelled) setState('failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [next])

  if (state === 'connecting') {
    return (
      <div className="fj-embed-gate">
        <section className="fj-embed-card">
          <Spin dot />
          <h2>Đang xác thực phiên Desktop</h2>
          <p className="fj-muted">Ứng dụng đang chuyển quyền truy cập sang trang này.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="fj-embed-gate">
      <section className="fj-embed-card">
        <div className="fj-embed-icon" aria-hidden="true">
          <IconLock />
        </div>
        <h2>{state === 'failed' ? 'Không xác thực được phiên Desktop' : 'Cần đăng nhập'}</h2>
        <p className="fj-muted">
          {state === 'failed'
            ? 'Phiên của ứng dụng có thể đã hết hạn hoặc đã bị thu hồi. Đăng nhập lại trong FuJue Harness Desktop rồi mở lại trang này.'
            : 'Trang này dùng phiên đăng nhập của FuJue Harness Desktop. Mở lại từ ứng dụng, hoặc đăng nhập bằng trình duyệt.'}
        </p>
        <div className="fj-embed-actions">
          {state === 'failed' ? (
            <Button type="primary" onClick={() => window.location.reload()}>
              Thử lại
            </Button>
          ) : null}
          <Button href={`/login?next=${encodeURIComponent(next)}`}>Đăng nhập bằng trình duyệt</Button>
          <Button href="/app">Mở bảng điều khiển</Button>
        </div>
      </section>
    </div>
  )
}
