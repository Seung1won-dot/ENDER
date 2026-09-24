import type { ItemRow } from '../lib/items'
import { ItemCard, type ItemAction } from './ItemCard'

interface Props {
  items: ItemRow[]
  loading: boolean
  canShare: boolean
  thumbUrls: Record<string, string | null>
  onAction: (action: ItemAction, item: ItemRow) => void
}

export function ItemList({ items, loading, canShare, thumbUrls, onAction }: Props) {
  if (loading) return <p className="dim">불러오는 중…</p>
  if (items.length === 0) {
    return (
      <div className="empty">
        <p>상자가 비어 있어요.</p>
        <p className="dim small">위 입력창에 적거나, Ctrl+V 로 붙이거나, 파일을 창에 끌어다 놓으세요.</p>
      </div>
    )
  }
  return (
    <section className="list">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          canShare={canShare}
          thumbUrl={item.file_path ? thumbUrls[item.file_path] : null}
          onAction={onAction}
        />
      ))}
    </section>
  )
}
