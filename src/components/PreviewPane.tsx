import { useEffect, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import type { ChestApi } from '../lib/api'
import type { ItemRow } from '../lib/items'
import { formatSize } from '../lib/files'
import { describeRemaining, EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'
import { isSafeHttpUrl } from '../lib/detect'
import { domainOf, extBadge, fullDateLabel, itemTitle, previewKindOf } from '../lib/preview'
import { messageOf } from '../lib/errors'
import { EASE } from '../lib/motion'
import type { ItemAction } from './ItemRowView'
import { PASTE_KEY } from '../lib/keys'
import { Icon, Mark } from './Icon'

interface Props {
  item: ItemRow | null
  api: ChestApi
  canShare: boolean
  copied: boolean
  onAction: (action: ItemAction, item: ItemRow) => Promise<boolean>
  onSaveText: (item: ItemRow, text: string) => Promise<boolean>
  onSetExpiry: (item: ItemRow, preset: ExpiryPreset) => void
  onClose: () => void
}

type Loaded = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; url: string; text?: string } | { state: 'error'; message: string }

const KIND_LABEL: Record<string, string> = {
  text: '메모',
  link: '링크',
  image: '이미지',
  video: '동영상',
  audio: '오디오',
  pdf: 'PDF',
  code: '텍스트 파일',
  none: '파일',
}

/** 파일 본문(서명 주소, 텍스트 파일이면 내용까지)을 불러온다 */
function useFileBody(item: ItemRow | null, api: ChestApi): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'idle' })
  const path = item?.file_path ?? null
  const kind = item ? previewKindOf(item) : 'none'

  useEffect(() => {
    if (!path || kind === 'none') {
      setLoaded({ state: 'idle' })
      return
    }
    let cancelled = false
    setLoaded({ state: 'loading' })
    void (async () => {
      try {
        const url = await api.viewUrl(path)
        let text: string | undefined
        if (kind === 'code') {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`파일을 받지 못했어요 (${res.status})`)
          text = await res.text()
        }
        if (!cancelled) setLoaded({ state: 'ready', url, text })
      } catch (e) {
        if (!cancelled) setLoaded({ state: 'error', message: messageOf(e) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [path, kind, api])

  return loaded
}

function TextBody({ item, onSave }: { item: ItemRow; onSave: (text: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.content ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditing(false)
    setDraft(item.content ?? '')
  }, [item.id, item.content])

  if (editing) {
    return (
      <div className="pv-edit">
        <textarea
          className="pv-textarea"
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setEditing(false)
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void save()
            }
          }}
          aria-label="메모 편집"
        />
        <div className="pv-edit-bar">
          <span className="pv-hint">
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 저장 · <kbd>Esc</kbd> 취소
          </span>
          <span className="spacer" />
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
            취소
          </button>
          <button type="button" className="btn btn-primary" disabled={saving || !draft.trim()} onClick={() => void save()}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  async function save() {
    if (!draft.trim()) return
    setSaving(true)
    const ok = await onSave(draft)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="pv-text-wrap">
      <pre className="pv-text">{item.content}</pre>
      <button type="button" className="btn btn-ghost pv-edit-btn" onClick={() => setEditing(true)}>
        <Icon name="edit" size={14} />
        편집
      </button>
    </div>
  )
}

function FileBody({ item, loaded }: { item: ItemRow; loaded: Loaded }) {
  const kind = previewKindOf(item)
  if (kind === 'none') {
    return (
      <div className="pv-file-card">
        <span className="pv-file-ext">{extBadge(item.file_name)}</span>
        <p className="pv-file-note">이 형식은 미리보기를 지원하지 않아요. 내려받아 열어 주세요.</p>
      </div>
    )
  }
  if (loaded.state === 'loading' || loaded.state === 'idle') {
    return (
      <div className="pv-loading" role="status" aria-label="불러오는 중">
        <span className="spinner" aria-hidden="true" />
      </div>
    )
  }
  if (loaded.state === 'error') {
    return (
      <div className="pv-file-card" role="alert">
        <Icon name="alert" size={20} />
        <p className="pv-file-note">미리보기를 불러오지 못했어요. {loaded.message}</p>
      </div>
    )
  }
  switch (kind) {
    case 'image':
      return (
        <a className="pv-image" href={loaded.url} target="_blank" rel="noopener noreferrer" title="원본 크기로 열기">
          <img src={loaded.url} alt={item.file_name ?? ''} />
        </a>
      )
    case 'video':
      return <video className="pv-media" src={loaded.url} controls playsInline preload="metadata" />
    case 'audio':
      return (
        <div className="pv-audio">
          <Icon name="music" size={28} />
          <audio src={loaded.url} controls preload="metadata" />
        </div>
      )
    case 'pdf':
      return <iframe className="pv-pdf" src={loaded.url} title={item.file_name ?? 'PDF'} />
    case 'code':
      return <pre className="pv-code">{loaded.text}</pre>
    default:
      return null
  }
}

function currentPreset(item: ItemRow): ExpiryPreset | null {
  return item.expires_at === null ? 'never' : null
}

export function PreviewPane({ item, api, canShare, copied, onAction, onSaveText, onSetExpiry, onClose }: Props) {
  const loaded = useFileBody(item, api)

  return (
    <aside className={item ? 'preview is-open' : 'preview'} aria-label="미리보기">
      <AnimatePresence mode="wait" initial={false}>
        {item ? (
          <m.div
            key={item.id}
            className="pv"
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE }}
          >
            <PaneContent
              item={item}
              loaded={loaded}
              canShare={canShare}
              copied={copied}
              onAction={onAction}
              onSaveText={onSaveText}
              onSetExpiry={onSetExpiry}
              onClose={onClose}
            />
          </m.div>
        ) : (
          <m.div key="none" className="pv-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <span className="pv-empty-art" aria-hidden="true">
              <Mark size={40} />
            </span>
            <h2 className="pv-empty-title">여기서 미리 봐요</h2>
            <p>목록에서 항목을 고르면 내용을 보고 바로 복사·다운로드할 수 있어요.</p>
            <h3 className="pv-empty-heading">넣는 방법</h3>
            <ul className="how-list">
              <li>
                <span className="how-ico how-paste">
                  <Icon name="clipboard" size={16} />
                </span>
                <span className="how-text">
                  <strong>
                    붙여넣기 <kbd>{PASTE_KEY}</kbd>
                  </strong>
                  <span>복사한 글·이미지·파일을 화면 어디서든</span>
                </span>
              </li>
              <li>
                <span className="how-ico how-drop">
                  <Icon name="upload" size={16} />
                </span>
                <span className="how-text">
                  <strong>끌어다 놓기</strong>
                  <span>파일 여러 개를 창에 한꺼번에</span>
                </span>
              </li>
              <li>
                <span className="how-ico how-type">
                  <Icon name="edit" size={16} />
                </span>
                <span className="how-text">
                  <strong>
                    적고 <kbd>Enter</kbd>
                  </strong>
                  <span>메모나 링크를 위 입력창에</span>
                </span>
              </li>
            </ul>
            <h3 className="pv-empty-heading">단축키</h3>
            <dl className="shortcut-list">
              <div>
                <dt>
                  <kbd>↑</kbd> <kbd>↓</kbd>
                </dt>
                <dd>항목 이동</dd>
              </div>
              <div>
                <dt>
                  <kbd>C</kbd>
                </dt>
                <dd>복사</dd>
              </div>
              <div>
                <dt>
                  <kbd>D</kbd>
                </dt>
                <dd>다운로드</dd>
              </div>
              <div>
                <dt>
                  <kbd>P</kbd>
                </dt>
                <dd>고정</dd>
              </div>
              <div>
                <dt>
                  <kbd>/</kbd>
                </dt>
                <dd>검색</dd>
              </div>
            </dl>
          </m.div>
        )}
      </AnimatePresence>
    </aside>
  )
}

function PaneContent({
  item,
  loaded,
  canShare,
  copied,
  onAction,
  onSaveText,
  onSetExpiry,
  onClose,
}: Omit<Props, 'api' | 'item'> & { item: ItemRow; loaded: Loaded }) {
  const kind = previewKindOf(item)
  const remaining = describeRemaining(item.expires_at)
  const preset = currentPreset(item)
  const link = item.kind === 'link' && item.content && isSafeHttpUrl(item.content) ? item.content : null

  return (
    <>
      <header className="pv-head">
        <button type="button" className="icon-btn pv-back" aria-label="목록으로" onClick={onClose}>
          <Icon name="back" size={18} />
        </button>
        <span className="pv-kind">{KIND_LABEL[kind]}</span>
        <span className="spacer" />
        <button
          type="button"
          className={item.pinned ? 'icon-btn is-on' : 'icon-btn'}
          title={item.pinned ? '고정 해제' : '고정'}
          aria-label={item.pinned ? '고정 해제' : '고정'}
          aria-pressed={item.pinned}
          onClick={() => void onAction('pin', item)}
        >
          <Icon name="pin" size={16} filled={item.pinned} />
        </button>
        {canShare && (
          <button type="button" className="icon-btn" title="다른 앱으로 공유" aria-label="다른 앱으로 공유" onClick={() => void onAction('share', item)}>
            <Icon name="share" size={16} />
          </button>
        )}
        <button type="button" className="icon-btn danger" title="삭제" aria-label="삭제" onClick={() => void onAction('delete', item)}>
          <Icon name="trash" size={16} />
        </button>
        <button type="button" className="icon-btn pv-close" title="닫기 (Esc)" aria-label="닫기" onClick={onClose}>
          <Icon name="close" size={16} />
        </button>
      </header>

      <div className="pv-scroll">
        <h2 className="pv-title">{itemTitle(item)}</h2>
        <p className="pv-meta">
          <span>{item.source ?? '알 수 없는 기기'}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={item.created_at}>{fullDateLabel(item.created_at)}</time>
          {item.kind === 'file' && item.file_size !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span className="mono">{formatSize(item.file_size)}</span>
            </>
          )}
        </p>

        <div className="pv-primary">
          {item.kind === 'file' ? (
            <button type="button" className="btn btn-primary" onClick={() => void onAction('download', item)}>
              <Icon name="download" size={16} />
              다운로드
            </button>
          ) : (
            <button type="button" className={copied ? 'btn btn-primary is-done' : 'btn btn-primary'} onClick={() => void onAction('copy', item)}>
              <Icon name={copied ? 'checkmark' : 'copy'} size={16} />
              {copied ? '복사했어요' : item.kind === 'link' ? '주소 복사' : '전체 복사'}
            </button>
          )}
          {link && (
            <a className="btn btn-ghost" href={link} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={16} />
              열기
            </a>
          )}
          {item.kind === 'file' && loaded.state === 'ready' && kind !== 'none' && (
            <a className="btn btn-ghost" href={loaded.url} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={16} />새 탭에서 보기
            </a>
          )}
        </div>

        <div className="pv-body">
          {item.kind === 'text' && <TextBody item={item} onSave={(t) => onSaveText(item, t)} />}
          {item.kind === 'link' && (
            <div className="pv-link">
              <span className="pv-link-domain">{domainOf(item.content) ?? '링크'}</span>
              <span className="pv-link-url">{item.content}</span>
            </div>
          )}
          {item.kind === 'file' && <FileBody item={item} loaded={loaded} />}
        </div>

        <section className="pv-section">
          <h3 className="pv-section-title">
            <Icon name="clock" size={14} />
            보관 기간
            <span className="pv-section-note">{remaining ?? '계속 보관'}</span>
          </h3>
          <div className="pv-expiry" role="group" aria-label="보관 기간 바꾸기">
            {EXPIRY_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className="chip-btn"
                aria-pressed={preset === p.value}
                onClick={() => onSetExpiry(item, p.value)}
                title={p.value === 'never' ? '만료 없이 계속 보관' : `지금부터 ${p.label} 뒤 삭제`}
              >
                {p.value === 'never' ? '영구' : `지금부터 ${p.label}`}
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

