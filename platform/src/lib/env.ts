/** Deployment configuration resolved lazily so builds never require runtime secrets. */

/** MySQL connection fields. */
export interface DatabaseConfig {
  readonly host: string
  readonly port: number
  readonly user: string
  readonly password: string
  readonly database: string
}

/**
 * Resolve the MySQL connection from `DATABASE_URL`, then discrete `MYSQL_*` values.
 *
 * @returns validated connection fields.
 * @throws When the URL uses another scheme or names an invalid database.
 */
export function databaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL?.trim()
  if (url !== undefined && url !== '') {
    const parsed = new URL(url)
    if (parsed.protocol !== 'mysql:') throw new Error('DATABASE_URL must use the mysql: scheme')
    const database = parsed.pathname.replace(/^\//, '')
    if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('DATABASE_URL must name a database')
    return {
      host: parsed.hostname,
      port: Number(parsed.port === '' ? 3306 : parsed.port),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database,
    }
  }
  const database = process.env.MYSQL_DATABASE?.trim() ?? ''
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('Set DATABASE_URL or MYSQL_DATABASE/MYSQL_USER/MYSQL_PASSWORD for FuJue Platform')
  }
  return {
    host: process.env.MYSQL_HOST?.trim() ?? '127.0.0.1',
    port: Number(process.env.MYSQL_PORT?.trim() ?? 3306),
    user: process.env.MYSQL_USER?.trim() ?? 'root',
    password: process.env.MYSQL_PASSWORD ?? '',
    database,
  }
}

/**
 * Resolve the public origin used in authorization and completion URLs.
 *
 * @param request - current request, used when `PLATFORM_ORIGIN` is unset.
 * @returns origin without a trailing slash.
 */
export function deploymentOrigin(request?: Request): string {
  const configured = process.env.PLATFORM_ORIGIN?.trim()
  if (configured !== undefined && configured !== '') {
    let url: URL
    try {
      url = new URL(configured)
    } catch {
      throw new Error('PLATFORM_ORIGIN must be an absolute HTTP(S) origin')
    }
    if (url.username !== '' || url.password !== '' || url.pathname !== '/' || url.search !== '' || url.hash !== '') {
      throw new Error('PLATFORM_ORIGIN must be an origin without credentials, path, query, or fragment')
    }
    return url.origin
  }
  if (request === undefined) throw new Error('PLATFORM_ORIGIN is required outside an HTTP request')
  return new URL(request.url).origin
}

/** Upstream OpenAI-compatible root, without a trailing slash. */
export function openAiBaseUrl(): string {
  return (process.env.DEEPSEEK_UPSTREAM_URL?.trim() || 'https://api.deepseek.com').replace(/\/+$/, '')
}

/**
 * Upstream Anthropic-compatible root, without a trailing slash.
 *
 * @returns the configured root, or null when this deployment reaches every
 * provider through its OpenAI-compatible endpoint and the gateway translates.
 */
export function anthropicBaseUrl(): string | null {
  const configured = process.env.DEEPSEEK_ANTHROPIC_BASE_URL?.trim()
  return configured === undefined || configured === '' ? null : configured.replace(/\/+$/, '')
}

/**
 * Root of the DeepSeek Search and Fetch API, without a trailing slash.
 *
 * `DEEPSEEK_TOOLS_BASE_URL` names the root directly. Otherwise it follows the
 * default provider's OpenAI-compatible root, which either already ends in `/v1`
 * or holds the API one level below `/v1`, as the official API does.
 *
 * @param chatBaseUrl - OpenAI-compatible root of the deployment's default provider.
 * @returns the root below which `/search` and `/fetch` are appended.
 */
export function toolsBaseUrl(chatBaseUrl: string): string {
  const configured = process.env.DEEPSEEK_TOOLS_BASE_URL?.trim()
  if (configured !== undefined && configured !== '') return configured.replace(/\/+$/, '')
  const root = chatBaseUrl.replace(/\/+$/, '')
  return root.endsWith('/v1') ? `${root}/tools` : `${root}/v1/tools`
}

/**
 * Credential the Search and Fetch API requests carry.
 *
 * @param fallback - the default provider's credential.
 * @returns `DEEPSEEK_TOOLS_API_KEY` when the operator configured a separate one.
 */
export function toolsApiKey(fallback: string): string {
  const configured = process.env.DEEPSEEK_TOOLS_API_KEY?.trim()
  return configured === undefined || configured === '' ? fallback : configured
}

/** Provider credential forwarded by every metered model request. */
export function upstreamApiKey(): string | undefined {
  const key = process.env.DEEPSEEK_API_KEY?.trim()
  return key === undefined || key === '' ? undefined : key
}

/** Whether cookies may be marked `Secure`; production deployments serve HTTPS. */
export function secureCookies(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Manual recharge destination rendered by `/top_up`. */
export interface TopUpInfo {
  /** Bank the transfer goes to, or null when the deployment has not configured one. */
  readonly bank: string | null
  /** Receiving account number, or null when not configured. */
  readonly accountNumber: string | null
  /** Account holder name the sender must match, or null when not configured. */
  readonly accountHolder: string | null
  /** Operator instructions shown above the transfer details, or null. */
  readonly note: string | null
}

/**
 * Read one optional deployment value.
 *
 * @param name - environment variable name.
 * @returns trimmed text, or null when unset or blank.
 */
function optionalValue(name: string): string | null {
  const value = process.env[name]?.trim()
  return value === undefined || value === '' ? null : value
}

/**
 * Resolve the manual recharge destination from `PLATFORM_BANK_*` and `PLATFORM_TOPUP_NOTE`.
 *
 * @returns the configured fields; a null entry tells the page to fall back to the admin contact.
 */
export function topUpInfo(): TopUpInfo {
  return {
    bank: optionalValue('PLATFORM_BANK_NAME'),
    accountNumber: optionalValue('PLATFORM_BANK_ACCOUNT'),
    accountHolder: optionalValue('PLATFORM_BANK_HOLDER'),
    note: optionalValue('PLATFORM_TOPUP_NOTE'),
  }
}
