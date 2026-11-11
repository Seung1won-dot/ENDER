import { useSyncExternalStore } from 'react'
import { readChoice, resolveTheme, setThemeChoice, subscribeTheme } from '../lib/theme'
import { Icon } from './Icon'

function currentTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : resolveTheme(readChoice(), false)
}

/** 밝게 ↔ 어둡게 바로 바꾸는 버튼. "시스템 따라가기" 는 설정에서 고른다. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme)
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = next === 'dark' ? '어두운 화면으로' : '밝은 화면으로'
  return (
    <button type="button" className="icon-btn" title={label} aria-label={label} onClick={() => setThemeChoice(next)}>
      <Icon name={next === 'dark' ? 'moon' : 'sun'} size={17} />
    </button>
  )
}
