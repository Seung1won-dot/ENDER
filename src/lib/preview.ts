import { supabase } from './supabase'
import { setTitle, type ItemRow } from './items'

const TITLE_MAX = 80

/** Edge Function `preview` 에 페이지 제목을 물어본다. 실패는 전부 null (제목은 부가 정보). */
export async function fetchLinkTitle(url: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ title: string | null }>('preview', { body: { url } })
    if (error || !data) return null
    const t = typeof data.title === 'string' ? data.title.trim() : ''
    return t ? t.slice(0, TITLE_MAX) : null
  } catch {
    return null
  }
}

/** 링크 항목의 제목을 페이지 제목으로 바꾼다. 바뀐 행을 돌려주고, 바뀔 게 없으면 null. */
export async function enrichLinkTitle(row: ItemRow): Promise<ItemRow | null> {
  if (row.kind !== 'link' || !row.content) return null
  const title = await fetchLinkTitle(row.content)
  if (!title || title === row.title) return null
  try {
    await setTitle(row.id, title)
    return { ...row, title }
  } catch {
    return null
  }
}
