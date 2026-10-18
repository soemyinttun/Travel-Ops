// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))
vi.mock('./AuthProvider', () => ({ useAuth: () => auth.current }))

import { AuthGate } from './AuthGate'
import type { AuthMethod } from './providers'

const makeAuth = (over: Record<string, unknown> = {}) => ({
  mode: 'cloud', status: 'signedOut', linkError: null, email: undefined,
  signIn: vi.fn(async () => null as string | null),
  signInWithGoogle: vi.fn(async () => null as string | null),
  sendMagicLink: vi.fn(async () => null as string | null),
  signUp: vi.fn(async () => ({ error: null as string | null, needsConfirmation: true })),
  sendPasswordReset: vi.fn(async () => null as string | null),
  setPassword: vi.fn(async () => null as string | null),
  signOut: vi.fn(async () => true), refreshRole: vi.fn(async () => {}),
  ...over,
})
const open = (methods: AuthMethod[], over: Record<string, unknown> = {}) => {
  auth.current = makeAuth(over)
  render(<AuthGate methods={methods}>app content</AuthGate>)
  return auth.current as ReturnType<typeof makeAuth>
}
const button = (name: string | RegExp) => screen.getByRole('button', { name })
const maybeButton = (name: string | RegExp) => screen.queryByRole('button', { name })

beforeEach(() => { auth.current = makeAuth() })
afterEach(cleanup)

describe('sign-in screen shows exactly the methods that are turned on', () => {
  it('password only (the default)', () => {
    open(['password'])
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.getByLabelText('Password')).toBeTruthy()
    expect(maybeButton(/Google/)).toBeNull()
    expect(maybeButton(/sign-in link/)).toBeNull()
    expect(maybeButton('Create account')).toBeNull()
    expect(screen.getByText(/Ask your admin to invite you/)).toBeTruthy()
  })

  it('all options', () => {
    open(['password', 'google', 'magiclink', 'signup'])
    expect(button('Continue with Google')).toBeTruthy()
    expect(button('Email me a sign-in link')).toBeTruthy()
    expect(button('Create account')).toBeTruthy()
    expect(button('Forgot password?')).toBeTruthy()
    expect(screen.queryByText(/Ask your admin to invite you/)).toBeNull()
  })
})

describe('signing in', () => {
  it('with a password; a wrong password shows a plain message', async () => {
    const a = open(['password'], { signIn: vi.fn(async () => 'Wrong email or password.') })
    await userEvent.type(screen.getByLabelText('Email'), ' me@x.com ')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(button('Sign in'))
    expect(a.signIn).toHaveBeenCalledWith('me@x.com', 'secret123')
    expect((await screen.findByRole('alert')).textContent).toBe('Wrong email or password.')
  })

  it('with Google', async () => {
    const a = open(['password', 'google'])
    await userEvent.click(button('Continue with Google'))
    expect(a.signInWithGoogle).toHaveBeenCalledTimes(1)
  })

  it('with Google, a turned-off provider shows the message from the app', async () => {
    open(['password', 'google'], { signInWithGoogle: vi.fn(async () => "This sign-in method isn't turned on yet. Ask your admin.") })
    await userEvent.click(button('Continue with Google'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/isn't turned on yet/)
  })

  it('with an email link', async () => {
    const a = open(['password', 'magiclink'])
    await userEvent.click(button('Email me a sign-in link'))
    expect(screen.getByRole('heading', { name: 'Sign in with an email link' })).toBeTruthy()
    expect(screen.queryByLabelText('Password')).toBeNull()
    await userEvent.type(screen.getByLabelText('Email'), 'me@x.com')
    await userEvent.click(button('Send sign-in link'))
    expect(a.sendMagicLink).toHaveBeenCalledWith('me@x.com')
    expect((await screen.findByRole('status')).textContent).toMatch(/sent a sign-in link to me@x\.com/)
    await userEvent.click(button('Back to sign in'))
    expect(screen.getByLabelText('Password')).toBeTruthy()
  })
})

describe('creating an account', () => {
  const fill = async (pw: string, again: string) => {
    await userEvent.click(button('Create account'))
    await userEvent.type(screen.getByLabelText('Email'), 'new@x.com')
    await userEvent.type(screen.getByLabelText('Password'), pw)
    await userEvent.type(screen.getByLabelText('Type it again'), again)
  }

  it('checks the two passwords match before asking the cloud', async () => {
    const a = open(['password', 'signup'])
    await fill('longenough1', 'different22')
    await userEvent.click(button('Create account'))
    expect((await screen.findByRole('alert')).textContent).toMatch(/not the same/)
    expect(a.signUp).not.toHaveBeenCalled()
  })

  it('creates the account and explains confirmation and approval', async () => {
    const a = open(['password', 'signup'])
    await fill('longenough1', 'longenough1')
    await userEvent.click(button('Create account'))
    await waitFor(() => expect(a.signUp).toHaveBeenCalledWith('new@x.com', 'longenough1'))
    expect((await screen.findByRole('status')).textContent).toMatch(/confirmation link.*approve your account/)
  })
})

describe('other states', () => {
  it('shows a problem with an email link on the sign-in screen', () => {
    open(['password'], { linkError: 'This email link has expired or was already used.' })
    expect(screen.getByRole('alert').textContent).toMatch(/expired or was already used/)
  })
  it('asks a person who opened an invite to choose a password', () => {
    open(['password'], { status: 'setPassword', email: 'new@x.com' })
    expect(screen.getByRole('heading', { name: 'Choose your password' })).toBeTruthy()
  })
  it('shows "Waiting for approval" to a pending person', () => {
    open(['password'], { status: 'pending', email: 'new@x.com' })
    expect(screen.getByRole('heading', { name: 'Waiting for approval' })).toBeTruthy()
  })
  it('shows the app once approved', () => {
    open(['password'], { status: 'ready' })
    expect(screen.getByText('app content')).toBeTruthy()
  })
})
