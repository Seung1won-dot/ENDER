import { createClient } from '@supabase/supabase-js'
import {
  MAX_FILE_BYTES,
  buildTextPayload,
  computeExpiresAt,
  isBlockedFile,
  sanitizeFileName,
  sha256Hex,
} from './rules.ts'

const BUCKET = 'chest'
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-share-token, x-source',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

interface Incoming {
  texts: string[]
  title: string | null
  files: File[]
  expiresIn: string | null
}

async function parseBody(req: Request): Promise<Incoming> {
  const ct = req.headers.get('content-type') ?? ''
  const out: Incoming = { texts: [], title: null, files: [], expiresIn: null }

  if (ct.includes('application/json')) {
    const body = (await req.json()) as Record<string, unknown>
    for (const key of ['text', 'url']) {
      const v = body[key]
      if (typeof v === 'string' && v.trim()) out.texts.push(v)
    }
    if (typeof body.title === 'string') out.title = body.title
    if (typeof body.expires_in === 'string') out.expiresIn = body.expires_in
    return out
  }

  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData()
    for (const key of ['text', 'url']) {
      const v = form.get(key)
      if (typeof v === 'string' && v.trim()) out.texts.push(v)
    }
    const title = form.get('title')
    if (typeof title === 'string') out.title = title
    const exp = form.get('expires_in')
    if (typeof exp === 'string') out.expiresIn = exp
    for (const key of ['file', 'files[]', 'files']) {
      for (const v of form.getAll(key)) {
        if (v instanceof File && v.size > 0) out.files.push(v)
      }
    }
    return out
  }

  const raw = (await req.text()).trim()
  if (raw) out.texts.push(raw)
  return out
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' })

  const token = req.headers.get('x-share-token')
  if (!token) return json(401, { ok: false, error: 'X-Share-Token 헤더가 없어요' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const tokenHash = await sha256Hex(token)
  const { data: tok, error: tokErr } = await admin
    .from('share_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (tokErr) return json(500, { ok: false, error: tokErr.message })
  if (!tok) return json(401, { ok: false, error: '유효하지 않은 토큰이에요' })

  // 토큰 검증 직후에 기록. 뒤에서 일부 실패해도 "사용됨" 은 남아야 한다.
  await admin.from('share_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tok.id)

  let incoming: Incoming
  try {
    incoming = await parseBody(req)
  } catch (e) {
    return json(400, { ok: false, error: `본문을 읽을 수 없어요: ${e instanceof Error ? e.message : String(e)}` })
  }
  if (incoming.texts.length === 0 && incoming.files.length === 0) {
    return json(400, { ok: false, error: '넣을 내용이 없어요' })
  }

  for (const f of incoming.files) {
    if (isBlockedFile(f.name)) return json(400, { ok: false, error: `실행 파일은 넣을 수 없어요: ${f.name}` })
    if (f.size > MAX_FILE_BYTES) return json(400, { ok: false, error: `50MB 를 넘는 파일이에요: ${f.name}` })
  }

  const source = (req.headers.get('x-source')?.trim() || 'iPhone 단축어').slice(0, 40)
  const expiresAt = computeExpiresAt(incoming.expiresIn)
  const inserted: string[] = []

  for (const text of incoming.texts) {
    const p = buildTextPayload(text)
    const { data, error } = await admin
      .from('items')
      .insert({
        user_id: tok.user_id,
        kind: p.kind,
        title: (incoming.title?.trim() || p.title).slice(0, 80),
        content: p.content,
        source,
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (error) return json(500, { ok: false, error: error.message, inserted })
    inserted.push(data.id as string)
  }

  for (const f of incoming.files) {
    const path = `${tok.user_id}/${crypto.randomUUID()}-${sanitizeFileName(f.name)}`
    const contentType = f.type || 'application/octet-stream'
    const up = await admin.storage.from(BUCKET).upload(path, f, { contentType, upsert: false })
    if (up.error) return json(500, { ok: false, error: `업로드 실패: ${up.error.message}`, inserted })

    const { data, error } = await admin
      .from('items')
      .insert({
        user_id: tok.user_id,
        kind: 'file',
        title: f.name,
        file_path: path,
        file_name: f.name,
        file_size: f.size,
        mime_type: contentType,
        source,
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (error) {
      await admin.storage.from(BUCKET).remove([path])
      return json(500, { ok: false, error: error.message, inserted })
    }
    inserted.push(data.id as string)
  }

  return json(200, { ok: true, inserted })
})
