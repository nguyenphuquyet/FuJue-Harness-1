/** The FuJue model catalog: shared types, display helpers, and desktop listing rendering. */

/** Capability badge rendered by the desktop model selector. */
export interface ModelBadge {
  readonly text: { readonly vi: string; readonly en: string }
  readonly tone: 'neutral' | 'info' | 'success' | 'warning'
}

/** One selectable reasoning level and the effort string sent to the provider. */
export interface ReasoningLevel {
  /** Level id clients select, such as `off`, `low`, `medium`, or `high`. */
  readonly id: string
  /** Effort forwarded upstream; an empty value disables thinking. */
  readonly apiValue: string
}

/** The built-in level that disables thinking. */
export const REASONING_OFF: ReasoningLevel = { id: 'off', apiValue: '' }

/** Levels a new model starts with; the admin console edits them per model. */
export const DEFAULT_REASONING_LEVELS: readonly ReasoningLevel[] = [
  REASONING_OFF,
  { id: 'low', apiValue: 'low' },
  { id: 'medium', apiValue: 'medium' },
  { id: 'high', apiValue: 'high' },
]

/** Per-model reasoning policy configured in the admin console. */
export interface ModelReasoning {
  /** Whether the model may think at all. A disabled model always runs with `off`. */
  readonly enabled: boolean
  /** Selectable levels; `off` is always present. */
  readonly levels: readonly ReasoningLevel[]
  /** Id of the level applied when a request names none. */
  readonly default: string
}

/**
 * Pick the reasoning level one request may use.
 *
 * A client may always turn thinking off. Level ids the admin did not define
 * fall back to the model default, so a stale client cannot request an
 * unsupported effort.
 *
 * @param model - served model carrying its reasoning policy.
 * @param requested - level id named by the client, of any type.
 * @returns the level whose API value the gateway forwards upstream.
 */
export function resolveReasoning(model: PlatformModel, requested: unknown): ReasoningLevel {
  if (!model.reasoning.enabled) return REASONING_OFF
  if (requested === REASONING_OFF.id) return REASONING_OFF
  const named = model.reasoning.levels.find(level => level.id === requested)
  if (named !== undefined) return named
  return model.reasoning.levels.find(level => level.id === model.reasoning.default) ?? REASONING_OFF
}

/** One served model. */
export interface PlatformModel {
  readonly id: string
  readonly name: string
  readonly tagline: string
  readonly description: string
  readonly contextWindow: number
  readonly maxOutputTokens: number
  readonly inputModalities: readonly ('text' | 'image')[]
  /** USD per one million tokens. */
  readonly pricing: { readonly input: number; readonly output: number }
  readonly capabilities: readonly string[]
  readonly badge?: ModelBadge
  readonly recommended?: boolean
  /** Provider row that serves this model; null keeps the environment fallback. */
  readonly providerId: string | null
  /** Provider-side model name; null sends the platform id unchanged. */
  readonly upstreamId: string | null
  /** Thinking policy enforced by both gateways. */
  readonly reasoning: ModelReasoning
  readonly enabled: boolean
  readonly sortOrder: number
}

/**
 * Catalog rows seeded into a fresh database.
 *
 * Admins edit the stored rows afterwards, so this list only describes the
 * starting catalog and the fallback when the database has no models yet.
 */
export const DEFAULT_MODELS: readonly PlatformModel[] = [
  {
    id: 'deepseek-flash',
    name: 'DeepSeek V4.1 Flash',
    tagline: 'Mặc định cho mọi tác vụ',
    description:
      'Mô hình nhanh và tiết kiệm cho hội thoại, viết nội dung, đọc ảnh và các tác vụ agent hằng ngày. Phù hợp làm mặc định cho Desktop.',
    contextWindow: 1_048_576,
    maxOutputTokens: 32_768,
    inputModalities: ['text', 'image'],
    pricing: { input: 0.14, output: 0.56 },
    capabilities: ['Văn bản + hình ảnh', 'Gọi công cụ', 'Ngữ cảnh 1M token'],
    badge: { text: { vi: 'Nhanh', en: 'Fast' }, tone: 'success' },
    recommended: true,
    providerId: 'deepseek',
    upstreamId: null,
    reasoning: { enabled: true, levels: DEFAULT_REASONING_LEVELS, default: 'off' },
    enabled: true,
    sortOrder: 10,
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    tagline: 'Cho bài toán khó',
    description:
      'Suy luận sâu hơn, lập trình agentic và kiến thức chuyên sâu. Dùng khi chất lượng quan trọng hơn chi phí: review kiến trúc, săn lỗi khó, phân tích dài.',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    inputModalities: ['text'],
    pricing: { input: 0.55, output: 2.2 },
    capabilities: ['Suy luận sâu', 'Lập trình agentic', 'Ngữ cảnh 1M token'],
    badge: { text: { vi: 'Suy luận', en: 'Reasoning' }, tone: 'info' },
    providerId: 'deepseek',
    upstreamId: null,
    reasoning: { enabled: true, levels: DEFAULT_REASONING_LEVELS, default: 'high' },
    enabled: true,
    sortOrder: 20,
  },
]

/**
 * Client requirement every served entry declares.
 *
 * A listing entry without a minimum client version is offered only when the
 * requesting build already carries that model id in its own catalog, which
 * would hide every model an administrator added here. FuJue entries describe
 * themselves completely, so no build version gates them.
 */
const CLIENT_REQUIREMENTS = { 'deepseek-harness': { min_version: '0.0.0' } } as const

/**
 * Render the `/models` listing the desktop account route decodes.
 *
 * @param models - enabled catalog rows, in selector order.
 * @returns `{ data: [...] }` with capabilities, requirement, and badge fields.
 */
export function listingPayload(models: readonly PlatformModel[]): { data: unknown[] } {
  return {
    data: models.map(model => ({
      id: model.id,
      name: model.name,
      object: 'model',
      owned_by: 'fujue',
      context_window: model.contextWindow,
      max_output_tokens: model.maxOutputTokens,
      input_modalities: [...model.inputModalities],
      output_modalities: ['text'],
      api_capabilities: {
        anthropic_messages: {
          system_prompt_update: 'in-history',
          tool_update: model.id === 'deepseek-flash' ? 'addition-only' : 'in-history',
        },
      },
      client_requirements: CLIENT_REQUIREMENTS,
      ...(model.badge === undefined
        ? {}
        : { client_metadata: { 'deepseek-harness': { badge: { text: model.badge.text, tone: model.badge.tone } } } }),
    })),
  }
}

/**
 * Resolve the provider-side model name.
 *
 * The stored override wins; `DEEPSEEK_MODEL_MAP` remains the deployment-level
 * fallback for models that have no override yet.
 *
 * @param model - served model.
 * @returns the provider model id.
 */
export function upstreamModelId(model: PlatformModel): string {
  if (model.upstreamId !== null && model.upstreamId !== '') return model.upstreamId
  const raw = process.env.DEEPSEEK_MODEL_MAP?.trim()
  if (raw === undefined || raw === '') return model.id
  try {
    const map = JSON.parse(raw) as unknown
    if (typeof map === 'object' && map !== null && !Array.isArray(map)) {
      const mapped = (map as Record<string, unknown>)[model.id]
      if (typeof mapped === 'string' && mapped !== '') return mapped
    }
  } catch {
    // A malformed map leaves ids unchanged instead of failing every request.
  }
  return model.id
}

/**
 * Estimate the metered cost of one request.
 *
 * @param model - served model, or undefined for an unknown id.
 * @param promptTokens - billed input tokens.
 * @param completionTokens - billed output tokens.
 * @returns USD cost, safe to store as a decimal string.
 */
export function estimateCostUsd(
  model: PlatformModel | undefined,
  promptTokens: number,
  completionTokens: number,
): number {
  if (model === undefined) return 0
  return (promptTokens * model.pricing.input + completionTokens * model.pricing.output) / 1_000_000
}

/**
 * Format a per-million price for display.
 *
 * @param value - USD per million tokens.
 * @returns two-decimal text.
 */
export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}
