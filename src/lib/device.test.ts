import { describe, expect, it } from 'vitest'
import { DEVICE_KEY, defaultDeviceName, getDeviceName, setDeviceName } from './device'

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36',
}

function memStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  }
}

describe('defaultDeviceName', () => {
  it('UA 별 기본 이름', () => {
    expect(defaultDeviceName(UA.iphone)).toBe('iPhone')
    expect(defaultDeviceName(UA.ipad)).toBe('iPad')
    expect(defaultDeviceName(UA.android)).toBe('Android')
    expect(defaultDeviceName(UA.mac)).toBe('Mac')
    expect(defaultDeviceName(UA.win)).toBe('Windows')
    expect(defaultDeviceName(UA.linux)).toBe('Linux')
    expect(defaultDeviceName('')).toBe('기기')
  })
})

describe('get/setDeviceName', () => {
  it('저장값이 없으면 UA 기본값', () => {
    expect(getDeviceName(memStorage(), UA.mac)).toBe('Mac')
  })
  it('저장값이 있으면 그것', () => {
    expect(getDeviceName(memStorage({ [DEVICE_KEY]: '맥미니' }), UA.mac)).toBe('맥미니')
  })
  it('set 은 trim 해서 저장, 공백만이면 삭제', () => {
    const s = memStorage()
    setDeviceName('  연구실 PC ', s)
    expect(s.dump()).toEqual({ [DEVICE_KEY]: '연구실 PC' })
    setDeviceName('   ', s)
    expect(s.dump()).toEqual({})
  })
})
