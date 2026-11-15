/** Publish the installer list shown on the public download page. */
import { adminGuard, recordAdminAction } from '@/lib/admin'
import { downloadConfigSchema } from '@/lib/admin-schemas'
import { loadDownloadConfig, saveDownloadConfig } from '@/lib/downloads'
import { readJson } from '@/lib/http'

export async function PUT(request: Request): Promise<Response> {
  const guard = await adminGuard()
  if (!guard.ok) return guard.response
  const parsed = await readJson(request, downloadConfigSchema)
  if (!parsed.ok) return parsed.response
  const current = await loadDownloadConfig()
  const patches = new Map(parsed.value.assets.map(asset => [asset.id, asset]))
  await saveDownloadConfig({
    version: parsed.value.version,
    releaseUrl: parsed.value.releaseUrl,
    assets: current.assets.map(asset => {
      const patch = patches.get(asset.id)
      return patch === undefined ? asset : { ...asset, ...patch }
    }),
  })
  await recordAdminAction(guard.admin, 'downloads.update', parsed.value.version, 'Cập nhật trang tải Harness')
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } })
}
