import { useEffect, useRef } from 'react'
import styles from './WorkStarField.module.css'

type Star = {
  readonly u: number
  readonly v: number
  radius: number
  opacity: number
  depth: number
  frost: boolean
}

function createStars(): Star[] {
  let seed = 0x725773
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
  const pocket = (u: number, v: number, x: number, y: number, w: number, h: number) =>
    Math.exp(-(((u - x) / w) ** 2 + ((v - y) / h) ** 2))
  const stars: Star[] = []
  while (stars.length < 640) {
    const u = random()
    const v = random()
    // Broad, overlapping probability patches leave irregular pockets and voids.
    // They shape placement only; there is no painted haze or background texture.
    const richness = 0.47
      + 0.26 * pocket(u, v, 0.29, 0.31, 0.23, 0.3)
      + 0.21 * pocket(u, v, 0.77, 0.46, 0.27, 0.24)
      + 0.14 * pocket(u, v, 0.58, 0.79, 0.18, 0.26)
      - 0.28 * pocket(u, v, 0.48, 0.55, 0.19, 0.16)
    const corners = 1 - 0.84 * Math.max(
      pocket(u, v, 0, 1, 0.28, 0.3),
      pocket(u, v, 1, 1, 0.28, 0.3),
    )
    if (random() > richness * corners) continue
    const depth = random()
    const bright = random() > 0.955
    stars.push({
      u, v, depth,
      radius: bright ? 0.72 + random() * 0.2 : 0.42 + random() * 0.25,
      opacity: bright ? 0.8 + random() * 0.12 : 0.52 + random() * 0.24,
      frost: random() > 0.62,
    })
  }
  return stars
}

const stars = createStars()

// Cache two tiny, soft point sprites once per mount. Interaction neither grows
// stars nor allocates gradients/buffers each frame, even on modest hardware.
function createPointSprite(frost: boolean) {
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 32
  const context = sprite.getContext('2d')!
  const color = frost ? '242, 245, 245' : '255, 255, 255'
  const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16)
  glow.addColorStop(0, `rgba(${color}, 1)`)
  glow.addColorStop(0.22, `rgba(${color}, 0.85)`)
  glow.addColorStop(0.5, `rgba(${color}, 0.32)`)
  glow.addColorStop(0.75, `rgba(${color}, 0.07)`)
  glow.addColorStop(1, `rgba(${color}, 0)`)
  context.fillStyle = glow
  context.fillRect(0, 0, 32, 32)
  return sprite
}

type MovingStar = { star: Star; x: number; y: number; influence: number }

// Calibrated against visible Hero points at matching aspect ratios, rather than
// its full spherical population. Narrow screens retain the same tiny star sizes.
function visibleCount(width: number, height: number) {
  const aspect = width / height
  const vertical = Math.tan(29 * Math.PI / 180)
  const horizontal = vertical * aspect
  const coverage = Math.atan(horizontal * vertical / Math.sqrt(1 + horizontal ** 2 + vertical ** 2)) / Math.PI
  return Math.min(stars.length, Math.max(70, Math.round(2476 * coverage * 1.55 * (0.84 + 0.105 * aspect))))
}

export default function WorkStarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const section = canvas?.parentElement
    const context = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !section || !context) return
    let inView = false
    let width = 0
    let height = 0
    let frame: number | null = null
    let lastTime = 0
    let movingStars: MovingStar[] = []
    const pointer = { x: 0, y: 0, active: false }
    const pointSprites = [createPointSprite(false), createPointSprite(true)]
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canInteract = () => finePointer.matches && !reducedMotion.matches
    const isVisible = () => inView && !document.hidden

    // An opaque canvas has a black initial buffer: match the section before its
    // first intersection notification, without allocating an offscreen field.
    context.fillStyle = '#030405'
    context.fillRect(0, 0, canvas.width, canvas.height)

    const draw = () => {
      if (!isVisible() || !width || !height) return
      context.globalAlpha = 1
      context.fillStyle = '#030405'
      context.fillRect(0, 0, width, height)
      for (const { star, x, y, influence } of movingStars) {
        const extent = star.radius * 2
        context.globalAlpha = star.opacity + influence * 0.04
        context.drawImage(pointSprites[Number(star.frost)], x - extent, y - extent, extent * 2, extent * 2)
      }
      context.globalAlpha = 1
    }

    const cancelFrame = () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null
      lastTime = 0
    }

    const resetStars = () => {
      for (const state of movingStars) {
        state.x = state.star.u * width
        state.y = state.star.v * height
        state.influence = 0
      }
    }

    const resize = () => {
      const bounds = section.getBoundingClientRect()
      // Resize/scroll can overtake an intersection notification. Read current
      // bounds so a visible field never retains an older canvas size.
      inView = bounds.bottom > 0 && bounds.top < window.innerHeight
        && bounds.right > 0 && bounds.left < window.innerWidth
      if (!isVisible() || !bounds.width || !bounds.height) return
      const scale = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(3_000_000 / (bounds.width * bounds.height)))
      const pixelWidth = Math.round(bounds.width * scale)
      const pixelHeight = Math.round(bounds.height * scale)
      if (width === bounds.width && height === bounds.height && canvas.width === pixelWidth && canvas.height === pixelHeight) return
      cancelFrame()
      pointer.active = false
      width = bounds.width
      height = bounds.height
      canvas.width = pixelWidth
      canvas.height = pixelHeight
      context.setTransform(scale, 0, 0, scale, 0, 0)
      movingStars = stars.slice(0, visibleCount(width, height)).map(star => ({
        star, x: star.u * width, y: star.v * height, influence: 0,
      }))
      draw()
    }

    const animate = (now: number) => {
      frame = null
      if (!isVisible()) return
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000))
      lastTime = now
      const radius = Math.min(480, Math.max(320, Math.min(width * 0.36, height * 0.55)))
      let settled = true
      for (const state of movingStars) {
        const { star } = state
        const restX = star.u * width
        const restY = star.v * height
        const dx = pointer.x - restX
        const dy = pointer.y - restY
        const distance = pointer.active ? Math.min(1, Math.hypot(dx, dy) / radius) : 1
        // Always measure ORIGINAL position against the CURRENT cursor. Smooth,
        // bounded compression preserves the sky's irregular spacing; no slots,
        // rings, accumulated forces, or stars pinned to a travelling center.
        // r' = r * (1 - a * (1 - (r/R)^3)^2) is monotonic: no ring caustic
        // or collapsed central knot. Attraction and its slope vanish at R.
        const influence = (1 - distance ** 3) ** 2
        const attraction = 0.9 * (0.98 + star.depth * 0.02) * influence
        const targetX = restX + dx * attraction
        const targetY = restY + dy * attraction
        // Release faster as the cursor leaves a star's HOME region, even while
        // the pointer remains active elsewhere. No oscillating spring or tail.
        const response = influence < state.influence ? 20 : 11
        const ease = 1 - Math.exp(-response * delta)
        state.x += (targetX - state.x) * ease
        state.y += (targetY - state.y) * ease
        state.influence += (influence - state.influence) * ease
        if (Math.abs(targetX - state.x) < 0.015 && Math.abs(targetY - state.y) < 0.015 && Math.abs(influence - state.influence) < 0.001) {
          state.x = targetX
          state.y = targetY
          state.influence = influence
        } else {
          settled = false
        }
      }
      draw()
      if (!settled) frame = window.requestAnimationFrame(animate)
      else lastTime = 0
    }

    const wake = () => {
      if (!isVisible() || frame !== null) return
      lastTime = performance.now()
      frame = window.requestAnimationFrame(animate)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !canInteract() || !isVisible()) return
      const bounds = section.getBoundingClientRect()
      pointer.x = event.clientX - bounds.left
      pointer.y = event.clientY - bounds.top
      pointer.active = true
      wake()
    }

    const releasePointer = (event?: Event) => {
      if (event?.type === 'scroll') resize()
      if (!pointer.active) return
      pointer.active = false
      wake()
    }

    const syncVisibility = () => {
      cancelFrame()
      pointer.active = false
      resize()
      if (!isVisible()) return
      resetStars()
      draw()
    }

    const syncInput = () => {
      cancelFrame()
      pointer.active = false
      resetStars()
      draw()
    }

    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(syncVisibility)
    resizeObserver.observe(section)
    intersectionObserver.observe(section)
    section.addEventListener('pointermove', onPointerMove, { passive: true })
    section.addEventListener('pointerleave', releasePointer)
    section.addEventListener('pointercancel', releasePointer)
    window.addEventListener('blur', releasePointer)
    window.addEventListener('scroll', releasePointer, { passive: true })
    window.addEventListener('resize', resize, { passive: true })
    document.addEventListener('visibilitychange', syncVisibility)
    for (const query of [finePointer, reducedMotion]) query.addEventListener('change', syncInput)
    return () => {
      cancelFrame()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      section.removeEventListener('pointermove', onPointerMove)
      section.removeEventListener('pointerleave', releasePointer)
      section.removeEventListener('pointercancel', releasePointer)
      window.removeEventListener('blur', releasePointer)
      window.removeEventListener('scroll', releasePointer)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', syncVisibility)
      for (const query of [finePointer, reducedMotion]) query.removeEventListener('change', syncInput)
    }
  }, [])

  return (
    <section id="work" className={`work-placeholder ${styles.work}`} aria-label="Work">
      <canvas ref={canvasRef} className={styles.field} aria-hidden="true" />
    </section>
  )
}
