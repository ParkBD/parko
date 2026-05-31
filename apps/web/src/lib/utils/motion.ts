export const EASE_OUT_EXPO = [0.19, 1, 0.22, 1] as const

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.35, ease: EASE_OUT_EXPO },
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 0.2 },
}

export const slideInRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: 24 },
  transition: { duration: 0.3, ease: EASE_OUT_EXPO },
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.95 },
  transition: { duration: 0.2, ease: EASE_OUT_EXPO },
}

export const staggerContainer = (delay = 0.06) => ({
  animate: { transition: { staggerChildren: delay } },
})

export const cardHover = {
  whileHover: { y: -2, transition: { duration: 0.2 } },
}

export const tapScale = {
  whileTap: { scale: 0.97 },
}
