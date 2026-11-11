import { LayoutGroup, m } from 'motion/react'
import type { LiveStatus } from '../hooks/useItems'
import { formatSize } from '../lib/files'
import { T_INDICATOR } from '../lib/motion'
import { Icon, Mark, type IconName } from './Icon'
import { ThemeToggle } from './ThemeToggle'

export type View = 'all' | 'pinned' | 'text' | 'link' | 'image' | 'file'

export const VIEWS: ReadonlyArray<{ value: View; label: string; icon: IconName }> = [
  { value: 'all', label: '전체', icon: 'inbox' },
  { value: 'pinned', label: '고정됨', icon: 'pin' },
  { value: 'text', label: '메모', icon: 'text' },
  { value: 'link', label: '링크', icon: 'link' },
  { value: 'image', label: '사진', icon: 'image' },
  { value: 'file', label: '파일', icon: 'file' },
]

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: '연결 중',
  live: '실시간 동기화',
  offline: '오프라인',
}

/** Supabase 무료 플랜 저장 공간 */
const FREE_STORAGE = 1024 * 1024 * 1024

interface Props {
  status: LiveStatus
  view: View
  counts: Record<View, number>
  onView: (v: View) => void
  sources: Array<{ source: string; count: number }>
  source: string | null
  myDevice: string
  onSource: (s: string | null) => void
  usedBytes: number
  email: string
  onOpenSettings: () => void
}

export function StatusBadge({ status }: { status: LiveStatus }) {
  return (
    <span className={`status status-${status}`} role="status" title={STATUS_LABEL[status]}>
      <span className="status-dot" />
      <span className="status-label">{STATUS_LABEL[status]}</span>
    </span>
  )
}

export function Sidebar(p: Props) {
  const ratio = Math.min(1, p.usedBytes / FREE_STORAGE)
  return (
    <nav className="side" aria-label="보관함">
      <div className="side-brand">
        <Mark size={22} />
        <span className="side-name">Ender Chest</span>
        <span className="spacer" />
        <ThemeToggle />
      </div>
      <StatusBadge status={p.status} />

      <LayoutGroup id="side-nav">
        <div className="side-section">
          <ul className="side-list">
            {VIEWS.map((v) => {
              const on = p.view === v.value && p.source === null
              return (
                <li key={v.value}>
                  <button
                    type="button"
                    className={on ? 'side-item is-on' : 'side-item'}
                    aria-current={on ? 'page' : undefined}
                    onClick={() => {
                      p.onView(v.value)
                      p.onSource(null)
                    }}
                  >
                    {on && <m.span className="side-indicator" layoutId="side-indicator" transition={T_INDICATOR} />}
                    <span className={`side-ico side-ico-${v.value}`}>
                      <Icon name={v.icon} size={15} filled={v.value === 'pinned' && on} />
                    </span>
                    <span className="side-label">{v.label}</span>
                    <span className="side-count">{p.counts[v.value]}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {p.sources.length > 0 && (
          <div className="side-section">
            <h2 className="side-heading">기기</h2>
            <ul className="side-list">
              {p.sources.map((s) => {
                const on = p.source === s.source
                return (
                  <li key={s.source}>
                    <button
                      type="button"
                      className={on ? 'side-item is-on' : 'side-item'}
                      aria-current={on ? 'page' : undefined}
                      onClick={() => {
                        p.onView('all')
                        p.onSource(on ? null : s.source)
                      }}
                    >
                      {on && <m.span className="side-indicator" layoutId="side-indicator" transition={T_INDICATOR} />}
                      <span className="side-ico side-ico-device">
                        <Icon name="monitor" size={15} />
                      </span>
                      <span className="side-label">
                        {s.source}
                        {s.source === p.myDevice && <span className="side-me">이 기기</span>}
                      </span>
                      <span className="side-count">{s.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </LayoutGroup>

      <div className="side-foot">
        <div className="storage" title="Supabase 무료 플랜 저장 공간 1GB 기준">
          <div className="storage-row">
            <span>파일 용량</span>
            <span className="mono">{formatSize(p.usedBytes)} / 1 GB</span>
          </div>
          <div className="storage-bar" aria-hidden="true">
            <span style={{ width: `${Math.max(ratio * 100, p.usedBytes > 0 ? 1.5 : 0)}%` }} />
          </div>
        </div>
        <button type="button" className="side-account" onClick={p.onOpenSettings}>
          <span className="avatar" aria-hidden="true">
            {(p.email[0] ?? 'E').toUpperCase()}
          </span>
          <span className="side-account-text">
            <span className="side-account-mail">{p.email || '설정'}</span>
            <span className="side-account-sub">설정 · 기기 · 단축어</span>
          </span>
          <Icon name="sliders" size={16} />
        </button>
      </div>
    </nav>
  )
}
