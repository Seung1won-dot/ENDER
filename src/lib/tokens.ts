import { supabase } from './supabase'

export const TOKENS_TABLE = 'share_tokens'
export const TOKEN_PREFIX = 'ec_'
const TOKEN_BYTES = 32

export interface ShareTokenRow {
  id: string
  label: string | null
  created_at: string
  last_used_at: string | null
}

export function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return hex(digest)
}

export function generateToken(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  return TOKEN_PREFIX + base64url(random(TOKEN_BYTES))
}

export async function createShareToken(label: string): Promise<{ token: string; row: ShareTokenRow }> {
  const token = generateToken()
  const token_hash = await sha256Hex(token)
  const { data, error } = await supabase
    .from(TOKENS_TABLE)
    .insert({ token_hash, label: label.trim() || null })
    .select('id, label, created_at, last_used_at')
    .single()
  if (error) throw error
  return { token, row: data as ShareTokenRow }
}

export async function listShareTokens(): Promise<ShareTokenRow[]> {
  const { data, error } = await supabase
    .from(TOKENS_TABLE)
    .select('id, label, created_at, last_used_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ShareTokenRow[]
}

export async function revokeShareToken(id: string): Promise<void> {
  const { error } = await supabase.from(TOKENS_TABLE).delete().eq('id', id)
  if (error) throw error
}
