// 링크 제목 가져오기. 브라우저는 다른 사이트의 HTML 을 읽을 수 없어서(CORS) 여기서 대신 받는다.
// 배포는 JWT 검증을 켠 채로: `npx supabase functions deploy preview --project-ref <ref>` (--no-verify-jwt 없이).
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
