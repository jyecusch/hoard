import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const KEY = 'hoard-theme'

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  const raw = window.localStorage.getItem(KEY)
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (next: Theme) => {
    window.localStorage.setItem(KEY, next)
    setThemeState(next)
  }

  return { theme, setTheme }
}

/** Inline <head> script that applies the theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`
