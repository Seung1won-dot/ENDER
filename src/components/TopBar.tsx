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
          <span className="status-label">{STATUS_LABEL[status]}</span>
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
