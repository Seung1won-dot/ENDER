import { useEffect, useRef } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { ItemRow } from '../lib/items'
import { PASTE_KEY } from '../lib/keys'
import { T_LAYOUT } from '../lib/motion'
import { playChestIntro } from '../lib/intro'
import { ItemRowView, type ItemActionHandler } from './ItemRowView'
import { Icon, Mark } from './Icon'

interface Props {
  items: ItemRow[]
  loading: boolean
  /** 검색어나 종류 필터가 걸려 있는지 (비어 있을 때 안내가 달라진다) */
  filtered: boolean
  /** 검색어·종류가 바뀌면 달라지는 값. 바뀌면 목록을 연출 없이 새로 그린다(타이핑마다 수백 행이 움직이지 않게). */
  filterKey: string
  canShare: boolean
  thumbUrls: Record<string, string | null>
  onAction: ItemActionHandler
  onClearFilters: () => void
}

/** 첫 목록을 차례로 보여 줄 때 행 사이 간격(초)과 연출을 받는 최대 행 수 */
const STAGGER = 0.03
const STAGGER_MAX = 8

function Skeleton() {
  return (
    <div className="list" role="status" aria-busy="true" aria-label="불러오는 중">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skel-row">
          <div className="skel skel-kind" />
          <div>
            <div className="skel skel-line" style={{ width: i === 1 ? '42%' : '64%' }} />
            <div className="skel skel-line" style={{ width: '28%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** 빈 상자. 처음 보일 때 한 번 상자 뚜껑이 들렸다 닫히고 넣는 방법이 차례로 나타난다(Anime.js). */
function EmptyChest() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => (root.current ? playChestIntro(root.current) : undefined), [])

  return (
    <div className="empty" ref={root}>
      <Mark size={48} />
      <p className="empty-title" data-intro>
        상자가 비어 있어요
      </p>
      <p className="empty-sub" data-intro>
        여기에 넣은 것은 다른 기기에서도 바로 보여요.
      </p>
      <ul className="empty-tips">
        <li className="tip" data-intro>
          <Icon name="text" size={16} />
          <span>위 입력창에 적고</span>
          <kbd>Enter</kbd>
        </li>
        <li className="tip" data-intro>
          <Icon name="clipboard" size={16} />
          <span>화면 어디서든 붙여넣기</span>
          <kbd>{PASTE_KEY}</kbd>
        </li>
        <li className="tip" data-intro>
          <Icon name="upload" size={16} />
          <span>파일을 창에 끌어다 놓기</span>
        </li>
      </ul>
    </div>
  )
}

export function ItemList({ items, loading, filtered, filterKey, canShare, thumbUrls, onAction, onClearFilters }: Props) {
  // 첫 목록만 위에서부터 차례로(최대 8행, 0.03초 간격). 이후 도착·재배치는 한 행씩.
  const introDone = useRef(false)
  const intro = !loading && !introDone.current
  useEffect(() => {
    if (!loading) introDone.current = true
  }, [loading])
  // 필터가 막 바뀐 렌더에서는 새로 그려지는 행에 등장 연출을 주지 않는다.
  const prevKey = useRef(filterKey)
  const keyChanged = prevKey.current !== filterKey
  useEffect(() => {
    prevKey.current = filterKey
  }, [filterKey])

  if (loading) return <Skeleton />

  if (items.length === 0) {
    if (filtered) {
      return (
        <m.div className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="empty-title">맞는 항목이 없어요</p>
          <p className="empty-sub">검색어나 종류를 바꿔 보세요.</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-ghost" onClick={onClearFilters}>
              필터 지우기
            </button>
          </div>
        </m.div>
      )
    }
    return <EmptyChest />
  }

  const pinned = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned)

  // 고정됨/최근 두 묶음을 한 목록(ul)에 두어야 고정할 때 행이 묶음 사이를 미끄러져 옮겨 간다.
  let index = 0
  const rows = (list: ItemRow[]) =>
    list.map((item) => {
      const delay = intro ? Math.min(index, STAGGER_MAX) * STAGGER : 0
      index += 1
      return (
        <ItemRowView
          key={item.id}
          item={item}
          canShare={canShare}
          thumbUrl={item.file_path ? thumbUrls[item.file_path] : null}
          enterDelay={delay}
          onAction={onAction}
        />
      )
    })

  const label = (key: string, text: string, count: number) => (
    <m.li
      key={key}
      className="group-label"
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ layout: T_LAYOUT }}
    >
      <h2>
        {text}
        <span className="group-count">{count}</span>
      </h2>
    </m.li>
  )

  return (
    <div className="list">
      <ul className="rows" key={filterKey}>
        <AnimatePresence initial={!keyChanged} mode="popLayout">
          {pinned.length > 0 && label('h-pinned', '고정됨', pinned.length)}
          {rows(pinned)}
          {pinned.length > 0 && rest.length > 0 && label('h-recent', '최근', rest.length)}
          {rows(rest)}
        </AnimatePresence>
      </ul>
    </div>
  )
}
