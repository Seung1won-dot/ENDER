import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'
import { missingEnv } from './lib/env'
import { ConfigError } from './components/ConfigError'
import { Mark } from './components/Icon'

registerSW({ immediate: true })

const root = ReactDOM.createRoot(document.getElementById('root')!)
const missing = missingEnv(import.meta.env)

if (missing.length > 0) {
  // supabase 클라이언트는 설정 없이 만들 수 없으므로, 앱을 불러오지 않고 안내만 보여 준다.
  root.render(<ConfigError missing={missing} />)
} else {
  // 앱 코드를 받는 동안 App 의 로딩 화면과 같은 모양을 먼저 그린다.
  root.render(
    <div className="boot" role="status" aria-label="불러오는 중">
      <Mark size={32} />
    </div>,
  )
  void import('./App').then(({ App }) =>
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    ),
  )
}
