// 화면 테마. 기본은 밝게, 설정에서 어둡게·시스템 따라가기를 고를 수 있다.
// 고른 값은 이 기기(localStorage)에만 저장하고 <html data-theme="light|dark"> 로 적용한다.

export type ThemeChoice = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'ender.theme'
/** 브라우저 주소창·상태 막대 색 (global.css 의 --bg 와 같은 값) */
export const THEME_COLOR: Record<Theme, string> = { light: '#f4f6fc', dark: '#14162a' }

export function parseChoice(value: string | null | undefined): ThemeChoice {
  return value === 'dark' || value === 'system' || value === 'light' ? value : 'light'
}

export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): Theme {
  if (choice === 'system') return prefersDark ? 'dark' : 'light'
  return choice
}

export function readChoice(): ThemeChoice {
  try {
    return parseChoice(localStorage.getItem(THEME_KEY))
  } catch {
    return 'light'
  }
}

function prefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(choice: ThemeChoice = readChoice()): Theme {
  const theme = resolveTheme(choice, prefersDark())
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  return theme
}

const listeners = new Set<() => void>()

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setThemeChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, choice)
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문에만 적용한다
  }
  applyTheme(choice)
  listeners.forEach((l) => l())
}

/** 앱 시작 때 한 번. "시스템" 을 골랐으면 시스템 설정이 바뀔 때 따라간다. */
export function initTheme(): void {
  applyTheme()
  if (typeof matchMedia !== 'function') return
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readChoice() === 'system') {
      applyTheme()
      listeners.forEach((l) => l())
    }
  })
}
