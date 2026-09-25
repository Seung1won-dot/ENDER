import type { ItemRow } from '../lib/items'
import { formatSize, isImageMime } from '../lib/files'
import { describeRemaining } from '../lib/expiry'
import { isSafeHttpUrl } from '../lib/detect'

export type ItemAction = 'copy' | 'open' | 'download' | 'share' | 'pin' | 'delete'

interface Props {
  item: ItemRow
  canShare: boolean
  thumbUrl?: string | null
  onAction: (action: ItemAction, item: ItemRow) => void
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? time : `${d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ${time}`
}

export function ItemCard({ item, canShare, thumbUrl, onAction }: Props) {
  const remaining = describeRemaining(item.expires_at)
  const isImage = item.kind === 'file' && isImageMime(item.mime_type)

  return (
    <article className={`card card-${item.kind}${item.pinned ? ' pinned' : ''}`}>
      <div className="card-body">
        {item.kind === 'text' && <pre className="card-text">{item.content}</pre>}

        {item.kind === 'link' && item.content && isSafeHttpUrl(item.content) && (
          <a className="card-link" href={item.content} target="_blank" rel="noopener noreferrer">
            <span className="card-link-title">{item.title ?? item.content}</span>
            <span className="card-link-url">{item.content}</span>
          </a>
        )}

        {item.kind === 'file' && (
          <div className="card-file">
            {isImage && thumbUrl ? (
              <img className="card-thumb" src={thumbUrl} alt={item.file_name ?? ''} loading="lazy" />
            ) : (
              <span className="card-file-icon" aria-hidden>
                📄
              </span>
            )}
            <div>
              <div className="card-file-name">{item.file_name}</div>
              <div className="dim small">{item.file_size !== null ? formatSize(item.file_size) : ''}</div>
            </div>
          </div>
        )}
      </div>

      <footer className="card-meta">
        <span className="dim small">
          {item.source ? `${item.source} · ` : ''}
          {timeLabel(item.created_at)}
          {remaining ? ` · ${remaining}` : ''}
        </span>
        <span className="card-actions">
          {(item.kind === 'text' || item.kind === 'link') && (
            <button className="icon" title="복사" onClick={() => onAction('copy', item)}>
              복사
            </button>
          )}
          {item.kind === 'link' && (
            <button className="icon" title="열기" onClick={() => onAction('open', item)}>
              열기
            </button>
          )}
          {item.kind === 'file' && (
            <button className="icon" title="다운로드" onClick={() => onAction('download', item)}>
              다운로드
            </button>
          )}
          {canShare && (
            <button className="icon" title="다른 앱으로 공유" onClick={() => onAction('share', item)}>
              공유
            </button>
          )}
          <button className="icon" title={item.pinned ? '고정 해제' : '고정'} onClick={() => onAction('pin', item)}>
            {item.pinned ? '📌' : '고정'}
          </button>
          <button className="icon danger" title="삭제" onClick={() => onAction('delete', item)}>
            삭제
          </button>
        </span>
      </footer>
    </article>
  )
}
