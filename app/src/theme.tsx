import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/** What the person chose. "system" follows the phone or computer's own light/dark setting. */
export type ThemeChoice = 'system' | 'light' | 'dark'
export type Resolved = 'light' | 'dark'

export const THEME_KEY = 'travelops.theme'
const DARK_BAR = '#0b1220'
const LIGHT_BAR = '#0f766e'

export function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch { return 'system' }
}

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
export const resolve = (choice: ThemeChoice, systemDark = prefersDark()): Resolved => (choice === 'system' ? (systemDark ? 'dark' : 'light') : choice)

/** Puts the look on the page: the "dark" class (see index.css) and the browser's top bar colour. */
export function applyTheme(r: Resolved) {
  const root = document.documentElement
  root.classList.toggle('dark', r === 'dark')
  root.style.colorScheme = r
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', r === 'dark' ? DARK_BAR : LIGHT_BAR)
}

interface Ctx { choice: ThemeChoice; resolved: Resolved; setChoice: (c: ThemeChoice) => void; toggle: () => void }
const ThemeContext = createContext<Ctx>({ choice: 'system', resolved: 'light', setChoice: () => {}, toggle: () => {} })
export const useTheme = () => useContext(ThemeContext)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice)
  const [systemDark, setSystemDark] = useState(prefersDark)
  const resolved = resolve(choice, systemDark)

  // Follow the device while the choice is "system".
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const q = matchMedia('(prefers-color-scheme: dark)')
    const on = () => setSystemDark(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  useEffect(() => { applyTheme(resolved) }, [resolved])

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c)
    try { if (c === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, c) } catch { /* private mode */ }
  }, [])
  // The quick button in the top bar flips between what you see now and the opposite.
  const toggle = useCallback(() => setChoice(resolved === 'dark' ? 'light' : 'dark'), [resolved, setChoice])
  const value = useMemo(() => ({ choice, resolved, setChoice, toggle }), [choice, resolved, setChoice, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
