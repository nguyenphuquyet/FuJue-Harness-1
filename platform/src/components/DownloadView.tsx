'use client'

import { Button, Tag } from '@arco-design/web-react'
import {
  IconArrowRight, IconCheck, IconDownload, IconLink, IconSafe,
} from '@arco-design/web-react/icon'
import Link from 'next/link'
import { Brand } from '@/components/Brand'
import { SiteHeader } from '@/components/SiteHeader'
import type { DownloadAsset, DownloadConfig } from '@/lib/downloads'

const OS_LABEL: Readonly<Record<DownloadAsset['os'], string>> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
}

const STEPS = [
  {
    title: 'Tải bộ cài cho máy của bạn',
    body: 'Chọn đúng nền tảng và kiến trúc. Bản macOS có riêng cho Apple Silicon và Intel.',
  },
  {
    title: 'Mở ứng dụng và chọn “Đăng nhập bằng trình duyệt”',
    body: 'FuJue Harness mở trình duyệt tới FuJue Platform bằng luồng PKCE, không cần dán khoá thủ công.',
  },
  {
    title: 'Xác nhận quyền truy cập',
    body: 'Sau khi đồng ý, Desktop nhận phiên, hồ sơ, danh sách mô hình và số dư của bạn.',
  },
]

/**
 * Public download page for the FuJue Harness desktop app.
 *
 * @param props - published installer configuration and whether the visitor is signed in.
 * @returns the download page.
 */
export function DownloadView({
  config,
  signedIn,
}: {
  readonly config: DownloadConfig
  readonly signedIn: boolean
}) {
  const assets = config.assets.filter(asset => asset.enabled)

  return (
    <div>
      <SiteHeader signedIn={signedIn} />
      <main>
        <section className="fj-section fj-section--tight">
          <div className="fj-container fj-download-hero">
            <div>
              <span className="fj-eyebrow">
                <span className="fj-dot" /> FuJue Harness Desktop
              </span>
              <h1>Tải FuJue Harness</h1>
              <p className="fj-hero-sub">
                Ứng dụng desktop cho công việc agent: đọc mã nguồn, chạy lệnh, quản lý phiên và dùng chung tài khoản,
                khoá API cùng số dư với FuJue Platform.
              </p>
              <div className="fj-hero-actions">
                <Button type="primary" size="large" href={config.releaseUrl} target="_blank">
                  Trang phát hành <IconArrowRight />
                </Button>
                <Button size="large" href={signedIn ? '/app' : '/register'}>
                  {signedIn ? 'Mở bảng điều khiển' : 'Tạo tài khoản miễn phí'}
                </Button>
              </div>
              <div className="fj-hero-points">
                <span>
                  <span className="fj-dot" /> Phiên bản {config.version}
                </span>
                <span>
                  <span className="fj-dot" /> Windows, macOS và Linux
                </span>
                <span>
                  <span className="fj-dot" /> Đăng nhập một lần, dùng mọi nơi
                </span>
              </div>
            </div>

            <aside className="fj-glass" style={{ padding: 22 }}>
              <div className="fj-row" style={{ gap: 10 }}>
                <IconLink style={{ color: 'var(--fj-accent)' }} />
                <strong style={{ fontSize: 14 }}>Kết nối với tài khoản của bạn</strong>
              </div>
              <div className="fj-download-steps">
                {STEPS.map((step, index) => (
                  <div key={step.title} className="fj-download-step">
                    <span className="fj-step-number">{index + 1}</span>
                    <div>
                      <div className="fj-cell-strong" style={{ fontSize: 13.5 }}>
                        {step.title}
                      </div>
                      <p className="fj-table-sub" style={{ lineHeight: 1.6, marginTop: 3 }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="fj-section fj-section--tight" id="downloads">
          <div className="fj-container">
            <div className="fj-section-head">
              <span className="fj-eyebrow">Bộ cài</span>
              <h2>Chọn đúng nền tảng.</h2>
              <p>
                Mỗi gói là bản dựng chính thức của FuJue Harness {config.version}. Nếu liên kết trực tiếp chưa được
                cấu hình, nút tải sẽ mở trang phát hành.
              </p>
            </div>
            {assets.length === 0 ? (
              <div className="fj-panel">
                <p className="fj-muted">
                  Quản trị viên chưa công bố bộ cài nào. Xem{' '}
                  <a href={config.releaseUrl} className="fj-link-inline" target="_blank" rel="noreferrer">
                    trang phát hành <IconArrowRight />
                  </a>
                  .
                </p>
              </div>
            ) : (
              <div className="fj-download-grid">
                {assets.map(asset => (
                  <article key={asset.id} className="fj-download-card">
                    <div className="fj-download-head">
                      <span className="fj-download-icon">
                        <IconDownload />
                      </span>
                      <div>
                        <h3>{asset.label}</h3>
                        <div className="fj-table-sub">
                          {OS_LABEL[asset.os]} · {asset.arch}
                        </div>
                      </div>
                      <Tag size="small" color="gray" style={{ marginLeft: 'auto' }}>
                        {config.version}
                      </Tag>
                    </div>
                    <p>{asset.note}</p>
                    <div className="fj-download-meta">
                      <span className="fj-mono" style={{ wordBreak: 'break-all' }}>
                        {asset.fileName}
                      </span>
                    </div>
                    <Button
                      type="primary"
                      long
                      href={asset.url === '' ? config.releaseUrl : asset.url}
                      target="_blank"
                    >
                      <IconDownload /> Tải cho {OS_LABEL[asset.os]}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container fj-grid fj-grid--2">
            <section className="fj-panel">
              <div className="fj-panel-head">
                <div>
                  <h2>Yêu cầu hệ thống</h2>
                  <p>Kiểm tra trước khi cài</p>
                </div>
                <IconSafe style={{ color: 'var(--fj-dim)' }} />
              </div>
              <ul className="fj-check-list">
                <li>Windows 10/11, macOS 13 trở lên hoặc bản phân phối Linux 64-bit hiện đại.</li>
                <li>Tối thiểu 4 GB RAM; 8 GB trở lên cho phiên dài và nhiều tác vụ song song.</li>
                <li>Có kết nối mạng tới FuJue Platform và nhà cung cấp mô hình.</li>
                <li>Tài khoản FuJue Platform còn số dư hoặc đang dùng gói dùng thử.</li>
              </ul>
            </section>
            <section className="fj-panel">
              <div className="fj-panel-head">
                <div>
                  <h2>Bản chưa ký và quyền hệ thống</h2>
                  <p>Điều gì xảy ra khi mở lần đầu</p>
                </div>
                <IconCheck style={{ color: 'var(--fj-green)' }} />
              </div>
              <ul className="fj-check-list">
                <li>Windows có thể hiện SmartScreen: chọn “More info” rồi “Run anyway”.</li>
                <li>macOS có thể yêu cầu mở bằng chuột phải → Open ở lần chạy đầu tiên.</li>
                <li>Linux AppImage cần cấp quyền thực thi: <span className="fj-inline-code">chmod +x</span>.</li>
                <li>Mọi quyền tệp và lệnh đều nằm trong ứng dụng; gỡ cài đặt bằng trình quản lý hệ thống.</li>
              </ul>
            </section>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <div className="fj-glass" style={{ padding: '28px 30px', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 20 }}>Dùng API từ công cụ khác?</h2>
                <p className="fj-muted" style={{ marginTop: 8, fontSize: 14 }}>
                  Tạo khoá API trong bảng điều khiển rồi dùng cùng giao thức OpenAI hoặc Anthropic.
                </p>
              </div>
              <div className="fj-row" style={{ gap: 10 }}>
                <Button href="/docs">Đọc tài liệu</Button>
                <Button type="primary" href={signedIn ? '/app/keys' : '/register'}>
                  {signedIn ? 'Quản lý khoá API' : 'Bắt đầu miễn phí'}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fj-footer">
        <div className="fj-container">
          <div className="fj-footer-note" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
            <Brand />
            <div className="fj-row" style={{ gap: 18 }}>
              <Link href="/">Trang chủ</Link>
              <Link href="/docs">Tài liệu</Link>
              <Link href="/download">Tải Harness</Link>
              <a href={config.releaseUrl} target="_blank" rel="noreferrer">
                Bản phát hành
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
