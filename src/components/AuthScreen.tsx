import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { Mark } from './Icon'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setNotice('확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인하세요.')
      }
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function magicLink() {
    if (!email) {
      toast.error('이메일을 먼저 입력하세요')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      setNotice('로그인 링크를 메일로 보냈어요. 이 기기에서 링크를 열어주세요.')
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-brand">
        <Mark size={44} />
        <h1>Ender Chest</h1>
      </div>
      <p className="auth-tag">어디서 열어도 같은 내용물이 보이는 나만의 상자</p>

      <form onSubmit={submit} className="auth-form">
        <label className="field">
          <span className="field-label">이메일</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">비밀번호</span>
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {mode === 'login' ? '로그인' : '가입하기'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={magicLink}>
          비밀번호 없이 메일 링크로 로그인
        </button>
      </form>

      {notice && <p className="notice">{notice}</p>}

      <p className="auth-switch">
        {mode === 'login' ? (
          <>
            계정이 없나요?{' '}
            <button type="button" className="btn-link" onClick={() => setMode('signup')}>
              가입
            </button>
          </>
        ) : (
          <>
            이미 계정이 있나요?{' '}
            <button type="button" className="btn-link" onClick={() => setMode('login')}>
              로그인
            </button>
          </>
        )}
      </p>
    </main>
  )
}
