import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceName, setDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import type { ExpiryPreset } from '../lib/expiry'
import { ExpirySegment } from './ExpirySegment'
import { TokenSection } from './TokenSection'
import { Icon } from './Icon'

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

  const [signingOut, setSigningOut] = useState(false)

  // 서버에 닿지 않아도(오프라인) 이 기기에서는 반드시 로그아웃되게, 실패하면 로컬 세션만이라도 지운다.
  async function signOut() {
    setSigningOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        await supabase.auth.signOut({ scope: 'local' })
        toast.info('이 기기에서 로그아웃했어요')
      }
    } catch (e) {
      toast.error(`로그아웃하지 못했어요: ${messageOf(e)}`)
    } finally {
      setSigningOut(false)
    }
  }

  function saveDevice() {
    setDeviceName(device)
    const effective = getDeviceName()
    setDevice(effective)
    onDeviceChange(effective)
  }

  return (
    <dialog ref={ref} className="dialog" onClose={onClose} aria-labelledby="settings-title">
      <div className="dialog-head">
        <h2 className="dialog-title" id="settings-title">
          설정
        </h2>
        <button type="button" className="icon-btn" title="닫기" aria-label="닫기" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <p className="dialog-sub">{email}</p>

      <section className="dialog-section">
        <label className="field">
          <span className="field-label">이 기기 이름</span>
          <input
            type="text"
            value={device}
            placeholder="예: 연구실 PC, 맥미니"
            onChange={(e) => setDevice(e.target.value)}
            onBlur={saveDevice}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
          <span className="field-help">항목에 "어느 기기에서 넣었는지" 로 표시돼요.</span>
        </label>
      </section>

      <section className="dialog-section">
        <div className="field">
          <span className="field-label">기본 만료</span>
          <ExpirySegment name="settings-expiry" value={expiry} onChange={onExpiryChange} label="기본 만료" showLabel={false} />
          <span className="field-help">입력창의 만료 선택에도 이 값이 기본으로 들어가요.</span>
        </div>
      </section>

      <section className="dialog-section">
        <TokenSection open={open} />
      </section>

      <div className="dialog-foot">
        <button type="button" className="btn btn-ghost" disabled={signingOut} onClick={() => void signOut()}>
          <Icon name="logout" size={16} />
          로그아웃
        </button>
        <button type="button" className="btn btn-primary" onClick={onClose}>
          닫기
        </button>
      </div>
    </dialog>
  )
}
