import { useEffect } from 'react'
import { clipboardFileName } from '../lib/files'

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

export function usePaste(onText: (text: string) => void, onFiles: (files: File[]) => void): void {
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const data = e.clipboardData
      if (!data) return

      const files = Array.from(data.files)
      if (files.length > 0) {
        e.preventDefault()
        const now = new Date()
        onFiles(files.map((f) => new File([f], clipboardFileName(f.name, f.type, now), { type: f.type })))
        return
      }

      if (isEditable(e.target)) return

      const text = data.getData('text/plain')
      if (text.trim()) {
        e.preventDefault()
        onText(text)
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [onText, onFiles])
}
