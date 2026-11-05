import { useRef, useState, type KeyboardEvent } from 'react'
import { m } from 'motion/react'
import type { ExpiryPreset } from '../lib/expiry'
import { TAP_SCALE } from '../lib/motion'
import { ExpirySegment } from './ExpirySegment'
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
  const fileInput = useRef<HTMLInputElement>(null)

  async function send() {
    const t = text.trim()
    if (!t || busy) return
    if (await onSubmitText(t)) setText('')
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
        // 붙여넣기·끌어다 놓기 안내는 빈 상자 화면이 맡고, 자리표시자는 좁은 화면에서도 두 줄 안에 들게 짧게.
        placeholder="텍스트나 링크를 적고 Enter · 줄바꿈은 Shift+Enter"
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
        <m.button
          className="btn btn-primary"
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => void send()}
          title="Enter"
          whileTap={busy || !text.trim() ? undefined : { scale: TAP_SCALE }}
        >
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="enter" size={16} />}
          {busy ? '넣는 중…' : '넣기'}
        </m.button>
      </div>
    </div>
  )
}
