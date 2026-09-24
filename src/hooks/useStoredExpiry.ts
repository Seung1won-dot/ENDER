import { useCallback, useState } from 'react'
import { DEFAULT_EXPIRY, isExpiryPreset, type ExpiryPreset } from '../lib/expiry'

export const EXPIRY_KEY = 'ec.expiry'

function readStored(): ExpiryPreset {
  try {
    const v = localStorage.getItem(EXPIRY_KEY)
    return isExpiryPreset(v) ? v : DEFAULT_EXPIRY
  } catch {
    return DEFAULT_EXPIRY
  }
}

export function useStoredExpiry(): [ExpiryPreset, (p: ExpiryPreset) => void] {
  const [value, setValue] = useState<ExpiryPreset>(readStored)
  const set = useCallback((p: ExpiryPreset) => {
    setValue(p)
    try {
      localStorage.setItem(EXPIRY_KEY, p)
    } catch {
      /* 저장 실패는 무시 */
    }
  }, [])
  return [value, set]
}
