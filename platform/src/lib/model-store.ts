/** Durable model catalog and third-party provider configuration. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'
import { anthropicBaseUrl, openAiBaseUrl, upstreamApiKey } from './env'
import {
  DEFAULT_MODELS, DEFAULT_REASONING_LEVELS, REASONING_OFF, type ModelBadge, type ModelReasoning, type PlatformModel,
  type ReasoningLevel,
} from './models'
import { UpstreamNotConfiguredError, type UpstreamEndpoint } from './upstream'

interface ModelRow extends RowDataPacket {
  id: string
  name: string
  tagline: string
  description: string
  context_window: number | string
  max_output_tokens: number | string
  input_modalities: string
  input_price_usd: string
  output_price_usd: string
  capabilities_json: unknown
  badge_text_vi: string | null
  badge_text_en: string | null
  badge_tone: ModelBadge['tone'] | null
  recommended: number | string
  enabled: number | string
  provider_id: string | null
  upstream_id: string | null
  reasoning_enabled: number | string
  reasoning_levels: string
  reasoning_default: string
  sort_order: number | string
}

interface ProviderRow extends RowDataPacket {
  id: string
  name: string
  chat_base_url: string | null
  anthropic_base_url: string | null
  api_key: string | null
  enabled: number | string
  note: string
}

interface CountRow extends RowDataPacket {
  total: number | string
}

interface ProviderIdRow extends RowDataPacket {
  id: string
}

/** A third-party model service as stored. */
export interface Provider {
  readonly id: string
  readonly name: string
  readonly chatBaseUrl: string | null
  readonly anthropicBaseUrl: string | null
  readonly apiKey: string | null
  readonly enabled: boolean
  readonly note: string
}

/** Provider fields exposed to the admin console; the credential stays write-only. */
export interface ProviderView {
  readonly id: string
  readonly name: string
  readonly chatBaseUrl: string | null
  readonly anthropicBaseUrl: string | null
  readonly enabled: boolean
  readonly note: string
  readonly apiKeySet: boolean
  /** Last four characters of the stored credential, for recognition only. */
  readonly apiKeyHint: string | null
  readonly modelCount: number
}

/** Fields accepted when creating or editing a provider. */
export interface ProviderInput {
  readonly name: string
  readonly chatBaseUrl: string
  readonly anthropicBaseUrl: string
  readonly apiKey?: string
  readonly clearApiKey?: boolean
  readonly enabled: boolean
  readonly note: string
}

/** Fields accepted when creating a model. */
export interface ModelInput {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly description: string
  readonly contextWindow: number
  readonly maxOutputTokens: number
  readonly inputModalities: readonly ('text' | 'image')[]
  readonly inputPriceUsd: number
  readonly outputPriceUsd: number
  readonly capabilities: readonly string[]
  readonly badgeTextVi: string | null
  readonly badgeTextEn: string | null
  readonly badgeTone: 'neutral' | 'info' | 'success' | 'warning' | null
  readonly recommended: boolean
  readonly enabled: boolean
  readonly providerId: string | null
  readonly upstreamId: string | null
  readonly reasoningEnabled: boolean
  readonly reasoningLevels: readonly ReasoningLevel[]
  readonly reasoningDefault: string
  readonly sortOrder: number
}

/** Model edits; omitted fields keep their stored value. */
export type ModelPatch = Partial<ModelInput>

const MODEL_COLUMNS = `id, name, tagline, description, context_window, max_output_tokens, input_modalities,
  input_price_usd, output_price_usd, capabilities_json, badge_text_vi, badge_text_en, badge_tone,
  recommended, enabled, provider_id, upstream_id, reasoning_enabled, reasoning_levels, reasoning_default, sort_order`

const PROVIDER_COLUMNS = 'id, name, chat_base_url, anthropic_base_url, api_key, enabled, note'

const DEFAULT_PROVIDER_ID = 'deepseek'

function capabilitiesOf(value: unknown): string[] {
  const parsed = typeof value === 'string' ? (JSON.parse(value) as unknown) : value
  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : []
}

/**
 * Parse the stored reasoning level rows.
 *
 * Unknown entries are dropped, duplicate ids keep their first row, and `off`
 * is always present so a client can always disable thinking.
 *
 * @param value - stored JSON array.
 * @returns level rows the admin console and gateway use.
 */
export function reasoningLevelsOf(value: string): ReasoningLevel[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(value) as unknown
  } catch {
    parsed = null
  }
  const candidates: ReasoningLevel[] = []
  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue
      const { id, apiValue } = entry as { id?: unknown; apiValue?: unknown }
      if (typeof id !== 'string' || id === '') continue
      candidates.push({ id, apiValue: typeof apiValue === 'string' ? apiValue : '' })
    }
  }
  const levels = candidates.filter((level, index) => candidates.findIndex(entry => entry.id === level.id) === index)
  if (levels.every(level => level.id !== REASONING_OFF.id)) levels.unshift(REASONING_OFF)
  return levels
}

/**
 * Build the reasoning policy stored for one model.
 *
 * Stored levels arrive as a JSON array. A model whose levels define no
 * thinking row cannot reason, and the default falls back to the first
 * thinking row.
 *
 * @param enabled - whether the model may think.
 * @param levelsJson - stored level rows.
 * @param fallback - stored default level id.
 * @returns the policy the gateways enforce.
 */
export function modelReasoning(enabled: boolean, levelsJson: string, fallback: string): ModelReasoning {
  const levels = reasoningLevelsOf(levelsJson)
  const thinking = levels.filter(level => level.id !== REASONING_OFF.id)
  const wanted = levels.find(level => level.id === fallback)
  return {
    enabled: enabled && thinking.length > 0,
    levels,
    default: wanted?.id ?? thinking[0]?.id ?? REASONING_OFF.id,
  }
}

function mapModel(row: ModelRow): PlatformModel {
  const badgeVi = row.badge_text_vi
  const badgeEn = row.badge_text_en
  const tone = row.badge_tone
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    contextWindow: Number(row.context_window),
    maxOutputTokens: Number(row.max_output_tokens),
    inputModalities: row.input_modalities.split(',').filter((entry): entry is 'text' | 'image' => entry === 'text' || entry === 'image'),
    pricing: { input: Number(row.input_price_usd), output: Number(row.output_price_usd) },
    capabilities: capabilitiesOf(row.capabilities_json),
    ...(badgeVi === null || badgeEn === null || tone === null
      ? {}
      : { badge: { text: { vi: badgeVi, en: badgeEn }, tone } }),
    recommended: Number(row.recommended) === 1,
    providerId: row.provider_id,
    upstreamId: row.upstream_id,
    reasoning: modelReasoning(
      Number(row.reasoning_enabled) === 1,
      row.reasoning_levels,
      row.reasoning_default,
    ),
    enabled: Number(row.enabled) === 1,
    sortOrder: Number(row.sort_order),
  }
}

function mapProvider(row: ProviderRow): Provider {
  return {
    id: row.id,
    name: row.name,
    chatBaseUrl: row.chat_base_url,
    anthropicBaseUrl: row.anthropic_base_url,
    apiKey: row.api_key,
    enabled: Number(row.enabled) === 1,
    note: row.note,
  }
}

let seeding: Promise<void> | undefined

async function seedCatalog(): Promise<void> {
  const providers = await rows<ProviderIdRow>('SELECT id FROM providers')
  let seedProviderId: string | null = null
  if (providers.length === 0) {
    await write(
      `INSERT IGNORE INTO providers (id, name, chat_base_url, anthropic_base_url, api_key, enabled, note)
       VALUES (?, 'DeepSeek', NULL, NULL, NULL, 1, 'Kế thừa DEEPSEEK_API_KEY và URL mặc định từ biến môi trường.')`,
      [DEFAULT_PROVIDER_ID],
    )
    seedProviderId = DEFAULT_PROVIDER_ID
  } else if (providers.some(provider => provider.id === DEFAULT_PROVIDER_ID)) {
    seedProviderId = DEFAULT_PROVIDER_ID
  }
  const [modelCount] = await rows<CountRow>('SELECT COUNT(*) AS total FROM models')
  if (Number(modelCount?.total ?? 0) > 0) return
  for (const model of DEFAULT_MODELS) {
    const providerId = model.providerId === DEFAULT_PROVIDER_ID ? seedProviderId : model.providerId
    await write(
      `INSERT IGNORE INTO models (${MODEL_COLUMNS})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model.id,
        model.name,
        model.tagline,
        model.description,
        model.contextWindow,
        model.maxOutputTokens,
        model.inputModalities.join(','),
        model.pricing.input.toFixed(6),
        model.pricing.output.toFixed(6),
        JSON.stringify(model.capabilities),
        model.badge?.text.vi ?? null,
        model.badge?.text.en ?? null,
        model.badge?.tone ?? null,
        model.recommended === true ? 1 : 0,
        model.enabled ? 1 : 0,
        providerId,
        model.upstreamId,
        model.reasoning.enabled ? 1 : 0,
        JSON.stringify(model.reasoning.levels),
        model.reasoning.default,
        model.sortOrder,
      ],
    )
  }
}

/**
 * Insert the starting catalog when the database has none.
 *
 * Runs at most once per process; `INSERT IGNORE` keeps concurrent processes safe.
 */
async function ensureCatalog(): Promise<void> {
  seeding ??= seedCatalog().catch(error => {
    seeding = undefined
    throw error
  })
  await seeding
}

/**
 * Read every stored model, including disabled rows.
 *
 * @returns catalog rows ordered by operator sort order.
 */
export async function loadAllModels(): Promise<PlatformModel[]> {
  await ensureCatalog()
  const result = await rows<ModelRow>(`SELECT ${MODEL_COLUMNS} FROM models ORDER BY sort_order, name`)
  return result.map(mapModel)
}

/**
 * Read the models this deployment serves to clients.
 *
 * @returns enabled rows ordered by operator sort order.
 */
export async function loadServedModels(): Promise<PlatformModel[]> {
  const models = await loadAllModels()
  return models.filter(model => model.enabled)
}

/**
 * Look up an enabled model.
 *
 * @param id - platform model id.
 * @returns the served model, or undefined when it is unknown or disabled.
 */
export async function findServedModel(id: string): Promise<PlatformModel | undefined> {
  const models = await loadServedModels()
  return models.find(model => model.id === id)
}

/**
 * Create a catalog row.
 *
 * @param input - validated model fields.
 */
export async function createModel(input: ModelInput): Promise<void> {
  await write(
    `INSERT INTO models (${MODEL_COLUMNS})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.name,
      input.tagline,
      input.description,
      input.contextWindow,
      input.maxOutputTokens,
      input.inputModalities.join(','),
      input.inputPriceUsd.toFixed(6),
      input.outputPriceUsd.toFixed(6),
      JSON.stringify(input.capabilities),
      input.badgeTextVi,
      input.badgeTextEn,
      input.badgeTone,
      input.recommended ? 1 : 0,
      input.enabled ? 1 : 0,
      input.providerId,
      input.upstreamId,
      input.reasoningEnabled ? 1 : 0,
      JSON.stringify(input.reasoningLevels),
      input.reasoningDefault,
      input.sortOrder,
    ],
  )
}

const MODEL_PATCH_COLUMNS: Readonly<Record<keyof ModelInput, string>> = {
  id: 'id',
  name: 'name',
  tagline: 'tagline',
  description: 'description',
  contextWindow: 'context_window',
  maxOutputTokens: 'max_output_tokens',
  inputModalities: 'input_modalities',
  inputPriceUsd: 'input_price_usd',
  outputPriceUsd: 'output_price_usd',
  capabilities: 'capabilities_json',
  badgeTextVi: 'badge_text_vi',
  badgeTextEn: 'badge_text_en',
  badgeTone: 'badge_tone',
  recommended: 'recommended',
  enabled: 'enabled',
  providerId: 'provider_id',
  upstreamId: 'upstream_id',
  reasoningEnabled: 'reasoning_enabled',
  reasoningLevels: 'reasoning_levels',
  reasoningDefault: 'reasoning_default',
  sortOrder: 'sort_order',
}

/**
 * Apply a partial model edit.
 *
 * @param id - current platform model id.
 * @param patch - fields to replace; omitted fields keep their stored value.
 * @returns whether a row matched.
 */
export async function updateModel(id: string, patch: ModelPatch): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  for (const key of Object.keys(patch) as (keyof ModelInput)[]) {
    const value = patch[key]
    if (value === undefined) continue
    const column = MODEL_PATCH_COLUMNS[key]
    sets.push(`${column} = ?`)
    if (key === 'inputModalities') params.push((value as readonly string[]).join(','))
    else if (key === 'reasoningLevels') params.push(JSON.stringify(value))
    else if (key === 'capabilities') params.push(JSON.stringify(value))
    else if (key === 'inputPriceUsd' || key === 'outputPriceUsd') params.push((value as number).toFixed(6))
    else if (key === 'recommended' || key === 'enabled' || key === 'reasoningEnabled') params.push(value === true ? 1 : 0)
    else params.push(value)
  }
  if (sets.length === 0) return false
  params.push(id)
  const result = await write(`UPDATE models SET ${sets.join(', ')} WHERE id = ?`, params)
  return result.affectedRows > 0
}

/**
 * Delete a catalog row. Historical usage rows keep the model id as text.
 *
 * @param id - platform model id.
 * @returns whether a row was removed.
 */
export async function deleteModel(id: string): Promise<boolean> {
  const result = await write('DELETE FROM models WHERE id = ?', [id])
  return result.affectedRows > 0
}

/**
 * Read every provider, newest configuration first.
 *
 * @returns stored provider rows.
 */
export async function loadProviders(): Promise<Provider[]> {
  await ensureCatalog()
  const result = await rows<ProviderRow>(`SELECT ${PROVIDER_COLUMNS} FROM providers ORDER BY name`)
  return result.map(mapProvider)
}

/**
 * Read providers with the facts the admin console shows.
 *
 * @returns provider rows plus credential presence and model counts.
 */
export async function loadProviderViews(): Promise<ProviderView[]> {
  await ensureCatalog()
  const result = await rows<ProviderRow & { model_count: number | string }>(
    `SELECT p.${PROVIDER_COLUMNS.split(', ').join(', p.')}, COUNT(m.id) AS model_count
     FROM providers p LEFT JOIN models m ON m.provider_id = p.id
     GROUP BY p.id ORDER BY p.name`,
  )
  return result.map(row => {
    const provider = mapProvider(row)
    return {
      id: provider.id,
      name: provider.name,
      chatBaseUrl: provider.chatBaseUrl,
      anthropicBaseUrl: provider.anthropicBaseUrl,
      enabled: provider.enabled,
      note: provider.note,
      apiKeySet: provider.apiKey !== null && provider.apiKey !== '',
      apiKeyHint: provider.apiKey === null || provider.apiKey === '' ? null : `…${provider.apiKey.slice(-4)}`,
      modelCount: Number(row.model_count),
    }
  })
}

async function uniqueProviderId(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'provider'
  let candidate = base
  for (let suffix = 2; ; suffix += 1) {
    const [existing] = await rows<CountRow>('SELECT COUNT(*) AS total FROM providers WHERE id = ?', [candidate])
    if (Number(existing?.total ?? 0) === 0) return candidate
    candidate = `${base}-${suffix}`
  }
}

/**
 * Create a provider.
 *
 * @param input - validated provider fields.
 * @returns the generated provider id.
 */
export async function createProvider(input: ProviderInput): Promise<string> {
  const id = await uniqueProviderId(input.name)
  await write(
    `INSERT INTO providers (id, name, chat_base_url, anthropic_base_url, api_key, enabled, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      emptyToNull(input.chatBaseUrl),
      emptyToNull(input.anthropicBaseUrl),
      emptyToNull(input.apiKey ?? ''),
      input.enabled ? 1 : 0,
      input.note,
    ],
  )
  return id
}

/**
 * Apply a partial provider edit.
 *
 * @param id - provider id.
 * @param patch - fields to replace; a blank `apiKey` keeps the stored credential.
 * @returns whether a row matched.
 */
export async function updateProvider(id: string, patch: Partial<ProviderInput>): Promise<boolean> {
  const sets: string[] = []
  const params: unknown[] = []
  const push = (column: string, value: unknown): void => {
    sets.push(`${column} = ?`)
    params.push(value)
  }
  if (patch.name !== undefined) push('name', patch.name)
  if (patch.chatBaseUrl !== undefined) push('chat_base_url', emptyToNull(patch.chatBaseUrl))
  if (patch.anthropicBaseUrl !== undefined) push('anthropic_base_url', emptyToNull(patch.anthropicBaseUrl))
  if (patch.enabled !== undefined) push('enabled', patch.enabled ? 1 : 0)
  if (patch.note !== undefined) push('note', patch.note)
  if (patch.clearApiKey === true) push('api_key', null)
  else if (patch.apiKey !== undefined && patch.apiKey !== '') push('api_key', patch.apiKey)
  if (sets.length === 0) return false
  params.push(id)
  const result = await write(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`, params)
  return result.affectedRows > 0
}

/**
 * Delete a provider. Models that referenced it fall back to the environment configuration.
 *
 * @param id - provider id.
 * @returns whether a row was removed.
 */
export async function deleteProvider(id: string): Promise<boolean> {
  const result = await write('DELETE FROM providers WHERE id = ?', [id])
  return result.affectedRows > 0
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * Resolve the service that answers a model request.
 *
 * A stored provider wins over the deployment defaults; its missing credential
 * and URLs fall back to `DEEPSEEK_API_KEY` and the `DEEPSEEK_*` base URLs.
 *
 * @param model - served model.
 * @returns the endpoint credentials and base URLs.
 * @throws {@link UpstreamNotConfiguredError} when the provider is disabled or has no credential.
 */
export async function upstreamForModel(model: PlatformModel): Promise<UpstreamEndpoint> {
  const provider = model.providerId === null
    ? undefined
    : (await loadProviders()).find(entry => entry.id === model.providerId)
  if (provider === undefined) {
    const apiKey = upstreamApiKey()
    if (apiKey === undefined) throw new UpstreamNotConfiguredError()
    return {
      name: 'Mặc định',
      chatBaseUrl: openAiBaseUrl(),
      anthropicBaseUrl: anthropicBaseUrl(),
      apiKey,
    }
  }
  if (!provider.enabled) {
    throw new UpstreamNotConfiguredError(`Nhà cung cấp ${provider.name} đang tắt trong trang quản trị.`)
  }
  const apiKey = provider.apiKey?.trim() || upstreamApiKey()
  if (apiKey === undefined) {
    throw new UpstreamNotConfiguredError(`Nhà cung cấp ${provider.name} chưa có khoá API.`)
  }
  return {
    name: provider.name,
    chatBaseUrl: stripSlash(provider.chatBaseUrl ?? openAiBaseUrl()),
    anthropicBaseUrl: stripSlash(provider.anthropicBaseUrl ?? anthropicBaseUrl()),
    apiKey,
  }
}

function stripSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Resolve an endpoint for requests that name no model, such as Anthropic file uploads.
 *
 * @returns the first enabled provider's configuration, or the environment defaults.
 * @throws {@link UpstreamNotConfiguredError} when no enabled provider has a credential.
 */
export async function defaultUpstream(): Promise<UpstreamEndpoint> {
  const providers = await loadProviders()
  const preferred = providers.find(provider => provider.id === DEFAULT_PROVIDER_ID && provider.enabled)
    ?? providers.find(provider => provider.enabled)
  if (preferred !== undefined) {
    const apiKey = preferred.apiKey?.trim() || upstreamApiKey()
    if (apiKey !== undefined) {
      return {
        name: preferred.name,
        chatBaseUrl: stripSlash(preferred.chatBaseUrl ?? openAiBaseUrl()),
        anthropicBaseUrl: stripSlash(preferred.anthropicBaseUrl ?? anthropicBaseUrl()),
        apiKey,
      }
    }
  }
  const apiKey = upstreamApiKey()
  if (apiKey === undefined) throw new UpstreamNotConfiguredError()
  return {
    name: 'Mặc định',
    chatBaseUrl: openAiBaseUrl(),
    anthropicBaseUrl: anthropicBaseUrl(),
    apiKey,
  }
}

/**
 * Probe a provider's OpenAI-compatible `/models` endpoint.
 *
 * @param id - provider id.
 * @returns the HTTP status and, when the call succeeded, how many models it lists;
 * null when the id names no stored provider.
 * @throws {@link UpstreamNotConfiguredError} when the provider has no chat URL or credential.
 */
export async function testProvider(id: string): Promise<{ readonly status: number; readonly models: number } | null> {
  const provider = (await loadProviders()).find(entry => entry.id === id)
  if (provider === undefined) return null
  const apiKey = provider.apiKey?.trim() || upstreamApiKey()
  const base = provider.chatBaseUrl?.trim() || openAiBaseUrl()
  if (apiKey === undefined) throw new UpstreamNotConfiguredError(`Nhà cung cấp ${provider.name} chưa có khoá API.`)
  const response = await fetch(`${stripSlash(base)}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) return { status: response.status, models: 0 }
  const payload: unknown = await response.json().catch(() => null)
  const data = typeof payload === 'object' && payload !== null ? (payload as { data?: unknown }).data : undefined
  return { status: response.status, models: Array.isArray(data) ? data.length : 0 }
}
