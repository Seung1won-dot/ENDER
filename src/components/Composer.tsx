import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { ExpiryPreset } from '../lib/expiry'
import { PASTE_KEY } from '../lib/keys'
import { clipboardFileName } from '../lib/files'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { ExpirySegment } from './ExpirySegment'
import { Icon } from './Icon'

interface Props {
  expiry: ExpiryPreset
  onExpiryChange: (p: ExpiryPreset) => void
  onSubmitText: (text: string) => Promise<void>
  onPickFiles: (files: File[]) => void
  busy: boolean
}

const DRAFT_KEY = 'ec.draft'
// 폰에는 Ctrl+V 가 없으니 클립보드를 읽는 버튼을 보여 준다 (읽기 API 가 있는 브라우저만)
const SHOW_PASTE_BUTTON =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  window.matchMedia?.('(pointer: coarse)').matches &&
  typeof navigator.clipboard?.read === 'function'

function readDraft(): string {
  try {
    return sessionStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(text: string): void {
  try {
    if (text) sessionStorage.setItem(DRAFT_KEY, text)
    else sessionStorage.removeItem(DRAFT_KEY)
  } catch {
    /* 저장 실패는 무시 */
  }
}

export function Composer({ expiry, onExpiryChange, onSubmitText, onPickFiles, busy }: Props) {
  // 입력 중 내용은 탭 세션에 남겨 두어 새로고침·자동 업데이트에도 사라지지 않는다.
  const [text, setText] = useState(readDraft)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => writeDraft(text), [text])

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

  async function pasteFromClipboard() {
    try {
      const entries = await navigator.clipboard.read()
      const files: File[] = []
      let plain = ''
      const now = new Date()
      for (const entry of entries) {
        const imageType = entry.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          const blob = await entry.getType(imageType)
          files.push(new File([blob], clipboardFileName('', imageType, now), { type: imageType }))
          continue
        }
        if (entry.types.includes('text/plain')) plain += await (await entry.getType('text/plain')).text()
      }
      if (files.length > 0) onPickFiles(files)
      else if (plain.trim()) await onSubmitText(plain.trim())
      else toast.info('클립보드가 비어 있어요')
    } catch (e) {
      toast.error(`클립보드를 읽지 못했어요: ${messageOf(e)}`)
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
        {SHOW_PASTE_BUTTON && (
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void pasteFromClipboard()}>
            <Icon name="clipboard" size={16} />
            붙여넣기
          </button>
        )}
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
