/** Usage metering and aggregate queries for the dashboard. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { loadServedModels } from './model-store'

/** One metered model request. */
export interface UsageInput {
  readonly userId: string
  readonly apiKeyId?: string | null
  readonly model: string
  readonly promptTokens: number
  readonly completionTokens: number
  readonly source: 'playground' | 'api' | 'desktop'
  /** Metered cost, estimated by the caller from the catalog row. */
  readonly costUsd: number
}

/**
 * Record one metered request.
 *
 * @param input - account, model, token counts, cost, and origin of the request.
 */
export async function recordUsage(input: UsageInput): Promise<void> {
  const promptTokens = Math.max(0, Math.trunc(input.promptTokens))
  const completionTokens = Math.max(0, Math.trunc(input.completionTokens))
  const cost = Number.isFinite(input.costUsd) ? Math.max(0, input.costUsd) : 0
  await write(
    `INSERT INTO usage_events
       (user_id, api_key_id, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      input.apiKeyId ?? null,
      input.model,
      promptTokens,
      completionTokens,
      promptTokens + completionTokens,
      cost.toFixed(8),
      input.source,
    ],
  )
}

/**
 * Charge a completed request against the account wallets.
 *
 * The bonus wallet is spent first, then the recharge balance; balances never
 * go below zero, so a concurrent overspend cannot create a negative wallet.
 *
 * @param userId - account UUID.
 * @param costUsd - metered cost.
 */
export async function debitUser(userId: string, costUsd: number): Promise<void> {
  if (!Number.isFinite(costUsd) || costUsd <= 0) return
  const amount = costUsd.toFixed(8)
  await write(
    // MySQL evaluates single-table assignments left to right, so the recharge
    // balance must read the bonus balance before that column shrinks.
    `UPDATE users
     SET balance_usd = GREATEST(0, balance_usd - GREATEST(0, ? - bonus_usd)),
         bonus_usd = GREATEST(0, bonus_usd - ?)
     WHERE id = ?`,
    [amount, amount, userId],
  )
}

/** Requests, tokens, and cost for one calendar day. */
export interface UsageBucket {
  readonly date: string
  readonly requests: number
  readonly tokens: number
  readonly costUsd: number
}

/** Cost rolled up along one dimension. */
export interface UsageGroup {
  readonly label: string
  readonly key: string
  readonly requests: number
  readonly tokens: number
  readonly costUsd: number
}

/** Recent request row for the activity table. */
export interface UsageEntry {
  readonly id: string
  readonly model: string
  readonly modelName: string
  readonly tokens: number
  readonly costUsd: number
  readonly source: 'playground' | 'api' | 'desktop'
  readonly createdAt: string
}

/** Aggregates rendered by the usage dashboard. */
export interface UsageSummary {
  readonly days: number
  readonly totals: { readonly requests: number; readonly tokens: number; readonly costUsd: number }
  readonly daily: readonly UsageBucket[]
  readonly byModel: readonly UsageGroup[]
  readonly byKey: readonly UsageGroup[]
  readonly recent: readonly UsageEntry[]
}

interface TotalRow extends RowDataPacket {
  requests: number | string
  tokens: number | string
  cost_usd: number | string
}

interface DayRow extends RowDataPacket {
  day: string
  requests: number | string
  tokens: number | string
  cost_sum: number | string
}

interface ModelRow extends RowDataPacket {
  model: string
  requests: number | string
  tokens: number | string
  cost_sum: number | string
}

interface KeyRow extends RowDataPacket {
  key_id: string | null
  key_name: string | null
  key_prefix: string | null
  requests: number | string
  tokens: number | string
  cost_sum: number | string
}

interface RecentRow extends RowDataPacket {
  id: number | string
  model: string
  total_tokens: number | string
  cost_usd: number | string
  source: 'playground' | 'api' | 'desktop'
  created_at: Date
}

/**
 * Aggregate one account's usage for the last N days.
 *
 * @param userId - account UUID.
 * @param days - window length in days, clamped to 1–365.
 * @returns totals, a zero-filled daily series, model and key rollups, and recent requests.
 */
export async function usageSummary(userId: string, days = 30): Promise<UsageSummary> {
  const window = Math.min(365, Math.max(1, Math.trunc(days)))
  const since = `DATE_SUB(NOW(3), INTERVAL ${window} DAY)`
  const models = await loadServedModels()
  const names = new Map(models.map(model => [model.id, model.name]))

  const [totalRow] = await rows<TotalRow>(
    `SELECT COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_usd
     FROM usage_events WHERE user_id = ? AND created_at >= ${since}`,
    [userId],
  )
  const dayRows = await rows<DayRow>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day, COUNT(*) AS requests,
            COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_sum
     FROM usage_events WHERE user_id = ? AND created_at >= ${since}
     GROUP BY day ORDER BY day`,
    [userId],
  )
  const modelRows = await rows<ModelRow>(
    `SELECT model, COUNT(*) AS requests, COALESCE(SUM(total_tokens), 0) AS tokens, COALESCE(SUM(cost_usd), 0) AS cost_sum
     FROM usage_events WHERE user_id = ? AND created_at >= ${since}
     GROUP BY model ORDER BY cost_sum DESC`,
    [userId],
  )
  const keyRows = await rows<KeyRow>(
    `SELECT e.api_key_id AS key_id, k.name AS key_name, k.prefix AS key_prefix,
            COUNT(*) AS requests, COALESCE(SUM(e.total_tokens), 0) AS tokens, COALESCE(SUM(e.cost_usd), 0) AS cost_sum
     FROM usage_events e LEFT JOIN api_keys k ON k.id = e.api_key_id
     WHERE e.user_id = ? AND e.created_at >= ${since}
     GROUP BY e.api_key_id, k.name, k.prefix ORDER BY cost_sum DESC`,
    [userId],
  )
  const recentRows = await rows<RecentRow>(
    `SELECT id, model, total_tokens, cost_usd, source, created_at
     FROM usage_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
    [userId],
  )

  const byDay = new Map(dayRows.map(row => [row.day, row]))
  const daily: UsageBucket[] = []
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
      requests: Number(totalRow?.requests ?? 0),
      tokens: Number(totalRow?.tokens ?? 0),
      costUsd: Number(totalRow?.cost_usd ?? 0),
    },
    daily,
    byModel: modelRows.map(row => ({
      key: row.model,
      label: names.get(row.model) ?? row.model,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      costUsd: Number(row.cost_sum),
    })),
    byKey: keyRows.map(row => ({
      key: row.key_id ?? 'playground',
      label:
        row.key_id === null
          ? 'Playground & Desktop'
          : `${row.key_name ?? 'Khoá đã xoá'} (${row.key_prefix ?? '—'}…)`,
      requests: Number(row.requests),
      tokens: Number(row.tokens),
      costUsd: Number(row.cost_sum),
    })),
    recent: recentRows.map(row => ({
      id: String(row.id),
      model: row.model,
      modelName: names.get(row.model) ?? row.model,
      tokens: Number(row.total_tokens),
      costUsd: Number(row.cost_usd),
      source: row.source,
      createdAt: row.created_at.toISOString(),
    })),
  }
}
