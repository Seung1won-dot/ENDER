export const REQUIRED_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const
export type RequiredEnv = (typeof REQUIRED_ENV)[number]

/** 비어 있거나 빠진 필수 환경변수 이름. 다 있으면 빈 배열. */
export function missingEnv(env: Partial<Record<string, unknown>>): RequiredEnv[] {
  return REQUIRED_ENV.filter((k) => {
    const v = env[k]
    return typeof v !== 'string' || v.trim() === ''
  })
}
