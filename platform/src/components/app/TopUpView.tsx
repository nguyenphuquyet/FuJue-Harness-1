'use client'

import { Alert, Button, Divider, Message, Tag } from '@arco-design/web-react'
import { IconCopy, IconSafe, IconStorage, IconThunderbolt } from '@arco-design/web-react/icon'
import type { TopUpInfo } from '@/lib/env'
import { formatUsd } from '@/lib/format'

/** Suggested recharge amounts, in USD. */
const PACKAGES = [5, 10, 20, 50]

/** Wallet balances the page renders, as stored decimal strings. */
export interface TopUpWallet {
  readonly balanceUsd: string
  readonly bonusUsd: string
}

/**
 * Manual recharge page: current balance, suggested amounts, and bank details.
 *
 * @param props - wallet balances, the signed-in address used as the transfer memo, and the destination.
 * @returns the recharge content.
 */
export function TopUpView({
  wallet,
  email,
  info,
}: {
  readonly wallet: TopUpWallet
  readonly email: string
  readonly info: TopUpInfo
}) {
  const total = Number(wallet.balanceUsd) + Number(wallet.bonusUsd)
  const memo = `FJ ${email}`
  const configured = info.bank !== null && info.accountNumber !== null

  const copy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      Message.success(`Đã sao chép ${label}`)
    } catch {
      Message.error('Trình duyệt không cho phép sao chép tự động. Hãy chọn và sao chép thủ công.')
    }
  }

  const rows: readonly { label: string; value: string }[] = [
    ...(info.bank === null ? [] : [{ label: 'Ngân hàng', value: info.bank }]),
    ...(info.accountNumber === null ? [] : [{ label: 'Số tài khoản', value: info.accountNumber }]),
    ...(info.accountHolder === null ? [] : [{ label: 'Chủ tài khoản', value: info.accountHolder }]),
    { label: 'Nội dung chuyển khoản', value: memo },
  ]

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Nạp tiền</h1>
          <p>Số dư dùng chung cho Playground, khoá API và FuJue Harness Desktop.</p>
        </div>
        <Tag color="arcoblue">Chuyển khoản ngân hàng</Tag>
      </div>

      <div className="fj-stats fj-stats--3">
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconThunderbolt /> Số dư khả dụng
          </div>
          <div className="fj-stat-value">{formatUsd(total)}</div>
          <div className="fj-stat-foot">Tín dụng thưởng tiêu trước</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconStorage /> Số dư đã nạp
          </div>
          <div className="fj-stat-value">{formatUsd(Number(wallet.balanceUsd))}</div>
          <div className="fj-stat-foot">Cộng từ các lần chuyển khoản</div>
        </div>
        <div className="fj-stat">
          <div className="fj-stat-label">
            <IconSafe /> Tín dụng thưởng
          </div>
          <div className="fj-stat-value">{formatUsd(Number(wallet.bonusUsd))}</div>
          <div className="fj-stat-foot">Không quy đổi, không hoàn tiền</div>
        </div>
      </div>

      {info.note === null ? null : <Alert type="info" showIcon content={info.note} />}

      {configured ? (
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Thông tin chuyển khoản</h2>
              <p>Sao chép từng dòng hoặc dùng nút bên cạnh.</p>
            </div>
          </div>
          <div className="fj-copy-list">
            {rows.map(row => (
              <div className="fj-copy-row" key={row.label}>
                <div>
                  <div className="fj-copy-label">{row.label}</div>
                  <div className="fj-copy-value">{row.value}</div>
                </div>
                <Button size="small" onClick={() => void copy(row.value, row.label.toLowerCase())}>
                  <IconCopy /> Sao chép
                </Button>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '16px 0' }} />
          <div className="fj-panel-head" style={{ marginBottom: 10 }}>
            <div>
              <h2>Gói nạp đề xuất</h2>
              <p>Chuyển đúng số tiền, phần chênh lệch được giữ lại cho lần sau.</p>
            </div>
          </div>
          <div className="fj-package-grid">
            {PACKAGES.map(amount => (
              <div className="fj-package" key={amount}>
                <span className="fj-package-amount">{formatUsd(amount)}</span>
                <span className="fj-dim" style={{ fontSize: 12 }}>
                  Nội dung: {memo}
                </span>
                <Button size="small" onClick={() => void copy(memo, 'nội dung chuyển khoản')}>
                  Sao chép nội dung
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="fj-panel">
          <div className="fj-panel-head">
            <div>
              <h2>Thông tin chuyển khoản</h2>
              <p>Quản trị viên chưa cấu hình tài khoản nhận tiền cho bản triển khai này.</p>
            </div>
          </div>
          <Alert
            type="warning"
            showIcon
            content="Liên hệ quản trị viên để được cộng tín dụng vào tài khoản. Số dư sẽ xuất hiện ngay sau khi đối soát."
          />
        </section>
      )}

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Cách nạp</h2>
            <p>Ba bước, không cần thẻ quốc tế.</p>
          </div>
        </div>
        <div className="fj-steps">
          <div className="fj-step">
            <div className="fj-step-number">1</div>
            <div>
              <h4>Chuyển khoản</h4>
              <p>
                Chuyển đúng số tiền tới tài khoản ở trên, giữ nguyên nội dung <strong>{memo}</strong> để hệ thống đối
                soát đúng tài khoản.
              </p>
            </div>
          </div>
          <div className="fj-step">
            <div className="fj-step-number">2</div>
            <div>
              <h4>Gửi biên lai</h4>
              <p>Gửi ảnh chụp giao dịch cho quản trị viên kèm địa chỉ {email} nếu muốn cộng nhanh hơn.</p>
            </div>
          </div>
          <div className="fj-step">
            <div className="fj-step-number">3</div>
            <div>
              <h4>Nhận số dư</h4>
              <p>
                Quản trị viên cộng số dư sau khi đối soát. Playground, khoá API và Desktop dùng chung số dư này nên chỉ
                cần nạp một lần.
              </p>
            </div>
          </div>
        </div>
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 16 }}
          content={`Bản triển khai này chưa bật cổng thanh toán tự động. Số dư hiện tại: ${formatUsd(total)}.`}
        />
      </section>
    </>
  )
}
