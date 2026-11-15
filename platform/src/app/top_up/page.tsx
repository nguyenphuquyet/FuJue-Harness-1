import { redirect } from 'next/navigation'

/**
 * Top-up link the Desktop account menu opens.
 *
 * @returns no UI; the browser continues to the billing section of settings.
 */
export default function TopUpRedirect() {
  redirect('/app/settings#billing')
}
