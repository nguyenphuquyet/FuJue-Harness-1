# FuJue Platform

Tài khoản, khoá API, đo lường sử dụng và cổng mô hình cho **FuJue Harness**. Web app Next.js + MySQL, giao diện tiếng Việt trên nền Arco Design.

Platform phục vụ đúng giao thức mà FuJue Harness Desktop đang dùng, nên chỉ cần trỏ `platformOrigin` / `inferenceOrigin` về đây là ứng dụng desktop đăng nhập, nhận danh mục mô hình, số dư và thông báo — không cần dán khoá thủ công.

## Tính năng

- **Đăng nhập Desktop bằng trình duyệt (PKCE S256)** — `auth_init` → trang đồng ý → `auth_exchange` → token riêng cho thiết bị. Mã uỷ quyền dùng một lần, hết hạn sau 10 phút.
- **Khoá API** — tạo, xem tiền tố, thu hồi tức thì. Chỉ băm SHA-256 được lưu; bí mật hiển thị đúng một lần.
- **Playground** — chọn mô hình, system prompt, temperature, độ dài tối đa; mỗi lượt hiện token và chi phí.
- **Đo lường** — token vào/ra, chi phí, phân bổ theo ngày, mô hình, khoá và nguồn gọi (Playground / API / Desktop).
- **Cổng mô hình** — OpenAI-compatible (`/v1/chat/completions`) cho ứng dụng bất kỳ và Anthropic-compatible (`/anthropic/*`) cho Desktop. Nhà cung cấp chỉ có endpoint OpenAI vẫn phục vụ được Desktop: cổng tự dịch yêu cầu, lời gọi công cụ và luồng sự kiện sang `/chat/completions`.
- **Suy luận theo mô hình** — bật/tắt và tự đặt danh sách mức (mã + giá trị API) cùng mức mặc định trong `/admin/models`; cổng mô hình ép đúng chính sách đó cho cả hai giao thức.
- **Thông báo trong app** — danh sách, nội dung, sự kiện hiển thị/CTA/đóng, song ngữ Việt–Anh.
- **Quản lý thiết bị** — xem và thu hồi từng token Desktop, hoặc thu hồi toàn bộ.
- **Bảng quản trị** — danh mục mô hình, nhà cung cấp bên thứ ba (URL + khoá API, kiểm tra kết nối), tài khoản, sử dụng toàn nền tảng, thông báo Desktop, nhật ký quản trị và cấu hình trang tải ứng dụng.
- **Trang tải FuJue Harness** — `/download` công khai, hiển thị phiên bản, liên kết cài Windows/macOS/Linux do quản trị viên cập nhật.
- **Trang riêng cho Desktop** — `/usage` và `/top_up` là trang độc lập mà ứng dụng mở trong khung riêng. Trang không có cookie tự đổi token thiết bị (`fjk_at_…`) lấy từ preload thành phiên cookie qua `/api/auth/desktop-session`, nên vẫn dùng đúng số dư và lịch sử của tài khoản đang đăng nhập.
- **Bảo mật** — cookie HttpOnly SameSite=Lax, scrypt cho mật khẩu, token chỉ lưu băm, redirect allowlist.

## Stack

| Thành phần | Lựa chọn |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19) |
| UI | `@arco-design/web-react` 2.66, giao diện sáng, locale `vi-VN` |
| Database | MySQL 8 / MariaDB 10.6+ qua `mysql2` |
| Validation | zod 4 |
| Ngôn ngữ | TypeScript strict, ESM |

## Yêu cầu

- Node.js >= 24.9
- MySQL 8 (hoặc MariaDB 10.6+) đang chạy

## Cài đặt

```sh
cd platform
npm install
cp .env.example .env.local   # rồi sửa thông tin kết nối
npm run db:init              # tạo database, bảng và tài khoản chủ sở hữu
npm run dev                  # http://localhost:3000
```

Bản dựng production:

```sh
npm run build
npm run start
```

Kiểm tra kiểu:

```sh
npm run typecheck
```

### Database

`npm run db:init` đọc `DATABASE_URL` (dạng `mysql://user:pass@host:3306/fujue_platform`) hoặc các biến rời `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`. Script tạo database nếu chưa có, áp `db/schema.sql` (idempotent) rồi tạo tài khoản chủ sở hữu.

```sh
npm run db:init -- --schema-only   # chỉ tạo bảng
npm run db:init -- --seed-only     # chỉ tạo lại tài khoản chủ sở hữu
```

Tài khoản chủ sở hữu lấy từ `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`, `PLATFORM_ADMIN_NAME`; mặc định `quyetguic@gmail.com` / `quyet12345`, vai trò `admin`, số dư 0.

> Mật khẩu chỉ được ghi khi tài khoản chưa tồn tại, nên chạy lại seed không đặt lại mật khẩu bạn đã đổi. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên và không để mật khẩu mặc định trên bản công khai.

### Chuyển nội dung giữa các bản triển khai

`scripts/apply-content.mjs` ghi đè danh mục nhà cung cấp và mô hình bằng một bản xuất JSON (các bảng `providers`, `models`) từ bản triển khai khác. Bản xuất chứa khoá nhà cung cấp thật nên `seed-content.json` bị `.gitignore` chặn và không được commit.

```sh
node scripts/apply-content.mjs đường/dẫn/tới/seed-content.json
```

### Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `DATABASE_URL` | một trong hai | Chuỗi kết nối MySQL. |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | một trong hai | Cấu hình rời khi không dùng URL. |
| `PLATFORM_ORIGIN` | khuyến nghị | Origin công khai, dùng trong `authorize_url` và `authorized_url`. Bỏ trống thì suy ra từ request. |
| `DEEPSEEK_API_KEY` | khuyến nghị | Khoá nhà cung cấp mặc định. Có thể thay bằng khoá lưu trong trang quản trị nhà cung cấp; thiếu cả hai thì Playground/API trả `503 upstream_not_configured`. |
| `DEEPSEEK_UPSTREAM_URL` | không | Gốc OpenAI-compatible mặc định, dùng khi nhà cung cấp để trống URL. Mặc định `https://api.deepseek.com`. |
| `DEEPSEEK_ANTHROPIC_BASE_URL` | không | Gốc Anthropic-compatible mặc định. Để trống thì cổng `/anthropic` dịch sang `/chat/completions` của gốc OpenAI, nên hầu hết nhà cung cấp bên thứ ba chỉ cần URL OpenAI. |
| `DEEPSEEK_MODEL_MAP` | không | JSON ánh xạ id Platform → id nhà cung cấp cho mô hình chưa có `upstream_id`, ví dụ `{"deepseek-flash":"provider-model"}`. |
| `HARNESS_VERSION` | không | Phiên bản FuJue Harness mặc định trên trang tải, ví dụ `0.2.2`. Quản trị viên có thể ghi đè trong `/admin/downloads`. |
| `HARNESS_RELEASES_URL` | không | Trang phát hành mặc định cho các bộ cài chưa có URL trực tiếp. |
| `ALLOWED_REDIRECT_ORIGINS` | không | Danh sách origin HTTPS (phẩy) được phép nhận mã uỷ quyền ngoài origin của Platform. |
| `NODE_ENV` | không | `production` bật cờ `Secure` cho cookie phiên. |
| `PLATFORM_BANK_NAME` / `PLATFORM_BANK_ACCOUNT` / `PLATFORM_BANK_HOLDER` | không | Tài khoản nhận tiền hiển thị trên `/top_up`. Thiếu `PLATFORM_BANK_NAME` hoặc `PLATFORM_BANK_ACCOUNT` thì trang chỉ hiện hướng dẫn liên hệ quản trị viên. |
| `PLATFORM_TOPUP_NOTE` | không | Ghi chú tuỳ chọn đặt trên đầu trang `/top_up`, ví dụ thời gian đối soát. |
| `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` / `PLATFORM_ADMIN_NAME` | không | Tài khoản chủ sở hữu do `db:init` tạo; mặc định `quyetguic@gmail.com` / `quyet12345` / `QuyetGuic`. |

## Kết nối FuJue Harness Desktop

Trong `cordis.patch.yml` (hoặc `cordis.yml`) của profile Desktop. `config` của một patch entry **thay thế** config lớp bundle, nên phải giữ lại `desktopPlatform`:

```yaml
- id: deepseek-account
  config:
    desktopPlatform: !!js "ctx.get('profileContext')?.name === 'desktop' && ['darwin', 'win32'].includes(process.platform) ? process.platform : null"
    platformOrigin: 'https://platform.nguyenphuquyet.online'
    harnessOrigin: 'https://platform.nguyenphuquyet.online'
    inferenceOrigin: 'https://platform.nguyenphuquyet.online'

- id: llm-deepseek-account
  config:
    baseURL: 'https://platform.nguyenphuquyet.online/anthropic'
```

Chạy cục bộ bằng HTTP loopback thì thêm:

```yaml
- id: deepseek-account
  config:
    allowLoopbackHttp: true
    platformOrigin: 'http://localhost:3000'
    harnessOrigin: 'http://localhost:3000'
    inferenceOrigin: 'http://localhost:3000'
```

Sau đó chọn **Đăng nhập bằng trình duyệt** trong ứng dụng. Desktop mở `/dsh/authorize`, nhận mã qua `/dsh/authorized`, đổi mã tại `/auth-api/v0/dsh/auth_exchange` và lưu token `fjk_at_…` cho thiết bị.

### Endpoint Desktop

Mọi endpoint tài khoản yêu cầu header `x-dsh-auth-token`. Response bọc trong phong bì `{ "code": 0, "data": { "biz_code": 0, "biz_data": … } }`.

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| `POST` | `/auth-api/v0/dsh/auth_init` | Tạo yêu cầu PKCE, trả `authorize_url`, `authorize_id`, `expires_in`. |
| `POST` | `/auth-api/v0/dsh/auth_exchange` | Đổi mã + `code_verifier` lấy `token`, `authorized_url`, `user`. |
| `POST` | `/auth-api/v0/dsh/auth_cancel` | Huỷ yêu cầu mà desktop bỏ dở. |
| `GET` | `/auth-api/v0/users/current` | Hồ sơ tài khoản. |
| `POST` | `/auth-api/v0/users/logout` | Thu hồi token đang dùng. |
| `GET` | `/api/v0/users/get_user_summary` | Ví thường và ví thưởng. |
| `GET` | `/api/v0/users/notifications/list` | Thông báo chưa đọc. |
| `GET` | `/api/v0/users/notifications/content?id=…` | Nội dung một thông báo. |
| `POST` | `/api/v0/users/notifications/events` | Báo `displayed`, `cta_clicked`, `dismissed`. |
| `GET` | `/models` | Danh mục mô hình cho Desktop (huy hiệu, năng lực, ngữ cảnh). |

### Trang nhúng trong Desktop

Nút **Xem mức sử dụng** và **Nạp tiền** mở `/usage` và `/top_up` trong `WebContentsView` riêng của ứng dụng. Khung này xoá cookie trước mỗi lần mở, nên preload đưa token thiết bị ra `window.dsh.getAuthToken()` và trang tự đổi token thành phiên cookie:

| Phương thức | Đường dẫn | Mục đích |
| --- | --- | --- |
| `POST` | `/api/auth/desktop-session` | Nhận `{ "token": "fjk_at_…" }`, kiểm tra token còn hiệu lực rồi đặt cookie `fujue_session`. Trả hồ sơ công khai của tài khoản; `401 invalid_grant` khi token bị thu hồi. |

Trang tải lần đầu chưa có cookie nên hiển thị trạng thái "Đang xác thực phiên Desktop", gọi endpoint trên rồi tải lại. Không có `window.dsh` (trình duyệt thường) thì trang hiện thẻ đăng nhập thay vì dữ liệu. Nội dung chuyển khoản trên `/top_up` là `FJ <email>` để quản trị viên đối soát đúng tài khoản.

## API cho ứng dụng

Base URL: `https://platform.nguyenphuquyet.online/v1` (OpenAI-compatible) hoặc `https://platform.nguyenphuquyet.online/anthropic` (Anthropic-compatible).

```sh
curl https://platform.nguyenphuquyet.online/v1/chat/completions \
  -H "Authorization: Bearer $FJ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-flash",
    "messages": [{ "role": "user", "content": "Xin chào" }],
    "stream": true
  }'
```

```python
from openai import OpenAI

client = OpenAI(api_key="fjk_sk_...", base_url="https://platform.nguyenphuquyet.online/v1")
print(client.chat.completions.create(
    model="deepseek-flash",
    messages=[{"role": "user", "content": "Xin chào"}],
).choices[0].message.content)
```

Khoá được chấp nhận ở `Authorization: Bearer`, `x-api-key` hoặc `x-dsh-auth-token`.

### Mô hình

Danh mục nằm trong bảng `models` và được quản lý tại `/admin/models`. Lần chạy đầu tiên seed hai mô hình mặc định:

| ID | Tên | Ngữ cảnh | Vào / 1M | Ra / 1M |
| --- | --- | --- | --- | --- |
| `deepseek-flash` | DeepSeek V4.1 Flash | 1M token | $0.14 | $0.56 |
| `deepseek-v4-pro` | DeepSeek V4 Pro | 1M token | $0.55 | $2.20 |

Mỗi mô hình trỏ tới một nhà cung cấp trong bảng `providers` (`chat_base_url`, `anthropic_base_url`, `api_key`). Nhà cung cấp bị tắt hoặc thiếu khoá sẽ trả `503` cho các mô hình dùng nó; mô hình không có nhà cung cấp quay về `DEEPSEEK_*`. Khoá nhà cung cấp chỉ được ghi, không bao giờ trả lại qua API — giao diện chỉ thấy bốn ký tự cuối.

Để trống `anthropic_base_url` là chế độ mặc định: cổng `/anthropic/v1/messages` dịch yêu cầu sang `/chat/completions` của `chat_base_url`, gồm system prompt, ảnh, `tool_use`/`tool_result`, `stop_sequences` và cả luồng SSE. Chỉ điền `anthropic_base_url` khi nhà cung cấp có sẵn giao thức Anthropic; khi đó cổng chuyển tiếp nguyên vẹn.

Id mô hình nhận cả dạng có namespace như `deepseek/deepseek-v4.1-flash-free`; đặt id nhà cung cấp riêng ở trường **Id phía nhà cung cấp** khi hai bên khác nhau.

### Suy luận

Mỗi mô hình có ba cột chính sách: `reasoning_enabled`, `reasoning_levels` (JSON các cặp `id`/`apiValue`) và `reasoning_default` (id của mức mặc định). Trang `/admin/models` sửa chúng bằng công tắc **Bật suy luận**, danh sách **Các mức suy luận cho phép** (mỗi dòng một mã và giá trị API, thêm/bớt tuỳ ý) và **Mức mặc định**.

Mức `off` luôn có trong danh sách và tắt suy luận, nên `apiValue` của nó để trống. Các mức còn lại gửi đúng `apiValue` cho nhà cung cấp, ví dụ `low`, `medium`, `high`, `max` hoặc `minimal` tuỳ nhà cung cấp.

Cổng mô hình áp chính sách trước khi gọi nhà cung cấp:

- Mô hình tắt suy luận luôn chạy `off`, kể cả khi client gửi mức khác.
- Client luôn được phép tắt suy luận; mã mức không nằm trong danh sách cho phép bị đưa về mức mặc định.
- Thiếu mức trong yêu cầu thì dùng mức mặc định.

Định dạng trên đường truyền:

| Giao thức | Trường gửi đi |
| --- | --- |
| Anthropic (`/anthropic/messages`) | `thinking: { type: 'disabled' \| 'enabled' }` và `output_config: { effort: <apiValue> }` (bỏ `output_config` khi tắt suy luận). |
| Anthropic dịch sang OpenAI (nhà cung cấp chỉ có `chat_base_url`) | `reasoning_effort: <apiValue>`; bỏ trường khi tắt suy luận. |
| OpenAI (`/v1/chat/completions`) | `reasoning_effort: <apiValue>`; bỏ trường khi tắt suy luận. |

Nhà cung cấp không nhận `reasoning_effort` thì tắt suy luận cho mô hình đó trong `/admin/models`.

### Đo lường và số dư

- Mỗi yêu cầu hoàn tất ghi một dòng `usage_events` với model, token vào/ra và chi phí.
- Ví thưởng bị trừ trước, sau đó tới số dư đã nạp; số dư không bao giờ âm.
- Tổng số dư bằng 0 thì yêu cầu mới trả `402 insufficient_quota`.
- Với phản hồi stream, chi phí được ghi khi luồng kết thúc và nhà cung cấp có gửi frame usage.

### Mã lỗi

| HTTP | `error.code` | Nguyên nhân |
| --- | --- | --- |
| 400 | `invalid_request` | Body không khớp schema. |
| 401 | `invalid_api_key` | Thiếu khoá, khoá bị thu hồi, token hết hiệu lực. |
| 402 | `insufficient_quota` | Số dư bằng 0. |
| 404 | `model_not_found` | Platform không phục vụ model đó. |
| 502 | `upstream_unreachable` | Không gọi được nhà cung cấp. |
| 503 | `upstream_not_configured` | Máy chủ thiếu `DEEPSEEK_API_KEY`. |

## Bảng quản trị

Tài khoản có `role = 'admin'` mở được `/admin`. Trang tổng quan tổng hợp số tài khoản, thiết bị Desktop, yêu cầu 24 giờ và chi phí 30 ngày.

| Trang | Chức năng |
| --- | --- |
| `/admin/models` | Thêm, sửa, tắt, xoá mô hình; giá, ngữ cảnh, năng lực, nhãn, ánh xạ nhà cung cấp và chính sách suy luận. |
| `/admin/providers` | URL OpenAI/Anthropic, khoá API ghi-một-chiều và kiểm tra kết nối. |
| `/admin/users` | Vai trò, khoá đăng nhập, cấp số dư và mức sử dụng từng tài khoản. Không thể tự hạ quyền hoặc tự khoá. |
| `/admin/usage` | Chi phí, token và phân bổ theo mô hình, tài khoản trong 7–90 ngày. |
| `/admin/notifications` | Soạn thông báo song ngữ, gửi cho tất cả hoặc một tài khoản. |
| `/admin/audit` | Nhật ký mọi thay đổi quản trị. |
| `/admin/downloads` | Phiên bản, trang phát hành và URL cài cho từng nền tảng. |

Mọi thay đổi ghi vào `admin_audit`. API quản trị trả `401` khi chưa đăng nhập và `403` khi tài khoản không phải admin.

## Cấu trúc

```
platform/
  db/schema.sql              Bảng MySQL và chỉ mục
  scripts/db-init.mjs        Tạo database + tài khoản chủ sở hữu
  src/app/                   Route (App Router)
    app/                     Bảng điều khiển sau đăng nhập
    admin/                   Bảng quản trị (mô hình, nhà cung cấp, người dùng…)
    api/admin/               API thay đổi dữ liệu quản trị
    auth-api/v0/dsh/         Giao thức PKCE của Desktop
    api/v0/users/            Hồ sơ, ví, thông báo cho Desktop
    api/v1/                  Cổng OpenAI-compatible
    anthropic/[...path]/     Cổng Anthropic-compatible
    models/                  Danh mục mô hình cho Desktop
    download/                Trang tải FuJue Harness
    dsh/                     Trang đồng ý và trang hoàn tất
  src/components/            Site công khai, bảng điều khiển và quản trị (Arco)
  src/lib/                   DB, phiên, token, mô hình, đo lường, upstream
```

Luồng chính:

1. `src/lib/authorization.ts` — vòng đời yêu cầu PKCE, allowlist redirect, đổi mã.
2. `src/lib/tokens.ts` — cấp/thu hồi token Desktop và khoá API (chỉ lưu băm).
3. `src/lib/principal.ts` — phân giải cookie phiên, token Desktop hoặc khoá API cho mọi request mô hình.
4. `src/lib/upstream.ts` — chuyển tiếp OpenAI/Anthropic, đọc usage, bắt frame SSE để tính phí.
5. `src/lib/anthropic-bridge.ts` — dịch Messages ↔ chat completions cho nhà cung cấp chỉ có endpoint OpenAI.
6. `src/lib/model-store.ts` — danh mục mô hình, nhà cung cấp, phân giải endpoint và kiểm tra kết nối.
7. `src/lib/downloads.ts` — cấu hình bộ cài hiển thị trên `/download`.
8. `src/lib/admin.ts` — tổng hợp số liệu, quản lý tài khoản, thông báo và nhật ký quản trị.

## Bảo mật

- Mật khẩu: scrypt, salt 16 byte, so sánh bằng `timingSafeEqual`.
- Phiên trình duyệt: token 256-bit, lưu băm trong `sessions`, cookie `HttpOnly`, `SameSite=Lax`, 30 ngày.
- Khoá API và token Desktop: chỉ lưu SHA-256; tiền tố hiển thị để nhận diện.
- PKCE: chỉ chấp nhận `S256`; mã uỷ quyền so khớp `redirect_uri` và hết hạn.
- Redirect: HTTPS cùng origin Platform hoặc trong `ALLOWED_REDIRECT_ORIGINS`; HTTP chỉ với loopback có cổng tường minh.

## Giới hạn đã biết

- **Chưa có cổng thanh toán.** Số dư được cấp qua seed, trang quản trị hoặc cập nhật trực tiếp trong database.
- **Đo lường stream phụ thuộc nhà cung cấp.** Nếu upstream không gửi frame `usage`, lượt stream không bị tính phí.
- **Chưa có hàng đợi/giới hạn theo phút.** Mọi yêu cầu hợp lệ đều được chuyển tiếp; thêm rate limit ở reverse proxy nếu cần.
- **Một cấp quản trị.** Chưa có phân quyền chi tiết theo từng khu vực của bảng quản trị.
- **Một tenant.** Chưa có tổ chức hay mời thành viên.
- **Cần HTTPS khi triển khai.** Cookie `Secure` chỉ bật khi `NODE_ENV=production`, và Desktop từ chối origin HTTP ngoài loopback.
