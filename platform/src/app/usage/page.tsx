import { redirect } from 'next/navigation'

/**
 * Legacy usage link used by older Desktop builds.
 *
 * @returns no UI; the browser continues to the dashboard usage page.
 */
export default function UsageRedirect() {
  redirect('/app/usage')
}
