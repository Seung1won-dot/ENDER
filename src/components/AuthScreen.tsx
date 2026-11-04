import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { supabase } from '../lib/supabase'
import { messageOf } from '../lib/errors'
import { toast } from '../lib/toast'
import { playChestIntro } from '../lib/intro'
import { TAP_SCALE } from '../lib/motion'
import { Mark } from './Icon'

type Mode = 'login' | 'signup'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const root = useRef<HTMLElement>(null)

  // 첫 화면 연출: 상자 뚜껑이 한 번 들렸다 닫히고 폼이 차례로 올라온다(약 0.6초, 입력은 바로 가능).
  useEffect(() => (root.current ? playChestIntro(root.current) : undefined), [])

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
    <main className="auth" ref={root}>
      <div className="auth-brand" data-intro>
        <Mark size={44} />
        <h1>Ender Chest</h1>
      </div>
      <p className="auth-tag" data-intro>
        어디서 열어도 같은 내용물이 보이는 나만의 상자
      </p>

      <form onSubmit={submit} className="auth-form">
        <label className="field" data-intro>
          <span className="field-label">이메일</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field" data-intro>
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
        <m.button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy}
          whileTap={busy ? undefined : { scale: TAP_SCALE }}
          data-intro
        >
          {busy ? '확인 중…' : mode === 'login' ? '로그인' : '가입하기'}
        </m.button>
        <div className="auth-or" data-intro>
          <span>또는</span>
        </div>
        <button type="button" className="btn btn-ghost btn-block" disabled={busy} onClick={magicLink} data-intro>
          비밀번호 없이 메일 링크로 로그인
        </button>
      </form>

      <AnimatePresence initial={false}>
        {notice && (
          <m.p
            key={notice}
            className="notice"
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
          </m.p>
        )}
      </AnimatePresence>

      <p className="auth-switch" data-intro>
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
