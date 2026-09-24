import { useRef, useState, type KeyboardEvent } from 'react'
import { EXPIRY_PRESETS, type ExpiryPreset } from '../lib/expiry'

interface Props {
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onSubmitText: (text: string) => Promise<void>
  onPickFiles: (files: File[]) => void
  busy: boolean
}

export function Composer({ expiry, onExpiryChange, onSubmitText, onPickFiles, busy }: Props) {
  const [text, setText] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  async function send() {
    const t = text.trim()
    if (!t || busy) return
    await onSubmitText(t)
    setText('')
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="composer">
      <textarea
        rows={2}
        placeholder="텍스트나 링크를 적고 Enter (줄바꿈은 Shift+Enter). 화면 어디서든 Ctrl+V, 파일은 끌어다 놓기."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        disabled={busy}
      />
      <div className="composer-bar">
        <label className="dim small">
          만료{' '}
          <select value={expiry} onChange={(e) => onExpiryChange(e.target.value as ExpiryPreset)}>
            {EXPIRY_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
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
        <button className="ghost" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          파일 선택
        </button>
        <button className="primary" type="button" disabled={busy || !text.trim()} onClick={() => void send()}>
          넣기
        </button>
      </div>
    </div>
  )
}
