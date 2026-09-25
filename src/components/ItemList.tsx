import type { ItemRow } from '../lib/items'
import { PASTE_KEY } from '../lib/keys'
import { ItemRowView, type ItemAction } from './ItemRowView'
import { Icon, Mark } from './Icon'

interface Props {
  items: ItemRow[]
  loading: boolean
  /** 검색어나 종류 필터가 걸려 있는지 (비어 있을 때 안내가 달라진다) */
  filtered: boolean
  canShare: boolean
  thumbUrls: Record<string, string | null>
  /** 첫 화면 이후에 도착한 항목 id */
  freshIds: ReadonlySet<string>
  onAction: (action: ItemAction, item: ItemRow) => void
  onClearFilters: () => void
}

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

export function ItemList({ items, loading, filtered, canShare, thumbUrls, freshIds, onAction, onClearFilters }: Props) {
  if (loading) return <Skeleton />

  if (items.length === 0) {
    if (filtered) {
      return (
        <div className="empty">
          <p className="empty-title">맞는 항목이 없어요</p>
          <p className="small">검색어나 종류를 바꿔 보세요.</p>
          <div className="empty-actions">
            <button type="button" className="btn btn-ghost" onClick={onClearFilters}>
              필터 지우기
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="empty">
        <Mark size={48} />
        <p className="empty-title">상자가 비어 있어요</p>
        <ul className="empty-tips">
          <li className="tip">
            <Icon name="text" size={16} />
            위 입력창에 적고
            <kbd>Enter</kbd>
          </li>
          <li className="tip">
            <Icon name="clipboard" size={16} />
            화면 어디서든 붙여넣기
            <kbd>{PASTE_KEY}</kbd>
          </li>
          <li className="tip">
            <Icon name="upload" size={16} />
            파일을 창에 끌어다 놓기
          </li>
        </ul>
      </div>
    )
  }

  const pinned = items.filter((i) => i.pinned)
  const rest = items.filter((i) => !i.pinned)

  const renderGroup = (label: string | null, list: ItemRow[]) => {
    if (list.length === 0) return null
    return (
      <section className="group">
        {label && <h2 className="group-label">{label}</h2>}
        <ul className="rows">
          {list.map((item) => (
            <ItemRowView
              key={item.id}
              item={item}
              canShare={canShare}
              thumbUrl={item.file_path ? thumbUrls[item.file_path] : null}
              isNew={freshIds.has(item.id)}
              onAction={onAction}
            />
          ))}
        </ul>
      </section>
    )
  }

  return (
    <div className="list">
      {renderGroup('고정됨', pinned)}
      {renderGroup(pinned.length > 0 ? '최근' : null, rest)}
    </div>
  )
}
