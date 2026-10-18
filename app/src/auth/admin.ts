/** Admin-only cloud calls. The database refuses them for anyone who is not an admin. */
import { useEffect, useState } from 'react'
import { supabase } from '../sync/supabase'
import type { TableName } from '../types'
import type { Role } from './AuthProvider'

export interface Profile { id: string; email: string; display_name: string | null; provider: string | null; avatar_url: string | null; role: Role; created_at: string }
export interface ImportEntry { id: string; imported_at: string; file_name: string; mode: 'add' | 'replace'; counts: Record<TableName, number>; profiles: { email: string } | null }

const client = () => {
  if (!supabase) throw new Error('Cloud database is not set up.')
  return supabase
}

/** Everyone, people waiting for approval first, then oldest first. */
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await client().from('profiles').select('*').order('created_at')
  if (error) throw new Error(error.message)
  return sortProfiles(data as Profile[])
}

export const sortProfiles = (rows: Profile[]): Profile[] =>
  [...rows].sort((a, b) => Number(b.role === 'pending') - Number(a.role === 'pending') || a.created_at.localeCompare(b.created_at))

/** How many people are waiting for approval (for the badge in the menu). Checks every minute. */
export function usePendingCount(enabled: boolean): number {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!enabled || !supabase) return
    let live = true
    const load = () => {
      if (!navigator.onLine) return
      void supabase!.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'pending').then(({ count }) => { if (live) setN(count ?? 0) })
    }
    load()
    const timer = setInterval(load, 60_000)
    window.addEventListener('focus', load)
    return () => { live = false; clearInterval(timer); window.removeEventListener('focus', load) }
  }, [enabled])
  return n
}

export async function setRole(id: string, role: Role) {
  const { error } = await client().from('profiles').update({ role }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function logImport(fileName: string, mode: 'add' | 'replace', counts: Record<TableName, number>) {
  const { error } = await client().from('import_log').insert({ file_name: fileName, mode, counts })
  if (error) throw new Error(error.message)
}

export async function listImports(): Promise<ImportEntry[]> {
  const { data, error } = await client().from('import_log').select('*, profiles(email)').order('imported_at', { ascending: false }).limit(20)
  if (error) throw new Error(error.message)
  return data as ImportEntry[]
}
