import { useCallback, useEffect, useRef, useState } from 'react'

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable || !!el.closest('[role="menu"]')
}

/**
 * 목록 키보드 탐색. j/k(또는 행에 포커스가 있을 때 ↑↓)로 행을 옮기고,
 * 포커스된 행에서 c 복사 · Enter 열기/다운로드 · e 편집 · d 삭제 · p 고정 · x 만료 메뉴.
 * 동작 키는 행 안의 data-action 버튼을 대신 눌러 준다 (동작 로직은 한 곳에만).
 */
export function useRowKeys(orderedIds: string[]) {
  const rows = useRef(new Map<string, HTMLLIElement>())
  const [activeId, setActiveId] = useState<string | null>(null)

  const registerRow = useCallback((id: string, el: HTMLLIElement | null) => {
    if (el) rows.current.set(id, el)
    else rows.current.delete(id)
  }, [])

  // 목록이 바뀌어 활성 행이 사라지면 첫 행으로
  const effectiveActive = activeId && orderedIds.includes(activeId) ? activeId : (orderedIds[0] ?? null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      if (orderedIds.length === 0) return
      if (document.querySelector('dialog[open]')) return // 설정 창이 열려 있으면 목록 키는 쉰다

      const focusedLi = (document.activeElement as HTMLElement | null)?.closest<HTMLLIElement>('li.row') ?? null
      const currentId = focusedLi?.dataset.id ?? effectiveActive
      const idx = currentId ? orderedIds.indexOf(currentId) : -1
      const focusRow = (id: string | undefined) => {
        if (!id) return
        setActiveId(id)
        rows.current.get(id)?.focus()
      }

      if (e.key === 'j' || (e.key === 'ArrowDown' && focusedLi)) {
        e.preventDefault()
        focusRow(orderedIds[focusedLi ? Math.min(orderedIds.length - 1, idx + 1) : Math.max(0, idx)])
        return
      }
      if (e.key === 'k' || (e.key === 'ArrowUp' && focusedLi)) {
        e.preventDefault()
        focusRow(orderedIds[focusedLi ? Math.max(0, idx - 1) : Math.max(0, idx)])
        return
      }
      // 동작 키는 행 자체에 포커스가 있을 때만. 행 안의 버튼·링크에 있으면 그 요소의 Enter 가 따로 동작한다.
      if (!focusedLi || document.activeElement !== focusedLi) return

      const press = (selector: string) => {
        const btn = focusedLi.querySelector<HTMLButtonElement>(selector)
        if (!btn || btn.disabled) return
        e.preventDefault()
        btn.click()
      }
      switch (e.key) {
        case 'c':
          press('[data-action="copy"]')
          break
        case 'Enter':
          press('[data-action="open"], [data-action="download"]')
          break
        case 'e':
          press('[data-action="edit"]')
          break
        case 'd':
        case 'Delete':
          press('[data-action="delete"]')
          break
        case 'p':
          press('[data-action="pin"]')
          break
        case 'x':
          press('.meta-btn')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [orderedIds, effectiveActive])

  return { activeId: effectiveActive, setActiveId, registerRow }
}
