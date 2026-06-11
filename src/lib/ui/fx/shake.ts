// Screenshake for big moments only (GAME_DESIGN.md §9.5): short, capped,
// disabled under prefers-reduced-motion. Animates the registered app
// container via the Web Animations API — no game state involved.

let target: HTMLElement | null = null

export function registerShakeTarget(el: HTMLElement | null): void {
  target = el
}

export function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** power 1 ≈ subtle thump, capped well below nausea territory. */
export function screenShake(power = 1): void {
  if (!target || reducedMotion()) return
  const amp = Math.min(8, 4 * power)
  const steps = 7
  const frames = Array.from({ length: steps }, (_, i) => {
    const falloff = 1 - i / steps
    const dx = (Math.random() * 2 - 1) * amp * falloff
    const dy = (Math.random() * 2 - 1) * amp * falloff
    return { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)` }
  })
  frames.push({ transform: 'translate(0, 0)' })
  target.animate(frames, { duration: 230, easing: 'linear' })
}
