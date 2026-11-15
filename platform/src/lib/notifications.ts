/** Account notifications served to the desktop app. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { isoUtc } from './time'

interface NotificationRow extends RowDataPacket {
  id: string
  title_vi: string
  title_en: string
  body_vi: string
  body_en: string
  action_label_vi: string
  action_label_en: string
  action_style: 'primary' | 'secondary'
  audience: 'all' | 'user'
  user_id: string | null
  data_json: unknown
  published_at: Date
  display_until: Date | null
}

/** Notification event the desktop app reports. */
export type NotificationEvent = 'displayed' | 'cta_clicked' | 'dismissed'

interface NotificationIdRow extends RowDataPacket {
  id: string
}

/** One localized card payload in the protocol's snake_case form. */
export interface NotificationPayload {
  readonly id: string
  readonly created_at: string
  readonly display_until: string | null
  readonly title: string
  readonly body: string
  readonly actions: readonly unknown[]
  readonly data?: unknown
}

function localized(locale: string): 'vi' | 'en' {
  return locale.toLowerCase().startsWith('vi') ? 'vi' : 'en'
}

function payload(row: NotificationRow, locale: string): NotificationPayload {
  const language = localized(locale)
  const title = language === 'vi' ? row.title_vi : row.title_en
  const body = language === 'vi' ? row.body_vi : row.body_en
  const actionLabel = language === 'vi' ? row.action_label_vi : row.action_label_en
  const data = typeof row.data_json === 'string' ? (JSON.parse(row.data_json) as unknown) : row.data_json
  const created = isoUtc(row.published_at)
  return {
    id: row.id,
    created_at: created ?? new Date().toISOString().replace(/Z$/, '+00:00'),
    display_until: isoUtc(row.display_until),
    title,
    body,
    actions: [
      { label: actionLabel, style: row.action_style, target: { type: 'app_route', name: 'account' } },
      { label: language === 'vi' ? 'Để sau' : 'Later', style: 'secondary', target: { type: 'dismiss' } },
    ],
    ...(data === null || data === undefined ? {} : { data }),
  }
}

/**
 * List notifications the account has not consumed.
 *
 * @param userId - account UUID.
 * @param locale - preferred copy language; anything but `vi*` renders English.
 * @returns server-ordered cards.
 */
export async function listNotifications(userId: string, locale: string): Promise<NotificationPayload[]> {
  const result = await rows<NotificationRow>(
    `SELECT n.* FROM notifications n
     LEFT JOIN notification_receipts r ON r.notification_id = n.id AND r.user_id = ?
     WHERE (n.audience = 'all' OR n.user_id = ?)
       AND r.consumed_at IS NULL
       AND n.published_at <= NOW(3)
       AND (n.display_until IS NULL OR n.display_until > NOW(3))
     ORDER BY n.published_at ASC`,
    [userId, userId],
  )
  return result.map(row => payload(row, locale))
}

/**
 * Read one notification, including a consumed one.
 *
 * @param userId - account UUID.
 * @param id - notification UUID.
 * @param locale - preferred copy language.
 * @returns the card, or null when the account may not see it.
 */
export async function notificationById(userId: string, id: string, locale: string): Promise<NotificationPayload | null> {
  const [row] = await rows<NotificationRow>(
    `SELECT * FROM notifications
     WHERE id = ? AND (audience = 'all' OR user_id = ?)
     LIMIT 1`,
    [id, userId],
  )
  return row === undefined ? null : payload(row, locale)
}

/**
 * Record a displayed, clicked, or dismissed notification.
 *
 * @param userId - account UUID.
 * @param id - notification UUID visible to the account.
 * @param event - interaction the desktop app reported.
 * @returns whether the notification was accepted.
 */
export async function recordNotificationEvent(userId: string, id: string, event: NotificationEvent): Promise<boolean> {
  const [row] = await rows<NotificationIdRow>(
    `SELECT id FROM notifications WHERE id = ? AND (audience = 'all' OR user_id = ?) LIMIT 1`,
    [id, userId],
  )
  if (row === undefined) return false
  const consumed = event === 'displayed' ? null : new Date()
  await write(
    `INSERT INTO notification_receipts (notification_id, user_id, displayed_at, consumed_at)
     VALUES (?, ?, NOW(3), ?)
     ON DUPLICATE KEY UPDATE
       displayed_at = COALESCE(displayed_at, VALUES(displayed_at)),
       consumed_at = COALESCE(consumed_at, VALUES(consumed_at))`,
    [id, userId, consumed],
  )
  return true
}

/**
 * Derive the copy language from a request's `Accept-Language`.
 *
 * @param request - incoming desktop request.
 * @param fallback - account locale used when the header is absent.
 * @returns `vi` or `en`.
 */
export function requestLocale(request: Request, fallback: string): 'vi' | 'en' {
  const header = request.headers.get('accept-language')?.trim()
  if (header === undefined || header === '') return localized(fallback)
  const preferred = header.split(',')[0]?.trim().toLowerCase() ?? ''
  // `*` and empty tags express no preference, so the account language decides.
  if (preferred === '' || preferred === '*') return localized(fallback)
  return localized(preferred)
}
