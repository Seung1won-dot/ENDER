// 링크 제목 가져오기. 브라우저는 다른 사이트의 HTML 을 읽을 수 없어서(CORS) 여기서 대신 받는다.
// 배포는 JWT 검증을 켠 채로: `npx supabase functions deploy preview --project-ref <ref>` (--no-verify-jwt 없이).
// 플랫폼의 JWT 검증은 anon 키도 통과시키므로, 여기서 실제 로그인 사용자인지 한 번 더 확인한다.
import { createClient } from '@supabase/supabase-js'
import { fetchTitle, isFetchableUrl } from '../_shared/html.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'POST only' })

  const authorization = req.headers.get('Authorization') ?? ''
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return json(401, { error: '로그인이 필요해요' })

  let url = ''
  try {
    const body = (await req.json()) as Record<string, unknown>
    url = typeof body.url === 'string' ? body.url.trim() : ''
  } catch {
    return json(400, { error: '본문을 읽을 수 없어요' })
  }
  if (!isFetchableUrl(url)) return json(400, { error: '가져올 수 없는 주소예요' })

  const title = await fetchTitle(url, 5000)
  return json(200, { title })
})
