'use client'

import { ConfigProvider } from '@arco-design/web-react'
import enUS from '@arco-design/web-react/es/locale/en-US'
import viVN from '@arco-design/web-react/es/locale/vi-VN'
import type { Locale } from '@arco-design/web-react/es/locale/interface'
import type { ReactNode } from 'react'

// vi-VN covers every message the platform renders; the English bundle fills
// entries the Vietnamese file does not translate yet, such as ColorPicker.
const locale: Locale = { ...enUS, ...viVN }

/**
 * Apply the Vietnamese Arco locale to every client component.
 *
 * @param props - the application tree.
 * @returns the configured provider.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
  return <ConfigProvider locale={locale}>{children}</ConfigProvider>
}
