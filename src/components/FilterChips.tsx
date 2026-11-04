import { useId, type KeyboardEvent } from 'react'
import { LayoutGroup, m } from 'motion/react'
import { T_INDICATOR } from '../lib/motion'
import { KIND_FILTERS, type KindFilter } from '../lib/itemsState'

interface Props {
  value: KindFilter
  counts: Record<KindFilter, number>
  onChange: (k: KindFilter) => void
}

/** 종류 필터 칩 한 줄. radiogroup 이라 화살표로 옮겨 다닐 수 있다. */
export function FilterChips({ value, counts, onChange }: Props) {
  const groupId = useId()
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const n = KIND_FILTERS.length
    const idx = KIND_FILTERS.findIndex((f) => f.value === value)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    const target = next >= 0 ? KIND_FILTERS[next] : undefined
    if (!target) return
    e.preventDefault()
    onChange(target.value)
    const el = e.currentTarget.querySelector<HTMLElement>(`[data-kind="${target.value}"]`)
    el?.focus()
  }

  // 선택 표시는 칩 사이를 미끄러져 옮겨 가는 한 장의 배경(layoutId)이다.
  return (
    <LayoutGroup id={groupId}>
      <div className="chips" role="radiogroup" aria-label="종류" onKeyDown={onKey}>
        {KIND_FILTERS.map((f) => {
          const on = value === f.value
          return (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              data-kind={f.value}
              className="chip"
              onClick={() => onChange(f.value)}
            >
              {on && <m.span className="chip-indicator" layoutId="chip-indicator" transition={T_INDICATOR} />}
              <span className="chip-label">{f.label}</span>
              <span className="chip-count">{counts[f.value]}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
