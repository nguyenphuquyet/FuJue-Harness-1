import Link from 'next/link'

/** Table-of-contents entries, in reading order. */
const SECTIONS = [
  { id: 'start', label: 'Bắt đầu nhanh' },
  { id: 'download', label: 'Tải Harness' },
  { id: 'desktop', label: 'Kết nối Desktop' },
  { id: 'api', label: 'Tham chiếu API' },
  { id: 'anthropic', label: 'Cổng Anthropic' },
  { id: 'keys', label: 'Khoá và bảo mật' },
  { id: 'usage', label: 'Đo lường và số dư' },
  { id: 'errors', label: 'Mã lỗi' },
]

/**
 * Documentation body shared by the public and dashboard documentation routes.
 *
 * @returns the documentation layout.
 */
export function DocsContent() {
  return (
    <div className="fj-docs">
      <nav className="fj-docs-nav" aria-label="Mục lục tài liệu">
        {SECTIONS.map(section => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <div className="fj-docs-body">
        <div className="fj-page-head">
          <div>
            <h1>Tài liệu</h1>
            <p>Đăng nhập Desktop, gọi API và hiểu cách FuJue Platform tính chi phí.</p>
          </div>
        </div>

        <section id="start">
          <h2>Bắt đầu nhanh</h2>
          <p>
            FuJue Platform cấp một tài khoản dùng chung cho bảng điều khiển web, FuJue Harness Desktop và API. Ba bước
            dưới đây là toàn bộ luồng thiết lập:
          </p>
          <div className="fj-steps" style={{ marginTop: 20 }}>
            <div className="fj-step">
              <span className="fj-step-number">1</span>
              <div>
                <h4>Tạo tài khoản</h4>
                <p>Đăng ký bằng email. Mỗi tài khoản mới nhận 1.00 USD tín dụng thưởng dùng cho mọi mô hình.</p>
              </div>
            </div>
            <div className="fj-step">
              <span className="fj-step-number">2</span>
              <div>
                <h4>Tạo khoá API nếu gọi từ code</h4>
                <p>
                  Khoá chỉ hiển thị một lần. Đặt tên theo môi trường, ví dụ <span className="fj-mono">Production</span>{' '}
                  hoặc <span className="fj-mono">CI</span>.
                </p>
              </div>
            </div>
            <div className="fj-step">
              <span className="fj-step-number">3</span>
              <div>
                <h4>Kết nối Desktop hoặc gọi mô hình</h4>
                <p>
                  Desktop dùng đăng nhập trình duyệt, không cần dán khoá. Ứng dụng khác dùng khoá API với cổng OpenAI
                  hoặc Anthropic bên dưới.
                </p>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 18 }}>
            Mọi tài khoản đều tạo khoá API riêng ở <Link href="/app/keys">trang API key</Link>; khoá chỉ hiển thị một
            lần ngay sau khi tạo.
          </p>
        </section>

        <section id="download">
          <h2>Tải FuJue Harness</h2>
          <p>
            Bộ cài chính thức cho Windows, macOS và Linux nằm ở <Link href="/download">trang tải ứng dụng</Link>. Trang
            đó hiển thị phiên bản hiện hành, liên kết tải trực tiếp và ghi chú cho từng nền tảng.
          </p>
          <ul>
            <li>Windows 10/11 x64 — bản chưa ký, Windows SmartScreen có thể hỏi thêm ở lần mở đầu tiên.</li>
            <li>macOS 13 trở lên — bản riêng cho Apple Silicon và Intel.</li>
            <li>Linux x64 — AppImage, cần <span className="fj-mono">chmod +x</span> trước khi chạy.</li>
          </ul>
          <p>
            Sau khi cài, mở ứng dụng và chọn “Đăng nhập bằng trình duyệt”. Không cần dán khoá API: Desktop nhận phiên,
            số dư và danh sách mô hình từ tài khoản của bạn.
          </p>
        </section>

        <section id="desktop">
          <h2>Kết nối FuJue Harness Desktop</h2>
          <p>
            Desktop dùng uỷ quyền PKCE: ứng dụng tạo một thử thách, mở trình duyệt tới trang đồng ý, nhận mã một lần
            rồi đổi mã đó thành token riêng cho thiết bị. Không có khoá nào bị dán thủ công và token có thể thu hồi
            từ web.
          </p>
          <h3>1. Trỏ hồ sơ Desktop về Platform</h3>
          <div className="fj-code-block">{`# cordis.yml
- id: deepseek-account
  config:
    platformOrigin: 'https://platform.nguyenphuquyet.online'
    harnessOrigin: 'https://platform.nguyenphuquyet.online'
    inferenceOrigin: 'https://platform.nguyenphuquyet.online'

- id: llm-deepseek-account
  config:
    baseURL: 'https://platform.nguyenphuquyet.online/anthropic'`}</div>
          <p>
            Dùng <span className="fj-mono">http://localhost:3000</span> khi chạy Platform cục bộ; đặt thêm{' '}
            <span className="fj-mono">allowLoopbackHttp: true</span> để cho phép HTTP trên loopback trong lúc phát
            triển.
          </p>
          <h3>2. Đăng nhập</h3>
          <p>
            Chọn “Đăng nhập bằng trình duyệt” trong menu tài khoản của ứng dụng. Trình duyệt mở trang uỷ quyền; sau khi
            bạn đồng ý, tab hoàn tất hiện ra và Desktop tự nhận token, danh sách mô hình, số dư và thông báo.
          </p>
          <h3>3. Quản lý thiết bị</h3>
          <p>
            Mỗi lần đăng nhập tạo một token riêng. Xem và thu hồi tại{' '}
            <Link href="/app/settings">Cài đặt → Thiết bị đã kết nối</Link>. Thu hồi xong, ứng dụng trên thiết bị đó
            nhận lỗi 401 và phải đăng nhập lại.
          </p>
          <p>
            Các endpoint Desktop dùng (đều yêu cầu header <span className="fj-mono">x-dsh-auth-token</span>):
          </p>
          <ul>
            <li>
              <span className="fj-mono">POST /auth-api/v0/dsh/auth_init</span> — tạo yêu cầu PKCE
            </li>
            <li>
              <span className="fj-mono">POST /auth-api/v0/dsh/auth_exchange</span> — đổi mã lấy token thiết bị
            </li>
            <li>
              <span className="fj-mono">GET /auth-api/v0/users/current</span> — hồ sơ tài khoản
            </li>
            <li>
              <span className="fj-mono">GET /api/v0/users/get_user_summary</span> — số dư ví
            </li>
            <li>
              <span className="fj-mono">GET /api/v0/users/notifications/list</span> — thông báo chưa đọc
            </li>
            <li>
              <span className="fj-mono">GET /models</span> — danh mục mô hình kèm huy hiệu và năng lực
            </li>
          </ul>
        </section>

        <section id="api">
          <h2>Tham chiếu API</h2>
          <p>
            Cổng OpenAI tương thích nhận cùng một khoá API ở header{' '}
            <span className="fj-mono">Authorization: Bearer</span>, hoặc{' '}
            <span className="fj-mono">x-api-key</span> nếu ứng dụng của bạn dùng kiểu đó.
          </p>
          <h3>Liệt kê mô hình</h3>
          <div className="fj-code-block">{`curl https://platform.nguyenphuquyet.online/v1/models \\
  -H "Authorization: Bearer $FJ_API_KEY"`}</div>
          <h3>Chat completions</h3>
          <div className="fj-code-block">{`curl https://platform.nguyenphuquyet.online/v1/chat/completions \\
  -H "Authorization: Bearer $FJ_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-flash",
    "messages": [
      { "role": "system", "content": "Trả lời ngắn gọn bằng tiếng Việt." },
      { "role": "user", "content": "Tóm tắt thay đổi trong PR này." }
    ],
    "temperature": 0.7,
    "max_tokens": 1024,
    "stream": true
  }'`}</div>
          <p>
            Đặt <span className="fj-mono">base_url</span> của SDK thành{' '}
            <span className="fj-mono">https://platform.nguyenphuquyet.online/v1</span> và dùng khoá FuJue. Trường{' '}
            <span className="fj-mono">stream</span> được chuyển nguyên trạng; chi phí vẫn được ghi khi stream kết
            thúc.
          </p>
          <h3>Ví dụ Python</h3>
          <div className="fj-code-block">{`from openai import OpenAI

client = OpenAI(
    api_key="fjk_sk_...",
    base_url="https://platform.nguyenphuquyet.online/v1",
)

reply = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[{"role": "user", "content": "Giải thích đoạn code này"}],
)
print(reply.choices[0].message.content)`}</div>
        </section>

        <section id="anthropic">
          <h2>Cổng Anthropic</h2>
          <p>
            Desktop gọi mô hình qua giao thức Anthropic tại{' '}
            <span className="fj-mono">/anthropic/v1/messages</span>. Cổng này nhận cùng token thiết bị hoặc khoá API và
            ghi chi phí theo đúng mô hình trong thân yêu cầu.
          </p>
          <p>
            Nhà cung cấp chỉ có endpoint OpenAI thì cổng tự chuyển yêu cầu sang{' '}
            <span className="fj-mono">/chat/completions</span> — nội dung, lời gọi công cụ và luồng sự kiện đều được
            dịch, nên trong trang quản trị chỉ cần điền một URL và một khoá. Ô URL Anthropic chỉ dùng khi nhà cung cấp
            có sẵn giao thức này.
          </p>
          <div className="fj-code-block">{`curl https://platform.nguyenphuquyet.online/anthropic/messages \\
  -H "x-api-key: $FJ_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-flash",
    "max_tokens": 1024,
    "messages": [{ "role": "user", "content": "Xin chào" }]
  }'`}</div>
          <p className="fj-dim" style={{ fontSize: 13 }}>
            Không có yêu cầu mô hình (ví dụ tải tệp) thì cổng chuyển tiếp nguyên vẹn và không tính phí.
          </p>
        </section>

        <section id="keys">
          <h2>Khoá và bảo mật</h2>
          <ul>
            <li>Khoá API có dạng <span className="fj-mono">fjk_sk_…</span> và chỉ được lưu dưới dạng băm SHA-256.</li>
            <li>
              Token thiết bị có dạng <span className="fj-mono">fjk_at_…</span>, gắn với một lần uỷ quyền và thu hồi
              được độc lập.
            </li>
            <li>Phiên trình duyệt dùng cookie HttpOnly, SameSite=Lax; không lưu token trong localStorage.</li>
            <li>
              Mã uỷ quyền chỉ dùng một lần, hết hạn sau 10 phút và bị từ chối nếu redirect không nằm trong danh sách
              cho phép.
            </li>
            <li>Mật khẩu lưu bằng scrypt với salt riêng cho từng tài khoản.</li>
          </ul>
          <p>
            Nếu nghi ngờ khoá bị lộ, thu hồi tại <Link href="/app/keys">Khoá API</Link> rồi tạo khoá mới. Ứng dụng
            đang dùng khoá cũ nhận lỗi 401 ngay lập tức.
          </p>
        </section>

        <section id="usage">
          <h2>Đo lường và số dư</h2>
          <p>
            Mỗi yêu cầu hoàn tất ghi một dòng vào bảng sử dụng với model, token vào, token ra và chi phí. Chi phí tính
            theo giá niêm yết của mô hình, làm tròn 8 chữ số thập phân.
          </p>
          <ul>
            <li>Ví thưởng được trừ trước, sau đó tới số dư đã nạp.</li>
            <li>Số dư không bao giờ âm; yêu cầu mới bị từ chối với mã 402 khi tổng số dư bằng 0.</li>
            <li>
              Bảng <Link href="/app/usage">Sử dụng</Link> lọc theo 7, 14, 30 hoặc 90 ngày và tách theo mô hình, khoá và
              nguồn gọi.
            </li>
            <li>Stream được đo khi nhà cung cấp gửi frame usage; nếu không có frame, yêu cầu không bị tính phí.</li>
          </ul>
        </section>

        <section id="errors">
          <h2>Mã lỗi</h2>
          <p>Cổng OpenAI trả lỗi theo cấu trúc chuẩn, mã nằm ở trường `error.code`:</p>
          <ul>
            <li>
              <span className="fj-mono">401 invalid_api_key</span> — thiếu khoá, khoá bị thu hồi, hoặc token thiết bị
              hết hiệu lực.
            </li>
            <li>
              <span className="fj-mono">402 insufficient_quota</span> — số dư bằng 0; nạp thêm để tiếp tục.
            </li>
            <li>
              <span className="fj-mono">404 model_not_found</span> — Platform không phục vụ model đã yêu cầu.
            </li>
            <li>
              <span className="fj-mono">503 upstream_not_configured</span> — máy chủ thiếu{' '}
              <span className="fj-mono">DEEPSEEK_API_KEY</span>.
            </li>
            <li>
              <span className="fj-mono">502 upstream_unreachable</span> — không kết nối được nhà cung cấp mô hình.
            </li>
          </ul>
          <p>
            Cổng Anthropic trả lỗi dạng <span className="fj-mono">{'{"type":"error","error":{...}}'}</span> với cùng
            ngữ nghĩa HTTP.
          </p>
        </section>
      </div>
    </div>
  )
}
