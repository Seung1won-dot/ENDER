import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXPIRY,
  EXPIRY_PRESETS,
  computeExpiresAt,
  describeRemaining,
  extendExpiresAt,
  isExpiryPreset,
} from './expiry'

describe('extendExpiresAt', () => {
  const now = new Date('2026-09-25T12:00:00.000Z')
  it('영구는 null', () => {
    expect(extendExpiresAt('2026-09-26T00:00:00.000Z', 'never', now)).toBeNull()
  })
  it('남은 기간에 더한다', () => {
    expect(extendExpiresAt('2026-09-26T00:00:00.000Z', '1d', now)).toBe('2026-09-27T00:00:00.000Z')
    expect(extendExpiresAt('2026-09-26T00:00:00.000Z', '7d', now)).toBe('2026-10-03T00:00:00.000Z')
  })
  it('이미 지났거나 없으면 지금부터', () => {
    expect(extendExpiresAt('2026-09-25T00:00:00.000Z', '7d', now)).toBe('2026-10-02T12:00:00.000Z')
    expect(extendExpiresAt(null, '1d', now)).toBe('2026-09-26T12:00:00.000Z')
  })
})

const now = new Date('2026-09-25T05:00:00.000Z')

describe('computeExpiresAt', () => {
  it('never 는 null', () => {
    expect(computeExpiresAt('never', now)).toBeNull()
  })
  it('1h / 1d / 7d', () => {
    expect(computeExpiresAt('1h', now)).toBe('2026-09-25T06:00:00.000Z')
    expect(computeExpiresAt('1d', now)).toBe('2026-09-26T05:00:00.000Z')
    expect(computeExpiresAt('7d', now)).toBe('2026-10-02T05:00:00.000Z')
  })
})

describe('presets', () => {
  it('기본값은 7d 이고 프리셋 목록에 있다', () => {
    expect(DEFAULT_EXPIRY).toBe('7d')
    expect(EXPIRY_PRESETS.map((p) => p.value)).toEqual(['1h', '1d', '7d', 'never'])
  })
  it('isExpiryPreset', () => {
    expect(isExpiryPreset('1h')).toBe(true)
    expect(isExpiryPreset('never')).toBe(true)
    expect(isExpiryPreset('2h')).toBe(false)
    expect(isExpiryPreset(null)).toBe(false)
  })
})

describe('describeRemaining', () => {
  it('null 이면 null', () => {
    expect(describeRemaining(null, now)).toBeNull()
  })
  it('일·시간·분 단위', () => {
    expect(describeRemaining('2026-09-28T05:00:00.000Z', now)).toBe('3일 남음')
    expect(describeRemaining('2026-09-25T07:30:00.000Z', now)).toBe('2시간 남음')
    expect(describeRemaining('2026-09-25T05:05:00.000Z', now)).toBe('5분 남음')
  })
  it('1분 미만은 곧 만료, 지났으면 만료됨', () => {
    expect(describeRemaining('2026-09-25T05:00:30.000Z', now)).toBe('곧 만료')
    expect(describeRemaining('2026-09-25T04:00:00.000Z', now)).toBe('만료됨')
  })
})
