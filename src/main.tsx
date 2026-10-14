import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/hahmlet/600.css'
import '@fontsource/hahmlet/latin-800.css'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('#root 를 찾을 수 없습니다.')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 오프라인 지원 (PRD §5) — 개발 중에는 캐시가 방해되므로 빌드본에서만 등록한다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // 서비스 워커를 쓸 수 없어도 게임은 그대로 동작한다.
    })
  })
}
