import { describe, expect, it } from 'vitest'
import { parseChoice, resolveTheme } from './theme'

describe('parseChoice', () => {
  it('저장된 값이 없거나 이상하면 밝게', () => {
    expect(parseChoice(null)).toBe('light')
    expect(parseChoice('')).toBe('light')
    expect(parseChoice('purple')).toBe('light')
  })
  it('알고 있는 값은 그대로', () => {
    expect(parseChoice('dark')).toBe('dark')
    expect(parseChoice('system')).toBe('system')
    expect(parseChoice('light')).toBe('light')
  })
})

describe('resolveTheme', () => {
  it('직접 고른 값은 시스템 설정과 상관없이 따른다', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  it('시스템을 고르면 시스템 설정을 따른다', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
})
