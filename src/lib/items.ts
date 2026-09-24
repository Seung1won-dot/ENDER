import { supabase } from './supabase'
import { detectKind, linkTitle } from './detect'
import { sanitizeFileName } from './files'

export type ItemKind = 'text' | 'link' | 'file'

export interface ItemRow {
  id: string
  user_id: string
  kind: ItemKind
  title: string | null
  content: string | null
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  source: string | null
  pinned: boolean
  expires_at: string | null
  created_at: string
}

export const ITEMS_TABLE = 'items'
export const BUCKET = 'chest'
export const SIGNED_URL_TTL = 3600
const LIST_LIMIT = 500
const TITLE_MAX = 80

export interface TextPayload {
  kind: 'text' | 'link'
  title: string
  content: string
  source: string
  expires_at: string | null
}

export function buildTextPayload(input: { text: string; source: string; expiresAt: string | null }): TextPayload {
  const trimmed = input.text.trim()
  if (!trimmed) throw new Error('넣을 내용이 없어요')
  const kind = detectKind(trimmed)
  const title = kind === 'link' ? linkTitle(trimmed) : (trimmed.split(/\r?\n/)[0] ?? '').slice(0, TITLE_MAX)
  return { kind, title, content: trimmed, source: input.source, expires_at: input.expiresAt }
}

export function buildFilePath(userId: string, fileName: string, uuid: string): string {
  return `${userId}/${uuid}-${sanitizeFileName(fileName)}`
}

function notExpiredFilter() {
  return `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
}

export async function listItems(): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('*')
    .or(notExpiredFilter())
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIST_LIMIT)
  if (error) throw error
  return (data ?? []) as ItemRow[]
}

export async function addTextItem(input: { text: string; source: string; expiresAt: string | null }): Promise<ItemRow> {
  const payload = buildTextPayload(input)
  const { data, error } = await supabase.from(ITEMS_TABLE).insert(payload).select('*').single()
  if (error) throw error
  return data as ItemRow
}

export async function addFileItem(
  file: File,
  opts: { userId: string; source: string; expiresAt: string | null },
): Promise<ItemRow> {
  const path = buildFilePath(opts.userId, file.name, crypto.randomUUID())
  const contentType = file.type || 'application/octet-stream'

  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false })
  if (up.error) throw up.error

  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .insert({
      kind: 'file',
      title: file.name,
      content: null,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: contentType,
      source: opts.source,
      expires_at: opts.expiresAt,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data as ItemRow
}

export async function deleteItem(item: ItemRow): Promise<void> {
  if (item.file_path) {
    const { error } = await supabase.storage.from(BUCKET).remove([item.file_path])
    if (error) throw error
  }
  const { error } = await supabase.from(ITEMS_TABLE).delete().eq('id', item.id)
  if (error) throw error
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from(ITEMS_TABLE).update({ pinned }).eq('id', id)
  if (error) throw error
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

export async function getDownloadUrl(path: string, fileName: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL, { download: fileName })
  if (error) throw error
  return data.signedUrl
}

export async function cleanupExpired(): Promise<number> {
  const { data, error } = await supabase
    .from(ITEMS_TABLE)
    .select('id, file_path')
    .lt('expires_at', new Date().toISOString())
  if (error) throw error
  const rows = (data ?? []) as Array<Pick<ItemRow, 'id' | 'file_path'>>
  if (rows.length === 0) return 0

  const paths = rows.map((r) => r.file_path).filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (paths.length > 0) {
    const rm = await supabase.storage.from(BUCKET).remove(paths)
    if (rm.error) throw rm.error
  }
  const del = await supabase.from(ITEMS_TABLE).delete().in('id', rows.map((r) => r.id))
  if (del.error) throw del.error
  return rows.length
}
