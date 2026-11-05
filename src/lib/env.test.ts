import { describe, expect, it } from 'vitest'
import { missingEnv } from './env'

describe('missingEnv', () => {
  it('둘 다 있으면 빈 배열', () => {
    expect(missingEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual([])
  })
  it('빠지거나 공백뿐인 값을 알려 준다', () => {
    expect(missingEnv({ VITE_SUPABASE_URL: '  ' })).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
    expect(missingEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toEqual(['VITE_SUPABASE_ANON_KEY'])
  })
})
