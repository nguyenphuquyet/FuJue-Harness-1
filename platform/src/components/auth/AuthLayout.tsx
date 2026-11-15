import type { ReactNode } from 'react'
import { Brand } from '@/components/Brand'

/**
 * Two-column authentication scaffold shared by sign-in, sign-up, and consent pages.
 *
 * @param props - the page's form card content.
 * @returns the authentication layout.
 */
export function AuthLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="fj-auth">
      <aside className="fj-auth-aside">
        <Brand />
        <div>
          <span className="fj-eyebrow">
            <span className="fj-dot" /> FuJue Platform
          </span>
          <h1 style={{ marginTop: 18 }}>
            Đăng nhập một lần. <span className="fj-accent-text">Dùng mọi nơi.</span>
          </h1>
          <p>
            Một phiên cho Desktop, Playground và API. Khoá được tách theo ứng dụng, chi phí hiển thị theo từng lượt
            gọi và bạn có thể thu hồi quyền truy cập bất cứ lúc nào.
          </p>
          <div className="fj-hero-points" style={{ marginTop: 26, gap: 14 }}>
            <span>
              <span className="fj-dot" /> 1.00 USD dùng thử
            </span>
            <span>
              <span className="fj-dot" /> Đồng bộ Desktop
            </span>
            <span>
              <span className="fj-dot" /> Đo lường từng yêu cầu
            </span>
          </div>
        </div>
        <p className="fj-dim" style={{ fontSize: 12 }}>
          Phiên đăng nhập dùng cookie HttpOnly. Không có khoá nào lưu dạng thô trên máy chủ.
        </p>
      </aside>
      <main className="fj-auth-main">
        <div className="fj-auth-card">{children}</div>
      </main>
    </div>
  )
}
