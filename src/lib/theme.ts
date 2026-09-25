export type Theme = 'auto' | 'dark' | 'light'

export const THEME_KEY = 'ec.theme'
export const THEMES: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'auto', label: '자동' },
  { value: 'dark', label: '다크' },
  { value: 'light', label: '라이트' },
]

// index.html 의 theme-color 메타와 같은 값 (DESIGN.md obsidian / stone)
const COLORS: Record<'dark' | 'light', string> = { dark: '#15161d', light: '#f3f2f7' }

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'dark' || v === 'light' ? v : 'auto'
  } catch {
    return 'auto'
  }
}

/** <html data-theme> 와 theme-color 메타를 맞춘다. 'auto' 는 시스템 설정을 따른다. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'auto') delete root.dataset.theme
  else root.dataset.theme = theme
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const scheme = m.media.includes('light') ? 'light' : 'dark'
    m.content = theme === 'auto' ? COLORS[scheme] : COLORS[theme]
  })
}

export function setTheme(theme: Theme): void {
  try {
    if (theme === 'auto') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* 저장 실패는 무시 */
  }
  applyTheme(theme)
}
