import { useRef, useState, type KeyboardEvent } from 'react'
import { m } from 'motion/react'
import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'
import { PASTE_KEY } from '../lib/keys'
import { TAP_SCALE } from '../lib/motion'
import { Icon } from './Icon'

interface Props {
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  /** 넣기에 성공하면 true. 실패하면 입력한 글을 지우지 않는다. */
  onSubmitText: (text: string) => Promise<boolean>
  onPickFiles: (files: File[]) => void
  busy: boolean
}

export function Composer({ expiry, onExpiryChange, onSubmitText, onPickFiles, busy }: Props) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)

  async function send() {
    const t = text.trim()
    if (!t || sending) return
    setSending(true)
    const ok = await onSubmitText(t)
    setSending(false)
    if (ok) {
      setText('')
      area.current?.focus()
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
    if (e.key === 'Escape') area.current?.blur()
  }

  const canSend = text.trim() !== '' && !sending

  return (
    <div className="composer" aria-busy={busy || sending}>
      <label className="sr-only" htmlFor="composer-input">
        넣을 글이나 링크
      </label>
      <textarea
        id="composer-input"
        ref={area}
        rows={1}
        placeholder="메모나 링크를 적고 Enter"
        title={`파일은 창에 끌어다 놓거나 ${PASTE_KEY} 로 붙여넣어도 돼요`}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const el = e.target
          el.style.height = 'auto'
          el.style.height = `${Math.min(el.scrollHeight, 240)}px`
        }}
        onKeyDown={onKey}
      />
      <div className="composer-bar">
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) onPickFiles(files)
          }}
        />
        <button className="btn btn-quiet" type="button" onClick={() => fileInput.current?.click()} title="파일 선택">
          <Icon name="paperclip" size={16} />
          <span className="hide-sm">파일</span>
        </button>
        <label className="select-wrap" title="새로 넣는 항목의 보관 기간">
          <Icon name="clock" size={14} />
          <span className="sr-only">보관 기간</span>
          <select value={expiry} onChange={(e) => onExpiryChange(e.target.value as ExpiryPreset)}>
            {EXPIRY_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.value === 'never' ? '영구 보관' : `${p.label} 보관`}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        {busy && (
          <span className="composer-busy" role="status">
            <span className="spinner" aria-hidden="true" /> 올리는 중
          </span>
        )}
        <m.button
          className="btn btn-primary"
          type="button"
          disabled={!canSend}
          onClick={() => void send()}
          title="Enter"
          whileTap={canSend ? { scale: TAP_SCALE } : undefined}
        >
          {sending ? <span className="spinner" aria-hidden="true" /> : <Icon name="enter" size={15} />}
          넣기
        </m.button>
      </div>
    </div>
  )
}
