// 개발 서버 전용 화면 미리보기. Supabase 로그인 없이 가짜 항목으로 상자 화면·빈 상자·로그인 화면을 본다.
// 실행: npm run dev → http://localhost:5173/preview.html  (vite build 는 index.html 만 묶으므로 배포에 포함되지 않는다)
import React, { Suspense, lazy, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { LazyMotion, MotionConfig } from 'motion/react'
import '../styles/global.css'
import type { ItemRow } from '../lib/items'
import type { LiveStatus } from '../hooks/useItems'
import type { ExpiryPreset } from '../lib/expiry'
import { computeExpiresAt } from '../lib/expiry'
import { buildPatch, buildTextPayload } from '../lib/items'
import { mergeItem, withoutItem, sortItems } from '../lib/itemsState'
import type { ChestApi } from '../lib/api'
import { toast } from '../lib/toast'
import { T_BASE, loadMotionFeatures } from '../lib/motion'
import { ChestView } from '../components/ChestView'
import { ToastHost } from '../components/ToastHost'
import { initTheme } from '../lib/theme'

initTheme()

// 로그인 화면은 supabase 클라이언트를 import 하므로 .env(또는 가짜 VITE_SUPABASE_* 값)가 있을 때만 불러온다.
const AuthScreen = lazy(() => import('../components/AuthScreen').then((m) => ({ default: m.AuthScreen })))
const hasEnv = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

const MIN = 60_000
const ago = (m: number) => new Date(Date.now() - m * MIN).toISOString()
const later = (m: number) => new Date(Date.now() + m * MIN).toISOString()
const THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#2b3b36"/><circle cx="22" cy="22" r="7" fill="#4fd1a5"/><path d="M0 52 22 34l14 10 10-8 18 14v12H0z" fill="#1c1d26"/></svg>',
  )

let seq = 0
function row(p: Partial<ItemRow>): ItemRow {
  seq += 1
  return {
    id: `demo-${seq}`,
    user_id: 'demo',
    kind: 'text',
    title: null,
    content: null,
    file_path: null,
    file_name: null,
    file_size: null,
    mime_type: null,
    source: '연구실 PC',
    pinned: false,
    expires_at: later(6 * 24 * 60),
    created_at: ago(seq * 7),
    ...p,
  }
}

const MEMO_TXT = `# 실험 로그 2026-11-05

epoch 12  loss 0.4132  val_acc 0.8811
epoch 13  loss 0.4021  val_acc 0.8840
epoch 14  loss 0.3987  val_acc 0.8852

다음: lr 3e-4 -> 1e-4 로 낮춰서 다시
`
// 아주 작은 1쪽짜리 PDF
const PDF_SRC = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 22 Tf 40 200 Td (Interim report v3 - preview) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`

const BLOBS: Record<string, string> = {
  'demo/photo.png': THUMB,
  'demo/report.pdf': URL.createObjectURL(new Blob([PDF_SRC], { type: 'application/pdf' })),
  'demo/train.log': URL.createObjectURL(new Blob([MEMO_TXT], { type: 'text/plain' })),
  'demo/archive.zip': URL.createObjectURL(new Blob(['zip'], { type: 'application/zip' })),
}

function fixtures(): ItemRow[] {
  seq = 0
  return sortItems([
    row({ kind: 'text', content: 'ssh eclab@192.168.0.42 -p 2222', pinned: true, expires_at: null, source: '맥미니' }),
    row({ kind: 'link', title: 'Supabase Realtime 문서', content: 'https://supabase.com/docs/guides/realtime', source: 'iPhone' }),
    row({
      kind: 'text',
      content:
        '회의 메모\n- 데이터셋 경로 정리\n- 다음 주까지 학습 로그 공유\n- GPU 예약 확인\n- 발표 자료 초안\n- 참고 논문 3편 읽기',
      expires_at: later(40),
    }),
    row({ kind: 'file', file_path: 'demo/photo.png', file_name: 'IMG_2041.png', file_size: 1_843_200, mime_type: 'image/svg+xml', source: 'iPhone' }),
    row({ kind: 'file', file_path: 'demo/report.pdf', file_name: '중간보고서_v3.pdf', file_size: 4_521_984, mime_type: 'application/pdf', created_at: ago(60 * 26) }),
    row({ kind: 'file', file_path: 'demo/train.log', file_name: 'train.log', file_size: 18_204, mime_type: 'text/plain', source: '맥미니', created_at: ago(60 * 27) }),
    row({ kind: 'link', title: 'github.com/Seung1won-dot/ENDER', content: 'https://github.com/Seung1won-dot/ENDER', created_at: ago(60 * 24 * 3), expires_at: null }),
    row({ kind: 'file', file_path: 'demo/archive.zip', file_name: 'dataset_sample.zip', file_size: 23_812_331, mime_type: 'application/zip', created_at: ago(60 * 24 * 4) }),
  ])
}

const ARRIVALS = ['방금 아이폰에서 넣은 메모', 'https://github.com/pbakaus/impeccable', '공유 폴더 비밀번호는 메신저 확인']

function Preview() {
  const [screen, setScreen] = useState<'chest' | 'auth'>('chest')
  const [items, setItems] = useState<ItemRow[]>(fixtures)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<LiveStatus>('live')
  const [expiry, setExpiry] = useState<ExpiryPreset>('7d')
  const [loadError, setLoadError] = useState<string | null>(null)

  const api = useMemo<ChestApi>(() => {
    const wait = () => new Promise((r) => setTimeout(r, 250))
    return {
      async addText(text, o) {
        await wait()
        const p = buildTextPayload({ text, source: o.source, expiresAt: o.expiresAt })
        return row({ ...p, created_at: new Date().toISOString() })
      },
      async addFile(file, o) {
        await new Promise((r) => setTimeout(r, 900))
        const path = `local/${crypto.randomUUID()}`
        BLOBS[path] = URL.createObjectURL(file)
        return row({
          kind: 'file',
          title: file.name,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          source: o.source,
          expires_at: o.expiresAt,
          created_at: new Date().toISOString(),
        })
      },
      async update(id, patch) {
        await wait()
        let out: ItemRow | undefined
        setItems((prev) => {
          const cur = prev.find((i) => i.id === id)
          if (!cur) return prev
          out = { ...cur, ...(buildPatch(patch) as Partial<ItemRow>) }
          return mergeItem(prev, out)
        })
        await wait()
        if (!out) throw new Error('항목이 없어요')
        return out
      },
      async remove(item) {
        setItems((prev) => withoutItem(prev, item.id))
      },
      async viewUrl(path) {
        const u = BLOBS[path]
        if (!u) throw new Error('파일이 없어요')
        return u
      },
      async downloadUrl(path) {
        return this.viewUrl(path)
      },
    }
  }, [])

  const arrive = () => {
    const text = ARRIVALS[seq % ARRIVALS.length] ?? '새 항목'
    const p = buildTextPayload({ text, source: 'iPhone', expiresAt: computeExpiresAt(expiry) })
    setItems((prev) => mergeItem(prev, row({ ...p, created_at: new Date().toISOString() })))
  }

  const reload = () => {
    setLoadError(null)
    setLoading(true)
    window.setTimeout(() => {
      setItems(fixtures())
      setLoading(false)
    }, 700)
  }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user" transition={T_BASE}>
        <nav className="preview-bar" aria-label="미리보기 조작">
          <strong>미리보기</strong>
          <button className="btn btn-ghost" onClick={() => setScreen(screen === 'chest' ? 'auth' : 'chest')}>
            {screen === 'chest' ? '로그인 화면' : '상자 화면'}
          </button>
          {screen === 'chest' && (
            <>
              <button className="btn btn-ghost" onClick={arrive}>
                다른 기기에서 도착
              </button>
              <button className="btn btn-ghost" onClick={reload}>
                다시 불러오기
              </button>
              <button className="btn btn-ghost" onClick={() => setItems([])}>
                비우기
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setItems([])
                  setLoadError('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요')
                }}
              >
                불러오기 실패
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setStatus((s) => (s === 'live' ? 'connecting' : s === 'connecting' ? 'offline' : 'live'))}
              >
                연결 상태
              </button>
              <button className="btn btn-ghost" onClick={() => toast.error('업로드 실패: 네트워크 오류')}>
                오류 토스트
              </button>
            </>
          )}
        </nav>

        {screen === 'auth' ? (
          hasEnv ? (
            <Suspense fallback={null}>
              <AuthScreen />
            </Suspense>
          ) : (
            <p style={{ padding: 24 }}>
              로그인 화면은 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 있어야 열려요. 가짜 값으로도 됩니다.
            </p>
          )
        ) : (
          <ChestView
            items={items}
            loading={loading}
            error={loadError}
            status={status}
            reload={reload}
            upsertLocal={(r) => setItems((prev) => mergeItem(prev, r))}
            removeLocal={(id) => setItems((prev) => withoutItem(prev, id))}
            api={api}
            email="me@eclab.kr"
            expiry={expiry}
            onExpiryChange={setExpiry}
            onOpenSettings={() => toast.info('설정은 실제 앱에서 열려요')}
          />
        )}
        <ToastHost />
      </MotionConfig>
    </LazyMotion>
  )
}

const style = document.createElement('style')
style.textContent = `.preview-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:80;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px 10px;border:1px dashed var(--border-strong);border-radius:10px;background:var(--bg-elev);font-size:12px;color:var(--text-dim);max-width:calc(100vw - 24px)}.preview-bar .btn{height:26px;padding:0 9px;font-size:12px}`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
)
