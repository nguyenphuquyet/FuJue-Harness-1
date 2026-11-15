import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { safeNext } from '@/lib/navigation'
import { sessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Registration page.
 *
 * @param props - query string carrying the post-registration destination.
 * @returns the authentication layout.
 */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await sessionUser()
  const { next } = await searchParams
  const destination = safeNext(next)
  if (user !== null) redirect(destination)
  return (
    <AuthLayout>
      <AuthForm mode="register" next={destination} />
    </AuthLayout>
  )
}
