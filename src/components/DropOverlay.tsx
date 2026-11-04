import { AnimatePresence, m } from 'motion/react'
import { EASE } from '../lib/motion'
import { Icon } from './Icon'

export function DropOverlay({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <m.div
          className="drop-overlay"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: EASE }}
        >
          <m.div
            className="drop-box"
            initial={{ scale: 0.97, y: 4 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <Icon name="upload" size={22} />
            여기에 놓으면 상자에 들어가요
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
