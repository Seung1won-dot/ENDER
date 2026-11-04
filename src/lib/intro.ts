// 첫 화면(로그인, 빈 상자)에서만 쓰는 짧은 "상자 열림" 연출. Anime.js v4.
// 목록·버튼 같은 반복 동작은 Motion(src/lib/motion.ts) 이 맡고, 여기는 한 번 보고 끝나는 장면만 다룬다.
// animejs 는 이 장면에서만 쓰므로 동적 import 로 따로 불러와 초기 번들에 넣지 않는다.
import { prefersReducedMotion } from './motion'

/** 이 클래스가 붙어 있는 동안 [data-intro] 요소는 숨는다(애니메이션 코드가 오기 전의 깜빡임 방지). */
const PENDING = 'intro-pending'
/** animejs 를 못 불러오면 이 시간 뒤 그냥 보여 준다 */
const FALLBACK_MS = 500

/**
 * root 안의 상자 마크(.mark-lid, .mark-eye)가 뚜껑을 살짝 들었다 닫으며 눈을 켜고,
 * 같은 순간 [data-intro] 요소들이 차례로 6px 올라오며 나타난다. 전체 약 0.6초, 입력을 막지 않는다.
 * 돌려주는 함수는 연출을 되돌린다(언마운트·StrictMode 재실행 대비).
 */
export function playChestIntro(root: HTMLElement): () => void {
  if (prefersReducedMotion()) return () => {}

  let cancelled = false
  let revert: (() => void) | null = null
  root.classList.add(PENDING)
  const reveal = () => root.classList.remove(PENDING)
  const fallback = window.setTimeout(reveal, FALLBACK_MS)

  void import('animejs')
    .then(({ createTimeline, cubicBezier, stagger }) => {
      if (cancelled) return
      const ease = cubicBezier(0.2, 0.8, 0.2, 1)
      const lid = root.querySelector<SVGElement>('.mark-lid')
      const eye = root.querySelector<SVGElement>('.mark-eye')
      const items = root.querySelectorAll<HTMLElement>('[data-intro]')

      const tl = createTimeline({ defaults: { ease } })
      if (items.length > 0) {
        tl.add(items, { opacity: [0, 1], translateY: [6, 0], duration: 240, delay: stagger(40, { start: 40 }) }, 0)
      }
      if (lid) {
        tl.add(lid, { translateY: [0, -2.5], rotate: [0, -7], duration: 240 }, 60)
        tl.add(lid, { translateY: 0, rotate: 0, duration: 220 })
      }
      if (eye) tl.add(eye, { opacity: [0, 1], scale: [0.5, 1], duration: 260 }, 180)
      // 시작 값(opacity 0)이 적용된 뒤에 숨김 클래스를 걷어야 깜빡이지 않는다.
      window.clearTimeout(fallback)
      reveal()
      revert = () => tl.revert()
    })
    .catch(reveal)

  return () => {
    cancelled = true
    window.clearTimeout(fallback)
    reveal()
    revert?.()
  }
}
