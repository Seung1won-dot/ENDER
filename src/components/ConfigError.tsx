import { Mark } from './Icon'

/** 필수 환경변수 없이 빌드·실행됐을 때 흰 화면 대신 보여 주는 안내. */
export function ConfigError({ missing }: { missing: readonly string[] }) {
  return (
    <main className="auth">
      <div className="auth-brand">
        <Mark size={44} />
        <h1>Ender Chest</h1>
      </div>
      <p className="auth-tag">상자를 열 설정이 아직 없어요.</p>
      <div className="notice" role="alert">
        <p className="config-text">아래 환경변수가 비어 있어요.</p>
        <ul className="config-list">
          {missing.map((k) => (
            <li key={k}>
              <code>{k}</code>
            </li>
          ))}
        </ul>
        <p className="config-text">
          로컬에서는 <code>.env.example</code> 을 <code>.env</code> 로 복사해 값을 채우고 개발 서버를 다시 켜세요. Vercel
          에서는 Project Settings → Environment Variables 에 넣은 뒤 다시 배포하세요.
        </p>
      </div>
    </main>
  )
}
