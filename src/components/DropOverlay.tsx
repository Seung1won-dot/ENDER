import { Icon } from './Icon'

export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="drop-overlay" aria-hidden="true">
      <div className="drop-box">
        <Icon name="upload" size={22} />
        여기에 놓으면 상자에 들어가요
      </div>
    </div>
  )
}
