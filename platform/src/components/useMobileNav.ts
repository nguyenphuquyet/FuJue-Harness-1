'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/** State and handlers for a phone-width sidebar drawer. */
export interface MobileNav {
  readonly open: boolean
  readonly toggle: () => void
  readonly close: () => void
}

/**
 * Drive the off-canvas sidebar used on narrow screens.
 *
 * Closes on navigation, Escape, and when the component unmounts; locks page
 * scrolling while the drawer covers the content.
 *
 * @returns the drawer state and its toggles.
 */
export function useMobileNav(): MobileNav {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  return {
    open,
    toggle: () => setOpen(current => !current),
    close: () => setOpen(false),
  }
}
