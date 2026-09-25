import { useEffect, useRef, useState } from 'react'
import type { ItemRow } from '../lib/items'
import { formatSize, isImageMime } from '../lib/files'
import { describeRemaining, type ExtendBy } from '../lib/expiry'
import { isSafeHttpUrl, looksLikeCode } from '../lib/detect'
import { ExpiryMenu } from './ExpiryMenu'
import { RowActions, type ItemAction } from './RowActions'
import { RowEditor } from './RowEditor'
import { Icon, type IconName } from './Icon'

export type { ItemAction }
export interface ActionExtra {
  by?: ExtendBy
  text?: string
}

interface Props {
  item: ItemRow
  canShare: boolean
  thumbUrl?: string | null
  /** 첫 화면 이후에 도착한 항목이면 잠깐 "내려오는" 연출 */
  isNew?: boolean
  /** 키보드 탐색용: 활성 행만 Tab 순서에 들어간다 */
  tabIndex?: number
  registerRow?: (id: string, el: HTMLLIElement | null) => void
  onFocusRow?: (id: string) => void
  onAction: (action: ItemAction, item: ItemRow, extra?: ActionExtra) => void
}

const HOUR = 60 * 60 * 1000

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${time}`
}

function iconFor(item: ItemRow, isImage: boolean): IconName {
  if (item.kind === 'text') return 'text'
  if (item.kind === 'link') return 'link'
  return isImage ? 'image' : 'file'
}

/** https 링크만 사이트 파비콘을 시도한다 (http 는 혼합 콘텐츠라 생략). */
function faviconFor(item: ItemRow): string | null {
  if (item.kind !== 'link' || !item.content?.startsWith('https://')) return null
  try {
    return `${new URL(item.content).origin}/favicon.ico`
  } catch {
    return null
  }
}

export function ItemRowView({
  item,
  canShare,
  thumbUrl,
  isNew = false,
  tabIndex = -1,
  registerRow,
  onFocusRow,
  onAction,
}: Props) {
  const remaining = describeRemaining(item.expires_at)
  const soon = item.expires_at !== null && new Date(item.expires_at).getTime() - Date.now() < HOUR
  const isImage = item.kind === 'file' && isImageMime(item.mime_type)
  const showThumb = isImage && !!thumbUrl
  const isCode = item.kind === 'text' && looksLikeCode(item.content ?? '')
  const favicon = faviconFor(item)

  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const [editing, setEditing] = useState(false)
  const [faviconOk, setFaviconOk] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  // 8줄을 넘는지 측정. 글꼴이 늦게 로드되거나 창 폭이 바뀌면 다시 잰다.
  useEffect(() => {
    const el = textRef.current
    if (!el || expanded || editing) return
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    measure()
    if (typeof document !== 'undefined' && document.fonts?.ready) void document.fonts.ready.then(measure)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [item.content, expanded, editing])

  function saveEdit(text: string) {
    setEditing(false)
    if (text !== (item.content ?? '').trim()) onAction('edit', item, { text })
  }

  // kind 수식 클래스는 kind-* 로. (row-text 는 본문 요소의 클래스라 겹치면 안 된다)
  const cls = ['row', `kind-${item.kind}`, showThumb ? 'row-image' : '', item.pinned ? 'pinned' : '', isNew ? 'row-new' : '']
    .filter(Boolean)
    .join(' ')
  const textCls = ['row-text', isCode ? 'code' : '', expanded ? '' : 'is-clamped'].filter(Boolean).join(' ')

  return (
    <li
      className={cls}
      data-id={item.id}
      tabIndex={tabIndex}
      ref={(el) => registerRow?.(item.id, el)}
      onFocus={(e) => {
        if (e.target === e.currentTarget) onFocusRow?.(item.id)
      }}
    >
      {showThumb ? (
        <img className="row-thumb" src={thumbUrl ?? undefined} alt={item.file_name ?? ''} loading="lazy" />
      ) : (
        <span className="row-kind" aria-hidden="true">
          {favicon && (
            <img
              className={faviconOk ? 'row-favicon' : 'row-favicon is-hidden'}
              src={favicon}
              alt=""
              referrerPolicy="no-referrer"
              onLoad={() => setFaviconOk(true)}
              onError={() => setFaviconOk(false)}
            />
          )}
          {!faviconOk && <Icon name={iconFor(item, isImage)} size={16} />}
        </span>
      )}

      <div className="row-body">
        {item.kind === 'text' && editing && (
          <RowEditor id={item.id} initial={item.content ?? ''} onSave={saveEdit} onCancel={() => setEditing(false)} />
        )}

        {item.kind === 'text' && !editing && (
          <>
            <div ref={textRef} className={textCls}>
              {item.content}
            </div>
            {(overflows || expanded) && (
              <button type="button" className="btn-link row-expand" onClick={() => setExpanded((v) => !v)}>
                {expanded ? '접기' : '펼치기'}
              </button>
            )}
          </>
        )}

        {item.kind === 'link' &&
          (item.content && isSafeHttpUrl(item.content) ? (
            <>
              <a className="row-title" href={item.content} target="_blank" rel="noopener noreferrer">
                {item.title ?? item.content}
              </a>
              <div className="row-sub">{item.content}</div>
            </>
          ) : (
            <div className="row-title">{item.title ?? item.content}</div>
          ))}

        {item.kind === 'file' && (
          <>
            <div className="row-title">{item.file_name}</div>
            {item.file_size !== null && <div className="row-sub mono">{formatSize(item.file_size)}</div>}
          </>
        )}

        <div className="row-meta">
          {item.source && <span>{item.source}</span>}
          {item.source && <span aria-hidden="true">·</span>}
          <time dateTime={item.created_at}>{timeLabel(item.created_at)}</time>
          {remaining && <span aria-hidden="true">·</span>}
          {remaining && <ExpiryMenu label={remaining} soon={soon} onPick={(by) => onAction('extend', item, { by })} />}
        </div>
      </div>

      <RowActions
        item={item}
        isImage={isImage}
        canShare={canShare}
        editing={editing}
        onEdit={() => setEditing(true)}
        onAction={(a) => onAction(a, item)}
      />
    </li>
  )
}
