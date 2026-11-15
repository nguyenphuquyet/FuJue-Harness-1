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

/** Upstream Anthropic-compatible root, without a trailing slash. */
export function anthropicBaseUrl(): string {
  return (process.env.DEEPSEEK_ANTHROPIC_BASE_URL?.trim() || 'https://api.deepseek.com/anthropic').replace(/\/+$/, '')
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
