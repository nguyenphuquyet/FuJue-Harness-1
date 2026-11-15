import { readAuthRequest } from '@/lib/authorization'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthorizeView } from '@/components/auth/AuthorizeView'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Browser consent page the desktop client opens for PKCE sign-in.
 *
 * @param props - query string carrying the authorization id.
 * @returns the consent layout.
 */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<{ authorize_id?: string }> }) {
  const { authorize_id: authorizeId } = await searchParams
  const authorization = authorizeId === undefined ? null : await readAuthRequest(authorizeId)
  const user = await sessionUser()
  return (
    <AuthLayout>
      <AuthorizeView
        authorization={authorization}
        authorizeId={authorizeId ?? null}
        user={user === null ? null : { name: user.name, email: user.email }}
      />
    </AuthLayout>
  )
}
