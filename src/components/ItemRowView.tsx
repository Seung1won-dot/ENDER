import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ItemRow } from '../lib/items'
import { formatSize, isImageMime } from '../lib/files'
import { describeRemaining, type ExtendBy } from '../lib/expiry'
import { isSafeHttpUrl } from '../lib/detect'
import { Icon, type IconName } from './Icon'

export type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete' | 'extend' | 'edit'
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

/** 남은 기간 표시 겸 연장 메뉴 */
function ExpiryMenu({ label, soon, onPick }: { label: string; soon: boolean; onPick: (by: ExtendBy) => void }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (by: ExtendBy) => {
    setOpen(false)
    onPick(by)
  }

  return (
    <span className="meta-wrap" ref={wrap}>
      <button
        type="button"
        className={soon ? 'meta-btn meta-soon' : 'meta-btn'}
        title="만료 바꾸기"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="menu" role="menu" aria-label="만료 바꾸기">
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('1d')}>
            <Icon name="clock" size={14} />
            1일 연장
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('7d')}>
            <Icon name="clock" size={14} />
            7일 연장
          </button>
          <button type="button" role="menuitem" className="menu-item" onClick={() => pick('never')}>
            <Icon name="pin" size={14} />
            영구 보관
          </button>
        </div>
      )}
    </span>
  )
}

export function ItemRowView({ item, canShare, thumbUrl, isNew = false, onAction }: Props) {
  const remaining = describeRemaining(item.expires_at)
  const soon = item.expires_at !== null && new Date(item.expires_at).getTime() - Date.now() < HOUR
  const isImage = item.kind === 'file' && isImageMime(item.mime_type)
  const showThumb = isImage && !!thumbUrl
  const canCopy = item.kind !== 'file' || isImage

  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
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

  function startEdit() {
    setDraft(item.content ?? '')
    setEditing(true)
  }
  function saveEdit() {
    const t = draft.trim()
    if (!t) return
    setEditing(false)
    if (t !== (item.content ?? '').trim()) onAction('edit', item, { text: t })
  }
  function onEditKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      saveEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditing(false)
    }
  }

  // kind 수식 클래스는 kind-* 로. (row-text 는 본문 요소의 클래스라 겹치면 안 된다)
  const cls = ['row', `kind-${item.kind}`, showThumb ? 'row-image' : '', item.pinned ? 'pinned' : '', isNew ? 'row-new' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <li className={cls}>
      {showThumb ? (
        <img className="row-thumb" src={thumbUrl ?? undefined} alt={item.file_name ?? ''} loading="lazy" />
      ) : (
        <span className="row-kind" aria-hidden="true">
          <Icon name={iconFor(item, isImage)} size={16} />
        </span>
      )}

      <div className="row-body">
        {item.kind === 'text' && editing && (
          <div className="row-edit">
            <label className="sr-only" htmlFor={`edit-${item.id}`}>
              내용 편집
            </label>
            <textarea
              id={`edit-${item.id}`}
              autoFocus
              rows={4}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditKey}
              onFocus={(e) => {
                const end = e.currentTarget.value.length
                e.currentTarget.setSelectionRange(end, end)
              }}
            />
            <div className="row-edit-bar">
              <button type="button" className="btn btn-primary" disabled={!draft.trim()} onClick={saveEdit}>
                저장
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                취소
              </button>
              <span className="row-edit-hint">Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소</span>
            </div>
          </div>
        )}

        {item.kind === 'text' && !editing && (
          <>
            <div ref={textRef} className={expanded ? 'row-text' : 'row-text is-clamped'}>
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

      <div className="row-actions">
        {canCopy && (
          <button
            className="icon-btn"
            title={isImage ? '이미지 복사' : '복사'}
            aria-label={isImage ? '이미지 복사' : '복사'}
            onClick={() => onAction('copy', item)}
          >
            <Icon name="copy" size={16} />
          </button>
        )}
        {item.kind === 'text' && (
          <button className="icon-btn" title="편집" aria-label="편집" onClick={startEdit} disabled={editing}>
            <Icon name="pencil" size={16} />
          </button>
        )}
        {item.kind === 'link' && (
          <button className="icon-btn" title="새 탭에서 열기" aria-label="새 탭에서 열기" onClick={() => onAction('open', item)}>
            <Icon name="external" size={16} />
          </button>
        )}
        {item.kind === 'file' && (
          <button className="icon-btn" title="다운로드" aria-label="다운로드" onClick={() => onAction('download', item)}>
            <Icon name="download" size={16} />
          </button>
        )}
        {canShare && (
          <button
            className="icon-btn"
            title="다른 앱으로 공유"
            aria-label="다른 앱으로 공유"
            onClick={() => onAction('share', item)}
          >
            <Icon name="share" size={16} />
          </button>
        )}
        <button
          className={item.pinned ? 'icon-btn is-on' : 'icon-btn'}
          title={item.pinned ? '고정 해제' : '고정'}
          aria-label="고정"
          aria-pressed={item.pinned}
          onClick={() => onAction('pin', item)}
        >
          <Icon name="pin" size={16} filled={item.pinned} />
        </button>
        <button className="icon-btn danger" title="삭제" aria-label="삭제" onClick={() => onAction('delete', item)}>
          <Icon name="trash" size={16} />
        </button>
      </div>
    </li>
  )
}
