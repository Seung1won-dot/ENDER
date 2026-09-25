import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './styles/global.css'
import { registerSW } from 'virtual:pwa-register'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
