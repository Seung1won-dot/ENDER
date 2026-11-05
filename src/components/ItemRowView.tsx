import { forwardRef, type MouseEvent } from 'react'
import { m } from 'motion/react'
import type { ItemRow } from '../lib/items'
import { formatSize } from '../lib/files'
import { describeRemaining } from '../lib/expiry'
import { domainOf, extBadge, itemTitle, previewKindOf, textExcerpt, timeLabel } from '../lib/preview'
import { EASE, T_LAYOUT } from '../lib/motion'
import { Icon, type IconName } from './Icon'

export type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete'
/** 동작을 처리하고 성공 여부를 돌려준다 */
export type ItemActionHandler = (action: ItemAction, item: ItemRow) => Promise<boolean>

interface Props {
  item: ItemRow
  thumbUrl?: string | null
  active: boolean
  checked: boolean
  selecting: boolean
  fresh: boolean
  copied: boolean
  enterDelay?: number
  onOpen: (item: ItemRow, e: MouseEvent) => void
  onToggleCheck: (item: ItemRow, e: MouseEvent) => void
  onAction: ItemActionHandler
}

const HOUR = 60 * 60 * 1000

function tileIcon(item: ItemRow): IconName {
  switch (previewKindOf(item)) {
    case 'text':
      return 'text'
    case 'link':
      return 'link'
    case 'video':
      return 'video'
    case 'audio':
      return 'music'
    case 'image':
      return 'image'
    default:
      return 'file'
  }
}

/** 행의 둘째 줄: 링크는 도메인, 파일은 형식·크기, 텍스트는 이어지는 내용 */
function subLine(item: ItemRow): string {
  if (item.kind === 'link') return domainOf(item.content) ?? item.content ?? ''
  if (item.kind === 'file') {
    const size = item.file_size !== null ? formatSize(item.file_size) : ''
    return [extBadge(item.file_name), size].filter(Boolean).join(' · ')
  }
  return textExcerpt(item.content)
}

export const ItemRowView = forwardRef<HTMLLIElement, Props>(function ItemRowView(
  { item, thumbUrl, active, checked, selecting, fresh, copied, enterDelay = 0, onOpen, onToggleCheck, onAction },
  ref,
) {
  const kind = previewKindOf(item)
  const remaining = describeRemaining(item.expires_at)
  const soon = item.expires_at !== null && new Date(item.expires_at).getTime() - Date.now() < HOUR
  const title = itemTitle(item)
  const sub = subLine(item)
  const primary: ItemAction = item.kind === 'file' ? 'download' : 'copy'

  const cls = ['row', active && 'is-active', checked && 'is-checked', item.pinned && 'is-pinned'].filter(Boolean).join(' ')

  return (
    <m.li
      ref={ref}
      className={cls}
      data-id={item.id}
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE, delay: enterDelay } }}
      exit={{ opacity: 0, transition: { duration: 0.14, ease: EASE } }}
      transition={{ layout: T_LAYOUT }}
    >
      {/* 행 전체를 덮는 버튼: 누르면 미리보기. 아래 작은 버튼들은 그 위에 놓인다. */}
      <button
        type="button"
        className="row-hit"
        aria-label={`${title} 미리보기`}
        aria-current={active ? 'true' : undefined}
        onClick={(e) => onOpen(item, e)}
      />

      <span className={`tile tile-${kind}`} aria-hidden="true">
        {kind === 'image' && thumbUrl ? (
          <img src={thumbUrl} alt="" loading="lazy" draggable={false} />
        ) : item.kind === 'file' && kind !== 'image' && kind !== 'video' && kind !== 'audio' ? (
          <span className="tile-ext">{extBadge(item.file_name)}</span>
        ) : (
          <Icon name={tileIcon(item)} size={17} />
        )}
      </span>

      <button
        type="button"
        className={checked ? 'row-check is-on' : selecting ? 'row-check is-visible' : 'row-check'}
        role="checkbox"
        aria-checked={checked}
        aria-label={`${title} 선택`}
        onClick={(e) => onToggleCheck(item, e)}
      >
        <Icon name="checkmark" size={12} />
      </button>

      <div className="row-body">
        <div className="row-title">
          {fresh && <span className="fresh-dot" aria-label="새 항목" />}
          <span className="row-title-text">{title}</span>
          {item.pinned && <Icon name="pin" size={12} filled className="row-pin" />}
        </div>
        {sub && <div className={item.kind === 'file' ? 'row-sub mono' : 'row-sub'}>{sub}</div>}
      </div>

      <div className="row-meta">
        <span className="row-time">
          <time dateTime={item.created_at}>{timeLabel(item.created_at)}</time>
        </span>
        <span className="row-source">
          {item.source ?? ''}
          {remaining && <span className={soon ? 'row-exp is-soon' : 'row-exp'}> · {remaining}</span>}
        </span>
      </div>

      <div className="row-actions">
        <button
          type="button"
          className={copied ? 'icon-btn sm is-done' : 'icon-btn sm'}
          title={primary === 'copy' ? (copied ? '복사했어요' : '복사 (C)') : '다운로드 (D)'}
          aria-label={primary === 'copy' ? '복사' : '다운로드'}
          onClick={() => void onAction(primary, item)}
        >
          <Icon name={primary === 'copy' ? (copied ? 'checkmark' : 'copy') : 'download'} size={15} />
        </button>
        {item.kind === 'link' && (
          <button
            type="button"
            className="icon-btn sm"
            title="새 탭에서 열기 (O)"
            aria-label="새 탭에서 열기"
            onClick={() => void onAction('open', item)}
          >
            <Icon name="external" size={15} />
          </button>
        )}
        <button
          type="button"
          className={item.pinned ? 'icon-btn sm is-on' : 'icon-btn sm'}
          title={item.pinned ? '고정 해제 (P)' : '고정 (P)'}
          aria-label={item.pinned ? '고정 해제' : '고정'}
          aria-pressed={item.pinned}
          onClick={() => void onAction('pin', item)}
        >
          <Icon name="pin" size={15} filled={item.pinned} />
        </button>
        <button
          type="button"
          className="icon-btn sm danger"
          title="삭제 (Delete)"
          aria-label="삭제"
          onClick={() => void onAction('delete', item)}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </m.li>
  )
})
