import { motion, AnimatePresence } from 'framer-motion'

/** Animated error message for form fields — fades and expands in rather
 * than popping, so validation feedback reads as a smooth state change
 * instead of a jarring layout jump. */
export function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-xs text-red-600 dark:text-red-400 overflow-hidden"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}