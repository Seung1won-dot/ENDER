import type { ItemRow } from '../lib/items'
import { Icon } from './Icon'

export type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete' | 'extend' | 'edit'

interface Props {
  item: ItemRow
  isImage: boolean
  canShare: boolean
  editing: boolean
  onEdit: () => void
  onAction: (action: Exclude<ItemAction, 'edit' | 'extend'>) => void
}

/** 항목 오른쪽의 동작 버튼들. data-action 은 키보드 탐색(useRowKeys)이 대신 눌러 주는 데 쓴다. */
export function RowActions({ item, isImage, canShare, editing, onEdit, onAction }: Props) {
  const canCopy = item.kind !== 'file' || isImage
  return (
    <div className="row-actions">
      {canCopy && (
        <button
          className="icon-btn"
          data-action="copy"
          title={isImage ? '이미지 복사 (c)' : '복사 (c)'}
          aria-label={isImage ? '이미지 복사' : '복사'}
          onClick={() => onAction('copy')}
        >
          <Icon name="copy" size={16} />
        </button>
      )}
      {item.kind === 'text' && (
        <button className="icon-btn" data-action="edit" title="편집 (e)" aria-label="편집" onClick={onEdit} disabled={editing}>
          <Icon name="pencil" size={16} />
        </button>
      )}
      {item.kind === 'link' && (
        <button
          className="icon-btn"
          data-action="open"
          title="새 탭에서 열기 (Enter)"
          aria-label="새 탭에서 열기"
          onClick={() => onAction('open')}
        >
          <Icon name="external" size={16} />
        </button>
      )}
      {item.kind === 'file' && (
        <button
          className="icon-btn"
          data-action="download"
          title="다운로드 (Enter)"
          aria-label="다운로드"
          onClick={() => onAction('download')}
        >
          <Icon name="download" size={16} />
        </button>
      )}
      {canShare && (
        <button
          className="icon-btn"
          data-action="share"
          title="다른 앱으로 공유"
          aria-label="다른 앱으로 공유"
          onClick={() => onAction('share')}
        >
          <Icon name="share" size={16} />
        </button>
      )}
      <button
        className={item.pinned ? 'icon-btn is-on' : 'icon-btn'}
        data-action="pin"
        title={item.pinned ? '고정 해제 (p)' : '고정 (p)'}
        aria-label="고정"
        aria-pressed={item.pinned}
        onClick={() => onAction('pin')}
      >
        <Icon name="pin" size={16} filled={item.pinned} />
      </button>
      <button className="icon-btn danger" data-action="delete" title="삭제 (d)" aria-label="삭제" onClick={() => onAction('delete')}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  )
}
