/** Admin console: platform totals, account administration, usage rollups, notices, and audit. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { apiError } from './http'
import { newId } from './ids'
import { loadAllModels } from './model-store'
import { sessionUser } from './session'
import type { PlatformUser } from './users'

/**
 * Resolve the signed-in administrator.
 *
 * @returns the account when it carries the admin role, otherwise null.
 */
export async function currentAdmin(): Promise<PlatformUser | null> {
  const user = await sessionUser()
  return user !== null && user.role === 'admin' ? user : null
}

/** Result of admitting one admin API request. */
export type AdminGuard =
  | { readonly ok: true; readonly admin: PlatformUser }
  | { readonly ok: false; readonly response: Response }

/**
 * Admit only a signed-in administrator, with a ready failure response otherwise.
 *
 * @returns the administrator, or the 401/403 response to return unchanged.
 */
export async function adminGuard(): Promise<AdminGuard> {
  const user = await sessionUser()
  if (user === null) return { ok: false, response: apiError(401, 'unauthorized', 'Bạn cần đăng nhập.') }
  if (user.role !== 'admin') return { ok: false, response: apiError(403, 'forbidden', 'Bạn không có quyền quản trị.') }
  return { ok: true, admin: user }
}

/** Headline numbers for the admin overview. */
export interface AdminTotals {
  readonly users: number
  readonly activeUsers: number
  readonly signups7d: number
  readonly desktopDevices: number
  readonly apiKeys: number
  readonly requests24h: number
  readonly tokens24h: number
  readonly cost24h: number
  readonly cost30d: number
  readonly models: number
  readonly providers: number
}

interface TotalsRow extends RowDataPacket {
  users: number | string
  active_users: number | string
  signups_7d: number | string
  desktop_devices: number | string
  api_keys: number | string
  models: number | string
  providers: number | string
}

interface UsageTotalsRow extends RowDataPacket {
  requests: number | string
  tokens: number | string
  cost_usd: number | string
}

/**
 * Read the overview counters.
 *
 * @returns platform totals across accounts, devices, models, and the last 30 days.
 */
export async function adminTotals(): Promise<AdminTotals> {
  const [totals] = await rows<TotalsRow>(
    `SELECT
       (SELECT COUNT(*) FROM users) AS users,
       (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
       (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(3), INTERVAL 7 DAY)) AS signups_7d,
       (SELECT COUNT(*) FROM account_tokens WHERE revoked_at IS NULL) AS desktop_devices,
       (SELECT COUNT(*) FROM api_keys WHERE revoked_at IS NULL) AS api_keys,
       (SELECT COUNT(*) FROM models) AS models,
       (SELECT COUNT(*) FROM providers) AS providers`,
  )
  const [day] = await rows<UsageTotalsRow>(
    `SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM usage_events WHERE created_at >= DATE_SUB(NOW(3), INTERVAL 1 DAY)`,
  )
  const [month] = await rows<UsageTotalsRow>(
    `SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM usage_events WHERE created_at >= DATE_SUB(NOW(3), INTERVAL 30 DAY)`,
  )
  return {
    users: Number(totals?.users ?? 0),
    activeUsers: Number(totals?.active_users ?? 0),
    signups7d: Number(totals?.signups_7d ?? 0),
    desktopDevices: Number(totals?.desktop_devices ?? 0),
    apiKeys: Number(totals?.api_keys ?? 0),
    requests24h: Number(day?.requests ?? 0),
    tokens24h: Number(day?.tokens ?? 0),
    cost24h: Number(day?.cost_usd ?? 0),
    cost30d: Number(month?.cost_usd ?? 0),
    models: Number(totals?.models ?? 0),
    providers: Number(totals?.providers ?? 0),
  }
}

/** One account row in the admin user table. */
export interface AdminUserRow {
  readonly id: string
  readonly email: string
  readonly name: string
  readonly role: 'user' | 'admin'
  readonly status: 'active' | 'suspended'
  readonly balanceUsd: string
  readonly bonusUsd: string
  readonly createdAt: string
  readonly requests: number
  readonly tokens: number
  readonly costUsd: number
  readonly devices: number
  readonly keys: number
}

interface AdminUserDbRow extends RowDataPacket {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  balance_usd: string
  bonus_usd: string
  created_at: Date
  requests: number | string
  tokens: number | string
  cost_usd: number | string
  devices: number | string
  key_count: number | string
}

/**
 * List accounts with their usage and connection counters.
 *
 * @param search - optional email or name fragment.
 * @returns account rows, newest first.
 */
export async function listAdminUsers(search = ''): Promise<AdminUserRow[]> {
  const term = `%${search.trim()}%`
  const result = await rows<AdminUserDbRow>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.balance_usd, u.bonus_usd, u.created_at,
            COALESCE(s.requests, 0) AS requests, COALESCE(s.tokens, 0) AS tokens, COALESCE(s.cost_usd, 0) AS cost_usd,
            (SELECT COUNT(*) FROM account_tokens t WHERE t.user_id = u.id AND t.revoked_at IS NULL) AS devices,
            (SELECT COUNT(*) FROM api_keys k WHERE k.user_id = u.id AND k.revoked_at IS NULL) AS key_count
     FROM users u
     LEFT JOIN (
       SELECT user_id, COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
       FROM usage_events GROUP BY user_id
     ) s ON s.user_id = u.id
     WHERE (? = '%%' OR u.email LIKE ? OR u.name LIKE ?)
     ORDER BY u.created_at DESC`,
    [term, term, term],
  )
  return result.map(row => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    balanceUsd: row.balance_usd,
    bonusUsd: row.bonus_usd,
    createdAt: row.created_at.toISOString(),
    requests: Number(row.requests),
    tokens: Number(row.tokens),
    costUsd: Number(row.cost_usd),
    devices: Number(row.devices),
    keys: Number(row.key_count),
  }))
}

/** Account fields an administrator may change. */
export interface AdminUserPatch {
  readonly role?: 'user' | 'admin'
  readonly status?: 'active' | 'suspended'
  /** Absolute recharge balance in USD. */
  readonly balanceUsd?: number
  /** Absolute bonus balance in USD. */
  readonly bonusUsd?: number
  /** Credit added to the recharge balance, applied before an absolute balance. */
  readonly grantUsd?: number
}

/**
 * Update an account from the admin console.
 *
 * @param id - account UUID.
 * @param patch - validated fields to change.
 * @returns whether a row matched.
 */
export async function updateAdminUser(id: string, patch: AdminUserPatch): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.role !== undefined) {
    sets.push('role = ?')
    params.push(patch.role)
  }
  if (patch.status !== undefined) {
    sets.push('status = ?')
    params.push(patch.status)
  }
  if (patch.grantUsd !== undefined && patch.grantUsd > 0) {
    sets.push('balance_usd = balance_usd + ?')
    params.push(patch.grantUsd.toFixed(6))
  }
  if (patch.balanceUsd !== undefined) {
    sets.push('balance_usd = ?')
    params.push(Math.max(0, patch.balanceUsd).toFixed(6))
  }
  if (patch.bonusUsd !== undefined) {
    sets.push('bonus_usd = ?')
    params.push(Math.max(0, patch.bonusUsd).toFixed(6))
  }
  if (sets.length === 0) return false
  params.push(id)
  const result = await write(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
  return result.affectedRows > 0
}

/** One day of platform usage. */
export interface AdminDayBucket {
  readonly date: string
  readonly requests: number
  readonly tokens: number
  readonly costUsd: number
}

/** Usage rolled up along a dimension. */
export interface AdminUsageGroup {
  readonly key: string
  readonly label: string
  readonly requests: number
  readonly tokens: number
  readonly costUsd: number
}

/** Platform-wide usage rendered by the admin usage page. */
export interface AdminUsage {
  readonly days: number
  readonly totals: { readonly requests: number; readonly tokens: number; readonly costUsd: number }
  readonly daily: readonly AdminDayBucket[]
  readonly byModel: readonly AdminUsageGroup[]
  readonly byUser: readonly AdminUsageGroup[]
}

interface GroupRow extends RowDataPacket {
  key: string
  label: string | null
  requests: number | string
  tokens: number | string
  cost_sum: number | string
}

interface DayRow extends RowDataPacket {
  day: string
  requests: number | string
  tokens: number | string
  cost_sum: number | string
}

/**
 * Aggregate platform usage over a window.
 *
 * @param days - window length in days, clamped to 1–365.
 * @returns totals, a zero-filled daily series, and model and account rollups.
 */
export async function adminUsage(days = 14): Promise<AdminUsage> {
  const window = Math.min(365, Math.max(1, Math.trunc(days)))
  const since = `DATE_SUB(NOW(3), INTERVAL ${window} DAY)`
  const models = await loadAllModels()
  const names = new Map(models.map(model => [model.id, model.name]))

  const [totals] = await rows<UsageTotalsRow>(
    `SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM usage_events WHERE created_at >= ${since}`,
  )
  const dayRows = await rows<DayRow>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS requests,
            COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_sum
     FROM usage_events WHERE created_at >= ${since}
     GROUP BY day ORDER BY day`,
  )
  const modelRows = await rows<GroupRow>(
    `SELECT model AS \`key\`, COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens,
            COALESCE(SUM(cost_usd), 0) AS cost_sum
     FROM usage_events WHERE created_at >= ${since}
     GROUP BY model ORDER BY cost_sum DESC`,
  )
  const userRows = await rows<GroupRow>(
    `SELECT e.user_id AS \`key\`, u.email AS label, COUNT(*) AS requests,
            COALESCE(SUM(e.total_tokens), 0) AS tokens, COALESCE(SUM(e.cost_usd), 0) AS cost_sum
     FROM usage_events e LEFT JOIN users u ON u.id = e.user_id
     WHERE e.created_at >= ${since}
     GROUP BY e.user_id, u.email ORDER BY cost_sum DESC LIMIT 20`,
  )

  const byDay = new Map(dayRows.map(row => [row.day, row]))
  const daily: AdminDayBucket[] = []
  for (let offset = window - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)
    const row = byDay.get(date)
    daily.push({
      date,
      requests: Number(row?.requests ?? 0),
      tokens: Number(row?.tokens ?? 0),
      costUsd: Number(row?.cost_sum ?? 0),
    })
  }

  return {
    days: window,
    totals: {
      requests: Number(totals?.requests ?? 0),
      tokens: Number(totals?.tokens ?? 0),
      costUsd: Number(totals?.cost_usd ?? 0),
    },
    daily,
    byModel: modelRows.map(row => ({
      key: row.key,
      label: names.get(row.key) ?? row.key,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      costUsd: Number(row.cost_sum),
    })),
    byUser: userRows.map(row => ({
      key: row.key,
      label: row.label ?? row.key,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      costUsd: Number(row.cost_sum),
    })),
  }
}

/** One recorded administrator action. */
export interface AuditEntry {
  readonly id: string
  readonly actorEmail: string
  readonly action: string
  readonly subject: string
  readonly detail: string
  readonly createdAt: string
}

interface AuditRow extends RowDataPacket {
  id: number | string
  actor_email: string
  action: string
  subject: string
  detail: string
  created_at: Date
}

/**
 * Append an administrator action to the audit trail.
 *
 * @param actor - signed-in administrator.
 * @param action - stable verb such as `model.update`.
 * @param subject - affected model id, account email, or notice id.
 * @param detail - short human-readable summary; never a secret.
 */
export async function recordAdminAction(
  actor: PlatformUser,
  action: string,
  subject: string,
  detail: string,
): Promise<void> {
  await write(
    'INSERT INTO admin_audit (actor_id, actor_email, action, subject, detail) VALUES (?, ?, ?, ?, ?)',
    [actor.id, actor.email, action, subject.slice(0, 255), detail.slice(0, 512)],
  )
}

/**
 * Read the newest audit entries.
 *
 * @param limit - maximum rows to return.
 * @returns entries newest first.
 */
export async function listAudit(limit = 50): Promise<AuditEntry[]> {
  const result = await rows<AuditRow>(
    'SELECT id, actor_email, action, subject, detail, created_at FROM admin_audit ORDER BY id DESC LIMIT ?',
    [Math.min(200, Math.max(1, Math.trunc(limit)))],
  )
  return result.map(row => ({
    id: String(row.id),
    actorEmail: row.actor_email,
    action: row.action,
    subject: row.subject,
    detail: row.detail,
    createdAt: row.created_at.toISOString(),
  }))
}

/** One notice row in the admin console. */
export interface AdminNotification {
  readonly id: string
  readonly titleVi: string
  readonly titleEn: string
  readonly bodyVi: string
  readonly bodyEn: string
  readonly actionLabelVi: string
  readonly actionLabelEn: string
  readonly actionStyle: 'primary' | 'secondary'
  readonly audience: 'all' | 'user'
  readonly userEmail: string | null
  readonly href: string | null
  readonly publishedAt: string
  readonly displayUntil: string | null
  readonly consumed: number
}

interface NotificationDbRow extends RowDataPacket {
  id: string
  title_vi: string
  title_en: string
  body_vi: string
  body_en: string
  action_label_vi: string
  action_label_en: string
  action_style: 'primary' | 'secondary'
  audience: 'all' | 'user'
  user_email: string | null
  data_json: unknown
  published_at: Date
  display_until: Date | null
  consumed: number | string
}

function hrefOf(value: unknown): string | null {
  const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value
  if (typeof parsed !== 'object' || parsed === null) return null
  const href = (parsed as { href?: unknown }).href
  return typeof href === 'string' && href !== '' ? href : null
}

/**
 * List notices with their audience and delivery counters.
 *
 * @param limit - maximum rows to return.
 * @returns notices newest first.
 */
export async function listAdminNotifications(limit = 50): Promise<AdminNotification[]> {
  const result = await rows<NotificationDbRow>(
    `SELECT n.id, n.title_vi, n.title_en, n.body_vi, n.body_en,
            n.action_label_vi, n.action_label_en, n.action_style, n.audience,
            u.email AS user_email, n.data_json, n.published_at, n.display_until,
            (SELECT COUNT(*) FROM notification_receipts r
             WHERE r.notification_id = n.id AND r.consumed_at IS NOT NULL) AS consumed
     FROM notifications n LEFT JOIN users u ON u.id = n.user_id
     ORDER BY n.published_at DESC LIMIT ?`,
    [Math.min(200, Math.max(1, Math.trunc(limit)))],
  )
  return result.map(row => ({
    id: row.id,
    titleVi: row.title_vi,
    titleEn: row.title_en,
    bodyVi: row.body_vi,
    bodyEn: row.body_en,
    actionLabelVi: row.action_label_vi,
    actionLabelEn: row.action_label_en,
    actionStyle: row.action_style,
    audience: row.audience,
    userEmail: row.user_email,
    href: hrefOf(row.data_json),
    publishedAt: row.published_at.toISOString(),
    displayUntil: row.display_until === null ? null : row.display_until.toISOString(),
    consumed: Number(row.consumed),
  }))
}

/** Notice fields the admin console submits. */
export interface AdminNotificationInput {
  readonly titleVi: string
  readonly titleEn: string
  readonly bodyVi: string
  readonly bodyEn: string
  readonly actionLabelVi: string
  readonly actionLabelEn: string
  readonly actionStyle: 'primary' | 'secondary'
  readonly audience: 'all' | 'user'
  readonly userId: string | null
  readonly href: string | null
}

/**
 * Publish a notice to the desktop notification channel.
 *
 * @param input - validated bilingual copy and audience.
 * @returns the generated notice id.
 */
export async function createAdminNotification(input: AdminNotificationInput): Promise<string> {
  const id = newId()
  await write(
    `INSERT INTO notifications
       (id, title_vi, title_en, body_vi, body_en, action_label_vi, action_label_en, action_style, audience, user_id, data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.titleVi,
      input.titleEn,
      input.bodyVi,
      input.bodyEn,
      input.actionLabelVi,
      input.actionLabelEn,
      input.actionStyle,
      input.audience,
      input.audience === 'user' ? input.userId : null,
      input.href === null ? null : JSON.stringify({ href: input.href }),
    ],
  )
  return id
}

/**
 * Delete a notice and its receipts.
 *
 * @param id - notice UUID.
 * @returns whether a row was removed.
 */
export async function deleteAdminNotification(id: string): Promise<boolean> {
  const result = await write('DELETE FROM notifications WHERE id = ?', [id])
  return result.affectedRows > 0
}
