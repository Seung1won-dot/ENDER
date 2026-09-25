import { useState, type KeyboardEvent } from 'react'

interface Props {
  id: string
  initial: string
  onSave: (text: string) => void
  onCancel: () => void
}

/** 텍스트 항목 인라인 편집. Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소. */
export function RowEditor({ id, initial, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)

  function save() {
    const t = draft.trim()
    if (!t) return
    onSave(t)
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="row-edit">
      <label className="sr-only" htmlFor={`edit-${id}`}>
        내용 편집
      </label>
      <textarea
        id={`edit-${id}`}
        autoFocus
        rows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onFocus={(e) => {
          const end = e.currentTarget.value.length
          e.currentTarget.setSelectionRange(end, end)
        }}
      />
      <div className="row-edit-bar">
        <button type="button" className="btn btn-primary" disabled={!draft.trim()} onClick={save}>
          저장
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          취소
        </button>
        <span className="row-edit-hint">Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소</span>
      </div>
    </div>
  )
}
