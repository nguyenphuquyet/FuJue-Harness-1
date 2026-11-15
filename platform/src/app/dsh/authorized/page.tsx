'use client'

import { Button, Tag } from '@arco-design/web-react'
import { IconCheck } from '@arco-design/web-react/icon'
import { useRouter } from 'next/navigation'
import { Brand } from '@/components/Brand'

/**
 * Completion page the desktop client opened after the code exchange.
 *
 * @returns the success card.
 */
export default function AuthorizedPage() {
  const router = useRouter()
  return (
    <div className="fj-auth">
      <aside className="fj-auth-aside">
        <Brand />
        <div>
          <span className="fj-eyebrow">
            <span className="fj-dot" /> Kết nối hoàn tất
          </span>
          <h1 style={{ marginTop: 18 }}>
            Desktop đã <span className="fj-accent-text">sẵn sàng</span>.
          </h1>
          <p>
            FuJue Harness Desktop đã nhận token riêng cho thiết bị này. Bạn có thể đóng tab và quay lại ứng dụng —
            danh sách mô hình, số dư và thông báo sẽ tự cập nhật.
          </p>
          <div className="fj-hero-points" style={{ marginTop: 26, gap: 14 }}>
            <span>
              <span className="fj-dot" /> Token riêng cho thiết bị
            </span>
            <span>
              <span className="fj-dot" /> Có thể thu hồi trên web
            </span>
            <span>
              <span className="fj-dot" /> Đo lường từng yêu cầu
            </span>
          </div>
        </div>
        <p className="fj-dim" style={{ fontSize: 12 }}>
          Nếu ứng dụng chưa cập nhật, hãy chọn “Đăng nhập bằng trình duyệt” lại trong FuJue Harness.
        </p>
      </aside>
      <main className="fj-auth-main">
        <div className="fj-auth-card">
          <Tag color="green" icon={<IconCheck />} style={{ marginBottom: 16 }}>
            Đã uỷ quyền
          </Tag>
          <h2>Bạn đã kết nối FuJue Harness</h2>
          <p className="fj-sub">
            Trình duyệt có thể đóng tab này. Mọi thao tác tiếp theo diễn ra trong ứng dụng Desktop hoặc trên bảng
            điều khiển FuJue Platform.
          </p>
          <div className="fj-row" style={{ marginTop: 24, gap: 10 }}>
            <Button type="primary" long size="large" onClick={() => router.push('/app')}>
              Mở bảng điều khiển
            </Button>
            <Button long size="large" onClick={() => window.close()}>
              Đóng tab
            </Button>
          </div>
          <p className="fj-auth-foot">
            Quản lý thiết bị đã kết nối trong <a href="/app/settings">Cài đặt → Thiết bị đã kết nối</a>.
          </p>
        </div>
      </main>
    </div>
  )
}
