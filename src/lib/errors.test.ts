import { describe, expect, it } from 'vitest'
import { messageOf } from './errors'

describe('messageOf - Supabase auth error codes (한국어 매핑)', () => {
  it('invalid_credentials', () => {
    expect(messageOf({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(
      '이메일 또는 비밀번호가 올바르지 않아요',
    )
  })
  it('email_not_confirmed', () => {
    expect(messageOf({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(
      '이메일 인증이 아직 안 됐어요. 메일의 링크를 눌러주세요',
    )
  })
  it('user_already_exists', () => {
    expect(messageOf({ code: 'user_already_exists', message: 'User already registered' })).toBe(
      '이미 가입된 이메일이에요. 로그인해 주세요',
    )
  })
  it('weak_password', () => {
    expect(messageOf({ code: 'weak_password', message: 'Password should be at least 6 characters' })).toBe(
      '비밀번호는 6자 이상이어야 해요',
    )
  })
  it('over_email_send_rate_limit', () => {
    expect(messageOf({ code: 'over_email_send_rate_limit', message: 'Email rate limit exceeded' })).toBe(
      '메일 발송 한도를 넘었어요. 잠시 후 다시 시도해 주세요',
    )
  })
  it('email_provider_disabled', () => {
    expect(messageOf({ code: 'email_provider_disabled', message: 'Email signups are disabled' })).toBe(
      '이메일 가입이 꺼져 있어요. Supabase 설정을 확인해 주세요',
    )
  })
  it('signup_disabled', () => {
    expect(messageOf({ code: 'signup_disabled', message: 'Signups not allowed for this instance' })).toBe(
      '새 가입이 꺼져 있어요',
    )
  })
  it('validation_failed', () => {
    expect(messageOf({ code: 'validation_failed', message: 'Invalid input' })).toBe('입력값을 확인해 주세요')
  })
})

describe('messageOf - 코드 없이 영어 메시지만 있는 경우', () => {
  it('"Invalid login credentials" -> invalid_credentials 문구', () => {
    expect(messageOf({ message: 'Invalid login credentials' })).toBe('이메일 또는 비밀번호가 올바르지 않아요')
  })
  it('"Email not confirmed" -> email_not_confirmed 문구', () => {
    expect(messageOf({ message: 'Email not confirmed' })).toBe('이메일 인증이 아직 안 됐어요. 메일의 링크를 눌러주세요')
  })
  it('"User already registered" -> user_already_exists 문구', () => {
    expect(messageOf({ message: 'User already registered' })).toBe('이미 가입된 이메일이에요. 로그인해 주세요')
  })
  it('"Email signups are disabled" -> email_provider_disabled 문구', () => {
    expect(messageOf({ message: 'Email signups are disabled' })).toBe('이메일 가입이 꺼져 있어요. Supabase 설정을 확인해 주세요')
  })
  it('"Password should be at least 6 characters" 접두사 일치 -> weak_password 문구', () => {
    expect(messageOf({ message: 'Password should be at least 6 characters.' })).toBe('비밀번호는 6자 이상이어야 해요')
  })
  it('Error 인스턴스의 message 가 매핑된 영어 문자열이면 한국어로 변환', () => {
    expect(messageOf(new Error('Invalid login credentials'))).toBe('이메일 또는 비밀번호가 올바르지 않아요')
  })
})

describe('messageOf - 기존 동작 (매핑되지 않은 값)', () => {
  it('매핑되지 않은 Error 는 원래 message 를 그대로 반환', () => {
    expect(messageOf(new Error('네트워크 연결에 실패했어요'))).toBe('네트워크 연결에 실패했어요')
  })
  it('문자열은 그대로 반환', () => {
    expect(messageOf('커스텀 오류 메시지')).toBe('커스텀 오류 메시지')
  })
  it('message 속성만 있는 매핑되지 않은 객체는 그 message 를 그대로 반환', () => {
    expect(messageOf({ message: 'something unexpected happened' })).toBe('something unexpected happened')
  })
  it('객체도 문자열도 아닌 값은 한국어 fallback', () => {
    expect(messageOf(undefined)).toBe('알 수 없는 오류가 발생했어요')
    expect(messageOf(null)).toBe('알 수 없는 오류가 발생했어요')
    expect(messageOf(42)).toBe('알 수 없는 오류가 발생했어요')
    expect(messageOf({})).toBe('알 수 없는 오류가 발생했어요')
  })
})
