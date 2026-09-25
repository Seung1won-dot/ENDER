export type ToastLevel = 'info' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastMessage {
  id: number
  level: ToastLevel
  text: string
  /** 있으면 토스트 오른쪽에 버튼 하나 (예: 되돌리기) */
  action?: ToastAction
  /** 표시 시간. 없으면 기본값 */
  ttlMs?: number
}

export type ToastEvent = { type: 'show'; toast: ToastMessage } | { type: 'dismiss'; id: number }

type Listener = (ev: ToastEvent) => void
const listeners = new Set<Listener>()
let seq = 0

function show(level: ToastLevel, text: string, extra: Pick<ToastMessage, 'action' | 'ttlMs'> = {}): number {
  const t: ToastMessage = { id: ++seq, level, text, ...extra }
  listeners.forEach((l) => l({ type: 'show', toast: t }))
  if (level === 'error') console.error('[toast]', text)
  return t.id
}

export const toast = {
  info: (text: string) => show('info', text),
  error: (text: string) => show('error', text),
  /** 버튼이 달린 토스트. 반환값은 dismiss 에 쓰는 id */
  action: (text: string, action: ToastAction, ttlMs?: number) => show('info', text, { action, ttlMs }),
  dismiss: (id: number) => listeners.forEach((l) => l({ type: 'dismiss', id })),
}

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn)
  return () => void listeners.delete(fn)
}
