export type ToastLevel = 'info' | 'error'
export interface ToastAction {
  label: string
  run: () => void
}
export interface ToastMessage {
  id: number
  level: ToastLevel
  text: string
  action?: ToastAction
  /** 보이는 시간(ms). 기본 3500 */
  ttl?: number
}

type Listener = (t: ToastMessage) => void
const listeners = new Set<Listener>()
let seq = 0

function emit(level: ToastLevel, text: string, opts: { action?: ToastAction; ttl?: number } = {}): void {
  const t: ToastMessage = { id: ++seq, level, text, ...opts }
  listeners.forEach((l) => l(t))
  if (level === 'error') console.error('[toast]', text)
}

export const toast = {
  info: (text: string, opts?: { action?: ToastAction; ttl?: number }) => emit('info', text, opts),
  error: (text: string) => emit('error', text),
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
