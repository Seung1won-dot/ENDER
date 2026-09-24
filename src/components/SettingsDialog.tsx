import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceName, setDeviceName } from '../lib/device'
import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'
import { TokenSection } from './TokenSection'

interface Props {
  open: boolean
  onClose: () => void
  email: string
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onDeviceChange: (name: string) => void
}

export function SettingsDialog({ open, onClose, email, expiry, onExpiryChange, onDeviceChange }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [device, setDevice] = useState(getDeviceName())

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  function saveDevice() {
    setDeviceName(device)
    const effective = getDeviceName()
    setDevice(effective)
    onDeviceChange(effective)
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose}>
      <h2>설정</h2>
      <p className="dim small">{email}</p>

      <label className="field">
        이 기기 이름
        <div className="row">
          <input
            type="text"
            value={device}
            placeholder="예: 연구실 PC, 맥미니"
            onChange={(e) => setDevice(e.target.value)}
            onBlur={saveDevice}
            onKeyDown={(e) => e.key === 'Enter' && saveDevice()}
          />
        </div>
        <span className="dim small">아이템에 "어느 기기에서 넣었는지" 로 표시돼요.</span>
      </label>

      <label className="field">
        기본 만료
        <select value={expiry} onChange={(e) => onExpiryChange(e.target.value as ExpiryPreset)}>
          {EXPIRY_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <TokenSection />

      <div className="row end">
        <button className="ghost" onClick={() => void supabase.auth.signOut()}>
          로그아웃
        </button>
        <button className="primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
