export type ToastLevel = 'info' | 'error'
export interface ToastMessage {
  id: number
  level: ToastLevel
  text: string
}

type Listener = (t: ToastMessage) => void
const listeners = new Set<Listener>()
let seq = 0

function emit(level: ToastLevel, text: string): void {
  const t: ToastMessage = { id: ++seq, level, text }
  listeners.forEach((l) => l(t))
  if (level === 'error') console.error('[toast]', text)
}

export const toast = {
  info: (text: string) => emit('info', text),
  error: (text: string) => emit('error', text),
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
