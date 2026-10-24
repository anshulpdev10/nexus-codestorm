import { useState } from 'react'
import {
  useFloating, useHover, useFocus, useDismiss,
  useRole, useInteractions, FloatingPortal,
  offset, flip, shift, autoUpdate,
} from '@floating-ui/react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Tooltip({ children, label, placement = 'top' }) {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip(), shift({ padding: 6 })],
  })

  const hover    = useHover(context, { move: false })
  const focus    = useFocus(context)
  const dismiss  = useDismiss(context)
  const role     = useRole(context, { role: 'tooltip' })
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role])

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()} className="inline-flex">
        {children}
      </span>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              // refs.setFloating is a callback ref, not a ref read; this is the documented Floating UI usage
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              initial={{ opacity: 0, scale: 0.92, y: placement === 'top' ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="z-[9999] px-2.5 py-1.5 rounded-lg bg-gray-800 border border-white/10 text-xs text-gray-200 shadow-xl pointer-events-none whitespace-nowrap"
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  )
}
