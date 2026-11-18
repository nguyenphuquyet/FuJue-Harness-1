/** Harness installer downloads published on the public download page. */
import type { RowDataPacket } from 'mysql2/promise'
import { rows, write } from './db'

/** One installer offered by the download page. */
export interface DownloadAsset {
  readonly id: string
  readonly os: 'windows' | 'macos' | 'linux'
  readonly arch: string
  readonly label: string
  readonly fileName: string
  /** Direct asset URL; empty falls back to the release page. */
  readonly url: string
  readonly note: string
  readonly enabled: boolean
}

/** Release facts and the installers listed on `/download`. */
export interface DownloadConfig {
  readonly version: string
  readonly releaseUrl: string
  readonly assets: readonly DownloadAsset[]
}

interface MetaRow extends RowDataPacket {
  meta_value: string
}

const META_KEY = 'harness_downloads'

function defaultReleaseUrl(): string {
  return process.env.HARNESS_RELEASES_URL?.trim() || 'https://github.com/deepseek-ai/deepseek-harness/releases'
}

/**
 * Build the installer list shipped with this deployment.
 *
 * Asset file names follow the packaging workflows; an administrator replaces
 * the URLs with published release links from the admin console.
 *
 * @returns the default configuration, resolving `HARNESS_VERSION` and `HARNESS_RELEASES_URL`.
 */
export function defaultDownloads(): DownloadConfig {
  const version = process.env.HARNESS_VERSION?.trim() || '0.2.2'
  const releaseUrl = defaultReleaseUrl()
  const file = (target: string, extension: string): string => `fujue-harness-${version}-${target}.${extension}`
  return {
    version,
    releaseUrl,
    assets: [
      {
        id: 'windows-x64',
        os: 'windows',
        arch: 'x64',
        label: 'Windows 10/11',
        fileName: file('win-x64-unsigned', 'exe'),
        url: '',
        note: 'Bản chưa ký. Windows SmartScreen có thể hỏi thêm khi mở lần đầu.',
        enabled: true,
      },
      {
        id: 'macos-arm64',
        os: 'macos',
        arch: 'arm64',
        label: 'macOS · Apple Silicon',
        fileName: file('mac-arm64', 'dmg'),
        url: '',
        note: 'Dành cho chip M1, M2, M3 và M4.',
        enabled: true,
      },
      {
        id: 'macos-x64',
        os: 'macos',
        arch: 'x64',
        label: 'macOS · Intel',
        fileName: file('mac-x64', 'dmg'),
        url: '',
        note: 'Dành cho máy Mac dùng chip Intel.',
        enabled: true,
      },
      {
        id: 'linux-x64',
        os: 'linux',
        arch: 'x64',
        label: 'Linux',
        fileName: file('linux-x86_64', 'AppImage'),
        url: '',
        note: 'AppImage, cấp quyền thực thi sau khi tải.',
        enabled: true,
      },
    ],
  }
}

function parseAsset(value: unknown, fallback: DownloadAsset): DownloadAsset | null {
  if (typeof value !== 'object' || value === null) return null
  const record = value as Record<string, unknown>
  const text = (key: keyof DownloadAsset, initial: string): string =>
    typeof record[key] === 'string' ? (record[key] as string) : initial
  return {
    id: fallback.id,
    os: fallback.os,
    arch: fallback.arch,
    label: text('label', fallback.label),
    fileName: text('fileName', fallback.fileName),
    url: text('url', fallback.url),
    note: text('note', fallback.note),
    enabled: typeof record.enabled === 'boolean' ? record.enabled : fallback.enabled,
  }
}

/**
 * Read the download configuration, falling back to per-asset code defaults.
 *
 * @returns the stored configuration merged over the deployment defaults.
 */
export async function loadDownloadConfig(): Promise<DownloadConfig> {
  const defaults = defaultDownloads()
  const [row] = await rows<MetaRow>('SELECT meta_value FROM platform_meta WHERE meta_key = ? LIMIT 1', [META_KEY])
  if (row === undefined) return defaults
  let parsed: unknown
  try {
    parsed = JSON.parse(row.meta_value) as unknown
  } catch {
    return defaults
  }
  if (typeof parsed !== 'object' || parsed === null) return defaults
  const record = parsed as Record<string, unknown>
  const storedAssets = Array.isArray(record.assets) ? record.assets : []
  return {
    version: typeof record.version === 'string' && record.version !== '' ? record.version : defaults.version,
    releaseUrl: typeof record.releaseUrl === 'string' && record.releaseUrl !== '' ? record.releaseUrl : defaults.releaseUrl,
    assets: defaults.assets.map(fallback => {
      const stored = storedAssets.find(
        entry => typeof entry === 'object' && entry !== null && (entry as { id?: unknown }).id === fallback.id,
      )
      return parseAsset(stored, fallback) ?? fallback
    }),
  }
}

/**
 * Persist the download configuration.
 *
 * @param config - validated version, release URL, and installer rows.
 */
export async function saveDownloadConfig(config: DownloadConfig): Promise<void> {
  await write(
    `INSERT INTO platform_meta (meta_key, meta_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)`,
    [META_KEY, JSON.stringify(config)],
  )
}
