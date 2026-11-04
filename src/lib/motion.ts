// 움직임 기준값 한 곳. DESIGN.md "Motion" 절과 같은 숫자를 쓴다.
// 이징은 cubic-bezier(0.2, 0.8, 0.2, 1) 하나뿐(튕김·오버슈트 없음), 길이는 160~240ms.
import type { Transition } from 'motion/react'

export const EASE = [0.2, 0.8, 0.2, 1] as const

/** 기본 전환: 상태 변화(나타남·사라짐·색 바뀜) */
export const T_BASE: Transition = { type: 'tween', ease: EASE, duration: 0.2 }

/** 목록 재배치(고정·삭제·새 항목으로 자리가 바뀔 때). 오버슈트 없는 tween. */
export const T_LAYOUT: Transition = { type: 'tween', ease: EASE, duration: 0.24 }

/** 선택 표시(칩·세그먼트의 미끄러지는 배경) */
export const T_INDICATOR: Transition = { type: 'tween', ease: EASE, duration: 0.18 }

/** 누를 때 살짝 들어가는 정도. 버튼에만 쓴다. */
export const TAP_SCALE = 0.97

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** LazyMotion 에 넘기는 기능 로더. 레이아웃(layout, layoutId)까지 쓰므로 domMax. */
export const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)
