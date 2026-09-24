export function DropOverlay({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="drop-overlay" aria-hidden>
      <div className="drop-box">📦 여기에 놓으면 상자에 들어가요</div>
    </div>
  )
}
