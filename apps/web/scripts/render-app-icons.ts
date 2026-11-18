/**
 * Render the install icons of the Web application from the official
 * application tile.
 *
 * A browser installs a Web App only with a raster 192px and a 512px icon, masks
 * the icon it puts on the home screen, and has no manifest support for iOS,
 * which reads `apple-touch-icon` instead. A bare favicon is the mark drawn edge
 * to edge: handed to a launcher directly it loses its fins to the mask, and it
 * carries neither the tile nor a background of its own. This script rasterizes
 * the official application tile (`apps/desktop/resources/icon.svg`, the artwork
 * the desktop application ships) into the committed PNGs under `public/`. Every
 * variant crops the tile's drop shadow, which belongs to a desktop window
 * rather than a launcher. The maskable variant is the same tile: the tile's
 * gradient fills the icon to the edge, so no mask meets a seam, and the mark
 * already lies inside the circle such a mask is guaranteed to show.
 *
 * The committed PNGs are the output; rerun
 * `pnpm --filter @deepseek-ai/dsh-web-frontend run render:app-icons` after the
 * tile artwork changes.
 * @module render-app-icons
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Vector source owned by the desktop application; 1104 units square with the tile inset. */
export const TILE_SOURCE = fileURLToPath(new URL('../../desktop/resources/icon.svg', import.meta.url))

/** Directory the generated PNGs are committed to. */
export const ICON_OUTPUT_DIRECTORY = fileURLToPath(new URL('../public/', import.meta.url))

/** Tile edge in source units; every render density is expressed against it. */
const TILE_EDGE = 1024

/** Tile inset in the source canvas: the drop shadow occupies the surrounding band. */
const TILE_INSET = { x: 40, y: 32 } as const

/** Density at which the source's own 1:1 scale renders. */
const SOURCE_DENSITY = 72

/** Samples per output pixel along each axis before reduction. */
const RENDER_SCALE = 4

/**
 * Radius a platform mask is guaranteed to show, as a fraction of the icon edge.
 * The mark reaches {@link MARK_INK_RADIUS_RATIO} of the edge from the tile
 * centre, so it stays whole under every mask without being scaled.
 */
export const MASKABLE_SAFE_RADIUS_RATIO = 0.4

/**
 * Radius of the mark's ink, as a fraction of the icon edge, measured from the
 * tile centre. `pwa-manifest.e2e.ts` measures the committed raster against
 * {@link MASKABLE_SAFE_RADIUS_RATIO}.
 */
export const MARK_INK_RADIUS_RATIO = 0.331

/** Root element of the source document, rewritten to crop the canvas to the tile. */
const SOURCE_ROOT = /^<svg[^>]*>/u

/** The tile group's drop shadow; stripped because a launcher icon has no window around it. */
const TILE_SHADOW_GROUP = '<g filter="url(#filter0_d_1637_371)">'

/** The artwork group inside the tile; carries the mark and its own shadow. */
const TILE_ARTWORK_GROUP = '<g filter="url(#filter1_ddi_1637_371)">'

/** One committed install icon: the manifest member it serves and its edge in pixels. */
export interface AppIconVariant {
  /** File name inside `public/`. */
  readonly file: string
  /** Square edge in pixels. */
  readonly size: number
}

/**
 * Install icons the Web application ships. Chrome requires the 192px and 512px
 * raster pair to offer installation, prefers a maskable icon for the home
 * screen, and iOS reads the touch icon alone.
 */
export const APP_ICON_VARIANTS: readonly AppIconVariant[] = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

/** The cropped 1:1 root every variant shares, at the tile's own square extent. */
function croppedRoot(): string {
  return `<svg width="${String(TILE_EDGE)}" height="${String(TILE_EDGE)}"`
    + ` viewBox="${String(TILE_INSET.x)} ${String(TILE_INSET.y)} ${String(TILE_EDGE)} ${String(TILE_EDGE)}"`
    + ' fill="none" xmlns="http://www.w3.org/2000/svg">'
}

/** Replace the source root so the icon canvas is exactly the tile. */
function reparent(source: string): string {
  const trimmed = source.trim()
  const root = SOURCE_ROOT.exec(trimmed)
  if (root === null) throw new Error('app icons: the tile source has no root element')
  if (!trimmed.includes(TILE_SHADOW_GROUP)) throw new Error('app icons: the tile source has no shadowed tile group')
  if (!trimmed.includes(TILE_ARTWORK_GROUP)) throw new Error('app icons: the tile source has no artwork group')
  return `${croppedRoot()}${trimmed.slice(root[0].length).replace(TILE_SHADOW_GROUP, '<g>')}`
}

/**
 * Rewrite the tile source so the icon canvas is exactly the tile.
 * @param source - complete `icon.svg` document.
 * @returns an SVG document whose 1024-unit square is the tile without its shadow.
 */
export function tileDocument(source: string): string {
  return reparent(source)
}

/**
 * Rasterize one rewritten document at a square edge.
 * @param document - output of {@link tileDocument}.
 * @param size - square edge in pixels.
 * @returns the PNG bytes.
 */
async function renderPng(document: string, size: number): Promise<Buffer> {
  const { default: sharp } = await import('sharp')
  const renderSize = Math.max(TILE_EDGE, size * RENDER_SCALE)
  // A separate raster preserves the source's filters at full resolution and
  // prevents SVG resize optimizations from bypassing the downsampling step.
  const raster = await sharp(Buffer.from(document), { density: SOURCE_DENSITY * renderSize / TILE_EDGE })
    .png()
    .toBuffer()
  return sharp(raster)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
}

/**
 * Render every install icon from the tile source.
 * @param source - complete `icon.svg` document.
 * @returns one PNG per {@link APP_ICON_VARIANTS} entry, in declaration order.
 */
export async function renderAppIcons(source: string): Promise<readonly { variant: AppIconVariant; png: Buffer }[]> {
  const document = tileDocument(source)
  return Promise.all(APP_ICON_VARIANTS.map(async variant => ({
    variant,
    png: await renderPng(document, variant.size),
  })))
}

async function main(): Promise<void> {
  const icons = await renderAppIcons(await readFile(TILE_SOURCE, 'utf8'))
  await Promise.all(icons.map(async ({ variant, png }) => {
    await writeFile(resolve(ICON_OUTPUT_DIRECTORY, variant.file), png)
  }))
  console.info(`app icons: wrote ${icons.map(icon => icon.variant.file).join(', ')} to ${ICON_OUTPUT_DIRECTORY}`)
}

if (process.argv[1] !== undefined && import.meta.filename === resolve(process.argv[1])) await main()
