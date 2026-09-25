// @types/react 18 에는 popover 속성이 없어서 보강한다. ToastHost 가 top layer 에 뜨기 위해 쓴다.
import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    popover?: 'auto' | 'manual' | ''
  }
}
