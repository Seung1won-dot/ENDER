import { useRef, useState, type KeyboardEvent } from 'react'
import type { ExpiryPreset } from '../lib/expiry'
import { PASTE_KEY } from '../lib/keys'
import { ExpirySegment } from './ExpirySegment'
import { Icon } from './Icon'

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
    <div className="composer" aria-busy={busy}>
      <label className="sr-only" htmlFor="composer-input">
        텍스트나 링크
      </label>
      <textarea
        id="composer-input"
        rows={2}
        placeholder={`텍스트나 링크를 적고 Enter. 줄바꿈은 Shift+Enter. 화면 어디서든 ${PASTE_KEY}, 파일은 끌어다 놓기.`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
      />
      <div className="composer-bar">
        <ExpirySegment name="composer-expiry" value={expiry} onChange={onExpiryChange} disabled={busy} />
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
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          <Icon name="paperclip" size={16} />
          파일 선택
        </button>
        <button
          className="btn btn-primary"
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void send()}
          title="Enter"
        >
          <Icon name="enter" size={16} />
          {busy ? '넣는 중…' : '넣기'}
        </button>
      </div>
    </div>
  )
}
