// 개발 서버 전용 화면 미리보기. Supabase 로그인 없이 가짜 항목으로 상자 화면·빈 상자·로그인 화면을 본다.
// 실행: npm run dev → http://localhost:5173/preview.html  (vite build 는 index.html 만 묶으므로 배포에 포함되지 않는다)
import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { LazyMotion, MotionConfig } from 'motion/react'
import '../styles/global.css'
import type { ItemRow } from '../lib/items'
import type { LiveStatus } from '../hooks/useItems'
import type { ExpiryPreset } from '../lib/expiry'
import { computeExpiresAt } from '../lib/expiry'
import { detectKind, linkTitle } from '../lib/detect'
import { countByKind, filterByKind, filterItems, mergeItem, withoutItem, sortItems, type KindFilter } from '../lib/itemsState'
import { toast } from '../lib/toast'
import { T_BASE, loadMotionFeatures } from '../lib/motion'
import { TopBar } from '../components/TopBar'
import { Composer } from '../components/Composer'
import { FilterChips } from '../components/FilterChips'
import { ItemList } from '../components/ItemList'
import { DropOverlay } from '../components/DropOverlay'
import { ToastHost } from '../components/ToastHost'
import type { ItemAction } from '../components/ItemRowView'

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

function fixtures(): ItemRow[] {
  return sortItems([
    row({ kind: 'text', content: 'ssh eclab@192.168.0.42 -p 2222', pinned: true, expires_at: null, source: '맥미니' }),
    row({ kind: 'link', title: 'Supabase Realtime 문서', content: 'https://supabase.com/docs/guides/realtime', source: 'iPhone' }),
    row({
      kind: 'text',
      content:
        '회의 메모\n- 데이터셋 경로 정리\n- 다음 주까지 학습 로그 공유\n- GPU 예약 확인\n- 발표 자료 초안\n- 참고 논문 3편 읽기\n- 실험 결과 표 업데이트\n- 코드 리뷰 요청\n- 백업 확인',
      expires_at: later(40),
    }),
    row({ kind: 'file', file_path: 'demo/photo.png', file_name: 'IMG_2041.png', file_size: 1_843_200, mime_type: 'image/png', source: 'iPhone' }),
    row({ kind: 'file', file_path: 'demo/report.pdf', file_name: '중간보고서_v3.pdf', file_size: 4_521_984, mime_type: 'application/pdf' }),
  ])
}

const ARRIVALS = ['방금 아이폰에서 넣은 메모', 'https://github.com/pbakaus/impeccable', '공유 폴더 비밀번호는 메신저 확인']

function Preview() {
  const [screen, setScreen] = useState<'chest' | 'auth'>('chest')
  const [items, setItems] = useState<ItemRow[]>(fixtures)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<LiveStatus>('live')
  const [expiry, setExpiry] = useState<ExpiryPreset>('7d')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [dragging, setDragging] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const searched = useMemo(() => filterItems(items, query), [items, query])
  const counts = useMemo(() => countByKind(searched), [searched])
  const visible = useMemo(() => filterByKind(searched, kind), [searched, kind])

  const add = useCallback(
    (text: string, source = '이 브라우저') => {
      const k = detectKind(text)
      setItems((prev) =>
        mergeItem(
          prev,
          row({
            kind: k,
            content: text,
            title: k === 'link' ? linkTitle(text) : null,
            source,
            created_at: new Date().toISOString(),
            expires_at: computeExpiresAt(expiry),
          }),
        ),
      )
    },
    [expiry],
  )

  const onAction = useCallback(async (action: ItemAction, item: ItemRow): Promise<boolean> => {
    switch (action) {
      case 'copy':
        await navigator.clipboard?.writeText(item.content ?? '').catch(() => undefined)
        return true
      case 'pin':
        setItems((prev) => mergeItem(prev, { ...item, pinned: !item.pinned }))
        return true
      case 'delete':
        setItems((prev) => withoutItem(prev, item.id))
        return true
      default:
        toast.info(`미리보기: ${action}`)
        return true
    }
  }, [])

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
            <button className="btn btn-ghost" onClick={() => add(ARRIVALS[seq % ARRIVALS.length] ?? '새 항목', 'iPhone')}>
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
            <button className="btn btn-ghost" onClick={() => setDragging((d) => !d)}>
              드롭 화면
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
          <p className="screen">
            로그인 화면은 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 있어야 열려요. 가짜 값으로도 됩니다.
          </p>
        )
      ) : (
        <>
          <TopBar status={status} query={query} onQueryChange={setQuery} onOpenSettings={() => toast.info('설정은 실제 앱에서')} />
          <main className="screen">
            <Composer
              expiry={expiry}
              onExpiryChange={setExpiry}
              onSubmitText={async (t) => {
                add(t)
                return true
              }}
              onPickFiles={(files) => toast.info(`${files.length}개 파일 (미리보기)`)}
              busy={false}
            />
            <FilterChips value={kind} counts={counts} onChange={setKind} />
            <ItemList
              items={visible}
              loading={loading}
              error={loadError}
              onRetry={reload}
              filtered={query.trim() !== '' || kind !== 'all'}
              filterKey={`${kind}|${query.trim().toLowerCase()}`}
              canShare={false}
              thumbUrls={{ 'demo/photo.png': THUMB }}
              onAction={onAction}
              onClearFilters={() => {
                setQuery('')
                setKind('all')
              }}
            />
          </main>
          <DropOverlay active={dragging} />
        </>
      )}
      <ToastHost />
    </MotionConfig>
    </LazyMotion>
  )
}

const style = document.createElement('style')
style.textContent = `.preview-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px dashed var(--border-strong);font-size:12px;color:var(--text-dim)}.preview-bar .btn{height:28px;padding:0 10px;font-size:12px}`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
)
