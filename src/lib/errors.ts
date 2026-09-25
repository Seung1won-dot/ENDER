const AUTH_ERROR_CODE_MESSAGES: Record<string, string> = {
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않아요',
  email_not_confirmed: '이메일 인증이 아직 안 됐어요. 메일의 링크를 눌러주세요',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요',
  weak_password: '비밀번호는 6자 이상이어야 해요',
  over_email_send_rate_limit: '메일 발송 한도를 넘었어요. 잠시 후 다시 시도해 주세요',
  email_provider_disabled: '이메일 가입이 꺼져 있어요. Supabase 설정을 확인해 주세요',
  signup_disabled: '새 가입이 꺼져 있어요',
  validation_failed: '입력값을 확인해 주세요',
}

const AUTH_ERROR_MESSAGE_MATCHERS: Array<{ test: (msg: string) => boolean; code: string }> = [
  { test: (msg) => msg === 'Invalid login credentials', code: 'invalid_credentials' },
  { test: (msg) => msg === 'Email not confirmed', code: 'email_not_confirmed' },
  { test: (msg) => msg === 'User already registered', code: 'user_already_exists' },
  { test: (msg) => msg === 'Email signups are disabled', code: 'email_provider_disabled' },
  { test: (msg) => msg.startsWith('Password should be at least 6 characters'), code: 'weak_password' },
]

export function messageOf(e: unknown): string {
  if (e && typeof e === 'object') {
    const code = (e as { code?: unknown }).code
    if (typeof code === 'string' && Object.hasOwn(AUTH_ERROR_CODE_MESSAGES, code)) {
      return AUTH_ERROR_CODE_MESSAGES[code]
    }

    const message = (e as { message?: unknown }).message
    if (typeof message === 'string') {
      const matched = AUTH_ERROR_MESSAGE_MATCHERS.find((m) => m.test(message))
      if (matched) return AUTH_ERROR_CODE_MESSAGES[matched.code]
    }
  }

  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return '알 수 없는 오류가 발생했어요'
}
