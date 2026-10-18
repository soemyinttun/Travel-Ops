// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, THEME_KEY, readChoice, resolve, useTheme } from './theme'

/** A controllable stand-in for the device's light/dark setting. */
function fakeSystem(startDark: boolean) {
  let dark = startDark
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() { return q.includes('dark') ? dark : false },
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  }))
  return { set(v: boolean) { dark = v; listeners.forEach((f) => f()) } }
}

function Probe() {
  const { choice, resolved, setChoice, toggle } = useTheme()
  return (
    <div>
      <output aria-label="state">{choice}/{resolved}</output>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setChoice('system')}>system</button>
      <button onClick={() => setChoice('light')}>light</button>
      <button onClick={() => setChoice('dark')}>dark</button>
    </div>
  )
}
const state = () => screen.getByLabelText('state').textContent
const isDarkPage = () => document.documentElement.classList.contains('dark')
const mount = () => render(<ThemeProvider><Probe /></ThemeProvider>)

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.removeAttribute('style')
  document.head.innerHTML = '<meta name="theme-color" content="#0f766e">'
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('theme choice', () => {
  it('with no choice saved it follows the device', () => {
    fakeSystem(true)
    mount()
    expect(state()).toBe('system/dark')
    expect(isDarkPage()).toBe(true)
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#0b1220')
  })

  it('a light device gives a light page', () => {
    fakeSystem(false)
    mount()
    expect(state()).toBe('system/light')
    expect(isDarkPage()).toBe(false)
    expect(document.querySelector('meta[name="theme-color"]')!.getAttribute('content')).toBe('#0f766e')
  })

  it('choosing light or dark beats the device, and is remembered', async () => {
    fakeSystem(true)
    mount()
    await userEvent.click(screen.getByText('light'))
    expect(state()).toBe('light/light')
    expect(isDarkPage()).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    await userEvent.click(screen.getByText('dark'))
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(isDarkPage()).toBe(true)
  })

  it('a saved choice is used the next time the app opens', () => {
    fakeSystem(false)
    localStorage.setItem(THEME_KEY, 'dark')
    mount()
    expect(state()).toBe('dark/dark')
    expect(isDarkPage()).toBe(true)
  })

  it('"Automatic" forgets the choice and follows the device again, including later changes', async () => {
    const sys = fakeSystem(false)
    localStorage.setItem(THEME_KEY, 'dark')
    mount()
    await userEvent.click(screen.getByText('system'))
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(state()).toBe('system/light')
    act(() => sys.set(true))
    expect(state()).toBe('system/dark')
    expect(isDarkPage()).toBe(true)
  })

  it('a chosen look ignores changes of the device setting', () => {
    const sys = fakeSystem(false)
    localStorage.setItem(THEME_KEY, 'light')
    mount()
    act(() => sys.set(true))
    expect(state()).toBe('light/light')
    expect(isDarkPage()).toBe(false)
  })

  it('the quick button flips what you see now', async () => {
    fakeSystem(true)
    mount()
    await userEvent.click(screen.getByText('toggle'))
    expect(state()).toBe('light/light')
    await userEvent.click(screen.getByText('toggle'))
    expect(state()).toBe('dark/dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })
})

describe('helpers', () => {
  it('ignore junk in storage', () => {
    localStorage.setItem(THEME_KEY, 'purple')
    expect(readChoice()).toBe('system')
  })
  it('resolve combines the choice and the device', () => {
    expect(resolve('system', true)).toBe('dark')
    expect(resolve('system', false)).toBe('light')
    expect(resolve('light', true)).toBe('light')
    expect(resolve('dark', false)).toBe('dark')
  })
})
