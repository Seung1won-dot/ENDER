import { useMemo } from 'react'
import type { ItemRow } from '../lib/items'
import { PASTE_KEY } from '../lib/keys'
import { useRowKeys } from '../hooks/useRowKeys'
import { ItemRowView, type ActionExtra, type ItemAction } from './ItemRowView'
import { Icon, Mark } from './Icon'

interface Props {
  items: ItemRow[]
  loading: boolean
  /** 서버 조회 실패 메시지 (있으면 빈 화면 대신 오류 상태) */
  error: string | null
  online: boolean
  /** 검색어나 종류 필터가 걸려 있는지 (비어 있을 때 안내가 달라진다) */
  filtered: boolean
  canShare: boolean
  thumbUrls: Record<string, string | null>
  /** 첫 화면 이후에 도착한 항목 id */
  freshIds: ReadonlySet<string>
  onAction: (action: ItemAction, item: ItemRow, extra?: ActionExtra) => void
  onClearFilters: () => void
  onRetry: () => void
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

function EmptyState({
  error,
  online,
  filtered,
  onClearFilters,
  onRetry,
}: Pick<Props, 'error' | 'online' | 'filtered' | 'onClearFilters' | 'onRetry'>) {
  if (!online) {
    return (
      <div className="empty">
        <Icon name="offline" size={40} />
        <p className="empty-title">오프라인이에요</p>
        <p className="small">연결되면 자동으로 다시 불러와요.</p>
      </div>
    )
  }
  if (error) {
    return (
      <div className="empty empty-error" role="alert">
        <Icon name="alert" size={40} />
        <p className="empty-title">목록을 불러오지 못했어요</p>
        <p className="small">{error}</p>
        <div className="empty-actions">
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            <Icon name="refresh" size={16} />
            다시 시도
          </button>
        </div>
      </div>
    )
  }
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

export function ItemList(props: Props) {
  const { items, loading, canShare, thumbUrls, freshIds, onAction } = props
  const pinned = useMemo(() => items.filter((i) => i.pinned), [items])
  const rest = useMemo(() => items.filter((i) => !i.pinned), [items])
  const orderedIds = useMemo(() => [...pinned, ...rest].map((i) => i.id), [pinned, rest])
  const { activeId, setActiveId, registerRow } = useRowKeys(orderedIds)

  if (loading) return <Skeleton />
  if (items.length === 0) return <EmptyState {...props} />

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
              tabIndex={item.id === activeId ? 0 : -1}
              registerRow={registerRow}
              onFocusRow={setActiveId}
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
