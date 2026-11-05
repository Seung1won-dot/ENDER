import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getDeviceName, setDeviceName } from '../lib/device'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import type { ExpiryPreset } from '../lib/expiry'
import { ExpirySegment } from './ExpirySegment'
import { TokenSection } from './TokenSection'
import { Icon } from './Icon'
import { notifySupported, readNotifyPref, writeNotifyPref } from '../hooks/useNotify'

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
  const [notify, setNotify] = useState(readNotifyPref)

  async function toggleNotify(on: boolean) {
    if (on && notifySupported() && Notification.permission !== 'granted') {
      const res = await Notification.requestPermission()
      if (res !== 'granted') {
        toast.error('브라우저에서 알림이 막혀 있어요. 주소창의 사이트 설정에서 허용해 주세요.')
        return
      }
    }
    writeNotifyPref(on)
    setNotify(on)
    if (on) toast.info('다른 기기에서 넣으면 알려 드릴게요')
  }

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
          <span className="field-label">기본 보관 기간</span>
          <ExpirySegment name="settings-expiry" value={expiry} onChange={onExpiryChange} label="기본 보관 기간" showLabel={false} />
          <span className="field-help">새로 넣는 항목에 붙어요. 항목마다 미리보기에서 따로 바꿀 수 있어요.</span>
        </div>
      </section>

      {notifySupported() && (
        <section className="dialog-section">
          <label className="switch-row">
            <span className="switch-text">
              <span className="field-label">새 항목 알림</span>
              <span className="field-help">창을 옆에 띄워 두면, 다른 기기에서 넣었을 때 데스크톱 알림이 와요.</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              className="switch"
              checked={notify}
              onChange={(e) => void toggleNotify(e.target.checked)}
            />
          </label>
        </section>
      )}

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
