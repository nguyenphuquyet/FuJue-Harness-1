import { DownloadView } from '@/components/DownloadView'
import { loadDownloadConfig } from '@/lib/downloads'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tải FuJue Harness',
  description: 'Bộ cài FuJue Harness cho Windows, macOS và Linux. Đăng nhập một lần bằng tài khoản FuJue Platform.',
}

/**
 * Public download route.
 *
 * @returns the installer page with the signed-in state of the visitor.
 */
export default async function DownloadPage() {
  const [config, user] = await Promise.all([loadDownloadConfig(), sessionUser()])
  return <DownloadView config={config} signedIn={user !== null} />
}
