import { useEffect, useRef, type MouseEvent } from 'react'
import { AnimatePresence } from 'motion/react'
import type { ItemRow } from '../lib/items'
import { PASTE_KEY } from '../lib/keys'
import { playChestIntro } from '../lib/intro'
import { groupByDay } from '../lib/preview'
import { ItemRowView, type ItemActionHandler } from './ItemRowView'
import { Icon, Mark } from './Icon'

export interface UploadJob {
  id: string
  name: string
  size: number
}

interface Props {
  items: ItemRow[]
  /** 고정 항목을 맨 위 "고정됨" 묶음으로 따로 보여 줄지 (전체 보기에서만) */
  splitPinned: boolean
  loading: boolean
  error?: string | null
  onRetry?: () => void
  filtered: boolean
  filterKey: string
  thumbUrls: Record<string, string | null>
  activeId: string | null
  checked: Set<string>
  fresh: Set<string>
  copiedId: string | null
  uploads: UploadJob[]
  onOpen: (item: ItemRow, e: MouseEvent) => void
  onToggleCheck: (item: ItemRow, e: MouseEvent) => void
  onAction: ItemActionHandler
  onClearFilters: () => void
}

const STAGGER = 0.025
const STAGGER_MAX = 10

function Skeleton() {
  return (
    <div className="list" role="status" aria-busy="true" aria-label="불러오는 중">
      <div className="group-head">
        <span className="skel" style={{ width: 48, height: 10 }} />
      </div>
      {[64, 42, 56, 38].map((w, i) => (
        <div key={i} className="skel-row">
          <span className="skel skel-tile" />
          <div className="skel-lines">
            <span className="skel" style={{ width: `${w}%` }} />
            <span className="skel" style={{ width: '24%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 빈 상자. 처음 보일 때 한 번 뚜껑이 들렸다 닫히고 넣는 방법이 차례로 나타난다(Anime.js). */
function EmptyChest() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => (root.current ? playChestIntro(root.current) : undefined), [])

  return (
    <div className="empty" ref={root}>
      <Mark size={44} />
      <p className="empty-title" data-intro>
        상자가 비어 있어요
      </p>
      <p className="empty-sub" data-intro>
        여기 넣은 글·링크·파일은 로그인한 모든 기기에 바로 나타나요.
      </p>
      <ul className="empty-tips">
        <li className="tip" data-intro>
          <Icon name="clipboard" size={16} />
          <span>화면 어디서든 붙여넣기</span>
          <kbd>{PASTE_KEY}</kbd>
        </li>
        <li className="tip" data-intro>
          <Icon name="upload" size={16} />
          <span>파일·사진을 창에 끌어다 놓기</span>
        </li>
        <li className="tip" data-intro>
          <Icon name="text" size={16} />
          <span>위 입력창에 적고</span>
          <kbd>Enter</kbd>
        </li>
      </ul>
    </div>
  )
}

export function ItemList(props: Props) {
  const { items, splitPinned, loading, error, onRetry, filtered, filterKey, uploads } = props

  const introDone = useRef(false)
  const intro = !loading && !introDone.current
  useEffect(() => {
    if (!loading) introDone.current = true
  }, [loading])

  if (loading) return <Skeleton />

  if (items.length === 0 && uploads.length === 0) {
    if (error) {
      return (
        <div className="empty" role="alert">
          <p className="empty-title">목록을 불러오지 못했어요</p>
          <p className="empty-sub">{error}</p>
          {onRetry && (
            <div className="empty-actions">
              <button type="button" className="btn btn-ghost" onClick={onRetry}>
                다시 시도
              </button>
            </div>
          )}
        </div>
      )
    }
    if (filtered) {
      return (
        <div className="empty">
          <p className="empty-title">맞는 항목이 없어요</p>
          <p className="empty-sub">검색어나 보기를 바꿔 보세요.</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-ghost" onClick={props.onClearFilters}>
              필터 지우기
            </button>
          </div>
        </div>
      )
    }
    return <EmptyChest />
  }

  const pinned = splitPinned ? items.filter((i) => i.pinned) : []
  const rest = splitPinned ? items.filter((i) => !i.pinned) : items
  const groups = [
    ...(pinned.length > 0 ? [{ key: 'pinned', label: '고정됨', items: pinned }] : []),
    ...groupByDay(rest),
  ]

  let index = 0
  const renderRow = (item: ItemRow) => {
    const delay = intro ? Math.min(index, STAGGER_MAX) * STAGGER : 0
    index += 1
    return (
      <ItemRowView
        key={item.id}
        item={item}
        thumbUrl={item.file_path ? props.thumbUrls[item.file_path] : null}
        active={props.activeId === item.id}
        checked={props.checked.has(item.id)}
        selecting={props.checked.size > 0}
        fresh={props.fresh.has(item.id)}
        copied={props.copiedId === item.id}
        enterDelay={delay}
        onOpen={props.onOpen}
        onToggleCheck={props.onToggleCheck}
        onAction={props.onAction}
      />
    )
  }

  return (
    <div className="list" key={filterKey}>
      {uploads.length > 0 && (
        <section className="group" aria-label="올리는 중">
          <h2 className="group-head">
            올리는 중<span className="group-count">{uploads.length}</span>
          </h2>
          <ul className="rows">
            {uploads.map((u) => (
              <li key={u.id} className="row is-uploading">
                <span className="tile">
                  <span className="spinner" aria-hidden="true" />
                </span>
                <div className="row-body">
                  <div className="row-title">
                    <span className="row-title-text">{u.name}</span>
                  </div>
                  <div className="row-sub">업로드 중…</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.key} className="group" aria-label={g.label}>
          <h2 className="group-head">
            {g.label}
            <span className="group-count">{g.items.length}</span>
          </h2>
          <ul className="rows">
            <AnimatePresence initial={intro} mode="popLayout">
              {g.items.map(renderRow)}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  )
}
