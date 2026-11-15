'use client'

import { Button, Tag } from '@arco-design/web-react'
import {
  IconArrowRight, IconCheck, IconCloud, IconCode, IconDownload, IconLink, IconLock, IconRobot, IconSafe,
  IconThunderbolt,
} from '@arco-design/web-react/icon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/SiteHeader'
import { formatPrice, type PlatformModel } from '@/lib/models'

const FEATURES = [
  {
    icon: <IconLink />,
    title: 'Một phiên cho mọi nơi',
    body: 'Đăng nhập trong trình duyệt rồi mở FuJue Harness Desktop: phiên, hồ sơ và số dư được đồng bộ tự động qua PKCE, không cần dán khoá.',
  },
  {
    icon: <IconLock />,
    title: 'Khoá API tách biệt',
    body: 'Mỗi ứng dụng một khoá riêng, chỉ hiển thị một lần, thu hồi tức thì. Theo dõi khoá nào đã dùng bao nhiêu token.',
  },
  {
    icon: <IconRobot />,
    title: 'Playground dùng thử ngay',
    body: 'So sánh DeepSeek V4.1 Flash và V4 Pro, chỉnh nhiệt độ, xem chi phí từng lượt trước khi đưa vào sản phẩm.',
  },
  {
    icon: <IconCode />,
    title: 'API tương thích OpenAI',
    body: 'Chat completions, danh sách mô hình và cổng Anthropic cho Desktop — cùng một khoá, cùng một bảng đo lường.',
  },
  {
    icon: <IconThunderbolt />,
    title: 'Đo lường theo thời gian',
    body: 'Token vào, token ra và chi phí từng yêu cầu được ghi lại ngay khi hoàn tất, kể cả khi stream.',
  },
  {
    icon: <IconSafe />,
    title: 'Bảo mật mặc định',
    body: 'Cookie HttpOnly, PKCE S256, mã uỷ quyền một lần và chỉ lưu băm của khoá. Không có bí mật nào nằm trong cơ sở dữ liệu dạng thô.',
  },
]

const PLANS = [
  {
    name: 'Khám phá',
    price: '$0',
    note: 'mãi mãi',
    description: 'Đủ để chạy thử toàn bộ luồng Desktop và API.',
    features: ['1.00 USD dùng thử', '2 mô hình đầy đủ', 'Playground + khoá API', 'Đo lường 30 ngày'],
    cta: 'Tạo tài khoản',
    featured: false,
  },
  {
    name: 'Pro',
    price: '$9',
    note: '/ tháng',
    description: 'Cho nhà phát triển dùng hằng ngày với cả hai mô hình.',
    features: ['Tặng 9 USD tín dụng mỗi tháng', 'Khoá API không giới hạn', 'Lịch sử sử dụng 12 tháng', 'Ưu tiên hàng đợi'],
    cta: 'Bắt đầu Pro',
    featured: true,
  },
  {
    name: 'Team',
    price: '$49',
    note: '/ tháng',
    description: 'Chia sẻ hạn mức, khoá và báo cáo cho cả nhóm.',
    features: ['5 thành viên', 'Báo cáo theo khoá và mô hình', 'SSO qua trình duyệt', 'Hỗ trợ riêng'],
    cta: 'Liên hệ tư vấn',
    featured: false,
  },
]

/**
 * Marketing landing page: value proposition, live chat preview, models, integration, and pricing.
 *
 * @param props - served models rendered in the catalog section and whether the visitor is signed in.
 * @returns the public page.
 */
export function LandingPageView({
  models,
  signedIn,
}: {
  readonly models: readonly PlatformModel[]
  readonly signedIn: boolean
}) {
  const router = useRouter()

  return (
    <div>
      <SiteHeader signedIn={signedIn} />
      <main>
        <section className="fj-hero">
          <div className="fj-container fj-hero-grid">
            <div className="fj-rise">
              <span className="fj-eyebrow">
                <span className="fj-dot" /> Public preview · FuJue Platform
              </span>
              <h1>
                Một tài khoản cho <span className="fj-accent-text">toàn bộ</span> FuJue Harness.
              </h1>
              <p className="fj-hero-sub">
                Đăng nhập một lần trên trình duyệt — Desktop, API và Playground dùng chung phiên, khoá và số dư.
                Tạo khoá, xem chi phí từng lượt và mang mô hình vào sản phẩm của bạn trong vài phút.
              </p>
              <div className="fj-hero-actions">
                {signedIn ? (
                  <Button type="primary" size="large" onClick={() => router.push('/app')}>
                    Mở bảng điều khiển <IconArrowRight />
                  </Button>
                ) : (
                  <Button type="primary" size="large" onClick={() => router.push('/register')}>
                    Bắt đầu miễn phí <IconArrowRight />
                  </Button>
                )}
                <Button size="large" href="#models">
                  Xem mô hình
                </Button>
                <Button size="large" href="/download">
                  <IconDownload /> Tải Harness
                </Button>
              </div>
              <div className="fj-hero-points">
                <span>
                  <span className="fj-dot" /> Tặng 1.00 USD dùng thử
                </span>
                <span>
                  <span className="fj-dot" /> Không cần thẻ
                </span>
                <span>
                  <span className="fj-dot" /> Kết nối Desktop trong 2 phút
                </span>
              </div>
            </div>

            <div className="fj-preview fj-rise" aria-hidden="true">
              <div className="fj-preview-bar">
                <span className="fj-preview-dot" />
                <span className="fj-preview-dot" />
                <span className="fj-preview-dot" />
                <span style={{ marginLeft: 8 }}>FuJue Harness · Phiên đã đồng bộ</span>
                <Tag size="small" color="green" style={{ marginLeft: 'auto' }}>
                  Desktop
                </Tag>
              </div>
              <div className="fj-preview-body">
                <div className="fj-bubble fj-bubble--user">Đọc repo này, tìm lỗi build trên Windows và sửa giúp tôi.</div>
                <div className="fj-bubble fj-bubble--ai">
                  Tôi sẽ kiểm tra workflow, script đóng gói và log gần nhất.
                  <div className="fj-mini-code">pnpm run package:desktop:win:x64:unsigned</div>
                  <span className="fj-typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
                <div className="fj-bubble fj-bubble--ai" style={{ borderColor: 'rgba(52, 211, 153, 0.35)' }}>
                  <span style={{ color: 'var(--fj-green)' }}>✓</span> Đã tìm thấy nguyên nhân: thiếu Visual Studio
                  Build Tools trên runner. Đã thêm bước cài đặt và mở lại PR.
                  <div className="fj-msg--meta" style={{ marginTop: 10 }}>
                    deepseek-v4-pro · 8.4K token vào · 1.2K token ra
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fj-section" id="features">
          <div className="fj-container">
            <div className="fj-section-head">
              <span className="fj-eyebrow">Tích hợp sẵn</span>
              <h2>Mọi thứ Desktop cần, ngay trên web.</h2>
              <p>
                FuJue Platform không phải một trang quản trị rời rạc. Nó phục vụ đúng giao thức mà FuJue Harness
                Desktop đang dùng: đăng nhập PKCE, hồ sơ, ví, thông báo, danh sách mô hình và cổng suy luận.
              </p>
            </div>
            <div className="fj-grid fj-grid--3">
              {FEATURES.map(feature => (
                <article key={feature.title} className="fj-card">
                  <span className="fj-card-icon">{feature.icon}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fj-section" id="models">
          <div className="fj-container">
            <div className="fj-section-head">
              <span className="fj-eyebrow">Danh mục mô hình</span>
              <h2>Hai mô hình, một khoá API.</h2>
              <p>
                Chọn mô hình theo tác vụ. Mọi lượt gọi đều có cùng định dạng, cùng đo lường và cùng cách thanh toán —
                đổi mô hình chỉ là đổi một chuỗi.
              </p>
            </div>
            <div className="fj-grid fj-grid--2">
              {models.map(model => (
                <article key={model.id} className={`fj-model-card${model.recommended === true ? ' fj-model-card--featured' : ''}`}>
                  <div className="fj-model-head">
                    <div>
                      <div className="fj-model-name">{model.name}</div>
                      <div className="fj-model-tagline">{model.tagline}</div>
                    </div>
                    {model.badge === undefined ? null : (
                      <Tag color={model.badge.tone === 'success' ? 'green' : 'arcoblue'}>{model.badge.text.vi}</Tag>
                    )}
                  </div>
                  <p className="fj-muted" style={{ fontSize: 14, lineHeight: 1.65 }}>
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
                  <Button
                    type={model.recommended === true ? 'primary' : 'secondary'}
                    long
                    onClick={() => router.push(`/app/playground?model=${model.id}`)}
                  >
                    Dùng thử {model.name}
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fj-section" id="integrate">
          <div className="fj-container">
            <div className="fj-grid fj-grid--2" style={{ alignItems: 'start', gap: 40 }}>
              <div>
                <span className="fj-eyebrow">Kết nối Desktop</span>
                <h2 style={{ marginTop: 14, fontSize: 'clamp(26px, 3vw, 38px)' }}>
                  Đăng nhập một lần. Desktop tự nhận phần còn lại.
                </h2>
                <p className="fj-muted" style={{ marginTop: 16, lineHeight: 1.7 }}>
                  Desktop mở trình duyệt tới trang uỷ quyền của Platform. Sau khi bạn đồng ý, ứng dụng nhận token
                  riêng cho thiết bị, tải danh sách mô hình và đồng bộ số dư — không có khoá nào bị dán thủ công.
                </p>
                <div className="fj-steps" style={{ marginTop: 26 }}>
                  <div className="fj-step">
                    <span className="fj-step-number">1</span>
                    <div>
                      <h4>Trỏ Desktop về Platform</h4>
                      <p>Đặt <code>platformOrigin</code> và <code>inferenceOrigin</code> trong cấu hình FuJue Harness.</p>
                    </div>
                  </div>
                  <div className="fj-step">
                    <span className="fj-step-number">2</span>
                    <div>
                      <h4>Chọn “Đăng nhập bằng trình duyệt”</h4>
                      <p>Trang uỷ quyền hiện ứng dụng, thiết bị và quyền được cấp trước khi bạn đồng ý.</p>
                    </div>
                  </div>
                  <div className="fj-step">
                    <span className="fj-step-number">3</span>
                    <div>
                      <h4>Dùng ngay trong Desktop</h4>
                      <p>Danh sách mô hình, số dư và thông báo xuất hiện trong ứng dụng; hoá đơn nằm trên web.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <div className="fj-code-block" aria-label="Cấu hình FuJue Harness">
                  <span className="tok-com"># cordis.yml — FuJue Harness</span>
                  {'\n'}
                  <span className="tok-key">- id:</span> deepseek-account{'\n'}
                  {'  '}
                  <span className="tok-key">config:</span>
                  {'\n'}
                  {'    '}
                  <span className="tok-key">platformOrigin:</span> <span className="tok-str">&apos;https://platform.fujue.ai&apos;</span>
                  {'\n'}
                  {'    '}
                  <span className="tok-key">inferenceOrigin:</span> <span className="tok-str">&apos;https://platform.fujue.ai&apos;</span>
                  {'\n'}
                  {'\n'}
                  <span className="tok-key">- id:</span> llm-deepseek-account{'\n'}
                  {'  '}
                  <span className="tok-key">config:</span>
                  {'\n'}
                  {'    '}
                  <span className="tok-key">baseURL:</span> <span className="tok-str">&apos;https://platform.fujue.ai/anthropic&apos;</span>
                </div>
                <div className="fj-code-block" style={{ marginTop: 14 }} aria-label="Gọi API bằng curl">
                  <span className="tok-com"># Gọi API bằng khoá FuJue</span>
                  {'\n'}curl https://platform.fujue.ai/v1/chat/completions \{'\n'}
                  {'  '}-H <span className="tok-str">&quot;Authorization: Bearer $FJ_API_KEY&quot;</span> \{'\n'}
                  {'  '}-H <span className="tok-str">&quot;Content-Type: application/json&quot;</span> \{'\n'}
                  {'  '}-d <span className="tok-str">&apos;{'{'}&quot;model&quot;:&quot;deepseek-flash&quot;,&quot;messages&quot;:[{'{'}&quot;role&quot;:&quot;user&quot;,&quot;content&quot;:&quot;Xin chào&quot;{'}'}]{'}'}&apos;</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="fj-section" id="pricing">
          <div className="fj-container">
            <div className="fj-section-head">
              <span className="fj-eyebrow">Bảng giá</span>
              <h2>Trả cho token, không trả cho ghế ngồi.</h2>
              <p>Mọi gói đều dùng chung cổng API và cổng Desktop. Nâng cấp chỉ để tăng tín dụng và hạn mức.</p>
            </div>
            <div className="fj-plans">
              {PLANS.map(plan => (
                <article key={plan.name} className={`fj-plan${plan.featured ? ' fj-plan--featured' : ''}`}>
                  <div className="fj-spread">
                    <strong>{plan.name}</strong>
                    {plan.featured ? <Tag color="arcoblue">Phổ biến</Tag> : null}
                  </div>
                  <div className="fj-plan-price">
                    {plan.price} <small>{plan.note}</small>
                  </div>
                  <p className="fj-muted" style={{ fontSize: 13.5 }}>
                    {plan.description}
                  </p>
                  <ul>
                    {plan.features.map(feature => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Button
                    type={plan.featured ? 'primary' : 'secondary'}
                    long
                    onClick={() => router.push(plan.name === 'Team' ? '/docs' : '/register')}
                  >
                    {plan.cta}
                  </Button>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="fj-section fj-section--tight">
          <div className="fj-container">
            <div
              className="fj-glass"
              style={{
                padding: '44px 40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ fontSize: 28 }}>Sẵn sàng đồng bộ Desktop?</h2>
                <p className="fj-muted" style={{ marginTop: 10, maxWidth: 560 }}>
                  Tạo tài khoản, lấy khoá đầu tiên và trỏ FuJue Harness về Platform. Toàn bộ mất chưa tới hai phút.
                </p>
              </div>
              <div className="fj-row">
                <Button type="primary" size="large" onClick={() => router.push('/register')}>
                  Tạo tài khoản <IconArrowRight />
                </Button>
                <Button size="large" onClick={() => router.push('/docs')}>
                  Đọc tài liệu
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="fj-footer">
        <div className="fj-container">
          <div className="fj-footer-grid">
            <div>
              <div className="fj-brand" style={{ marginBottom: 14 }}>
                <span className="fj-brand-mark" aria-hidden="true" />
                <span className="fj-brand-text">
                  FuJue <span>Platform</span>
                </span>
              </div>
              <p className="fj-muted" style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 320 }}>
                Tài khoản, khoá API và cổng mô hình cho FuJue Harness. Xây dựng cho quy trình agent hằng ngày.
              </p>
              <div className="fj-row" style={{ marginTop: 16 }}>
                <Tag color="green">Đang hoạt động</Tag>
                <span className="fj-dim" style={{ fontSize: 12 }}>
                  v0.1
                </span>
              </div>
            </div>
            <div>
              <h5>Sản phẩm</h5>
              <Link href="/app/playground">Playground</Link>
              <Link href="/app/keys">Khoá API</Link>
              <Link href="/app/models">Mô hình</Link>
              <Link href="/app/usage">Sử dụng</Link>
              <Link href="/download">Tải Harness</Link>
            </div>
            <div>
              <h5>Tài nguyên</h5>
              <Link href="/docs">Tài liệu</Link>
              <Link href="/docs#desktop">Kết nối Desktop</Link>
              <Link href="/docs#api">Tham chiếu API</Link>
              <Link href="/register">Tạo tài khoản</Link>
            </div>
            <div>
              <h5>Tin cậy</h5>
              <span className="fj-muted" style={{ display: 'block', padding: '5px 0', fontSize: 13.5 }}>
                PKCE S256
              </span>
              <span className="fj-muted" style={{ display: 'block', padding: '5px 0', fontSize: 13.5 }}>
                Cookie HttpOnly
              </span>
              <span className="fj-muted" style={{ display: 'block', padding: '5px 0', fontSize: 13.5 }}>
                Khoá chỉ lưu băm
              </span>
              <span className="fj-muted" style={{ display: 'block', padding: '5px 0', fontSize: 13.5 }}>
                Cổng Anthropic
              </span>
            </div>
          </div>
          <div className="fj-footer-note">
            <span>© {new Date().getFullYear()} FuJue Platform. Bản dựng nội bộ.</span>
            <span className="fj-row" style={{ gap: 8 }}>
              <IconCloud /> Triển khai bằng Next.js + MySQL
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
