import { AnimatePresence, m } from 'motion/react'
import type { LiveStatus } from '../hooks/useItems'
import { SearchBar } from './SearchBar'
import { Icon, Mark } from './Icon'

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: '연결 중',
  live: '실시간',
  offline: '오프라인',
}

interface Props {
  status: LiveStatus
  query: string
  onQueryChange: (q: string) => void
  onOpenSettings: () => void
}

/** 상단바: 상자 마크 + 이름 + 연결 상태 / 검색 / 설정 */
export function TopBar({ status, query, onQueryChange, onOpenSettings }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <Mark size={22} />
          <h1 className="brand-name">Ender Chest</h1>
        </div>
        <span className={`status status-${status}`} title={STATUS_LABEL[status]} role="status">
          <span className="status-dot" />
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={status}
              className="status-label"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.14 }}
            >
              {STATUS_LABEL[status]}
            </m.span>
          </AnimatePresence>
        </span>
        <span className="spacer" />
        <SearchBar value={query} onChange={onQueryChange} />
        <button className="icon-btn" title="설정" aria-label="설정" onClick={onOpenSettings}>
          <Icon name="sliders" size={18} />
        </button>
      </div>
    </header>
  )
}
