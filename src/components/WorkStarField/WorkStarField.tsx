import { useEffect, useRef } from 'react'
import styles from './WorkStarField.module.css'

type Star = {
  u: number
  v: number
  radius: number
  opacity: number
  depth: number
  frost: boolean
  clusterX: number
  clusterY: number
  layer: 'core' | 'ring' | 'outer'
  clusterLight: number
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
      clusterX: 0, clusterY: 0, layer: 'core', clusterLight: 1,
      radius: bright ? 0.8 + random() * 0.3 : 0.42 + random() * 0.27,
      opacity: bright ? 0.65 + random() * 0.12 : 0.3 + random() * 0.3,
      frost: random() > 0.62,
    })
  }
  // Use a separate seed so formation changes never alter the resting field.
  let formationSeed = 0x73617475
  const variation = () => {
    formationSeed = (Math.imul(formationSeed, 1664525) + 1013904223) >>> 0
    return formationSeed / 4294967296
  }
  const slots = { core: 0, ring: 0, outer: 0 }
  const tilt = -20 * Math.PI / 180
  for (const star of stars) {
    const layer = variation()
    star.layer = layer < 0.42 ? 'core' : layer < 0.78 ? 'ring' : 'outer'
    // Low-discrepancy angles with fixed jitter leave organic gaps and overlaps.
    // Every star keeps its own slot, even as the influence population changes.
    const angle = slots[star.layer]++ * 2.399963229728653 + (variation() - 0.5) * 0.28
    let x: number
    let y: number
    if (star.layer === 'core') {
      const radius = 24 * Math.sqrt(variation()) * (0.88 + star.depth * 0.12)
      x = Math.cos(angle) * radius
      y = Math.sin(angle) * radius * 0.96
      star.clusterLight = 0.96 + star.depth * 0.04
    } else {
      const outer = star.layer === 'outer'
      const radial = 1 + (variation() - 0.5) * (outer ? 0.085 : 0.075)
        + Math.sin(angle * 3 + 0.7) * 0.018
      x = Math.cos(angle) * (outer ? 108 : 78) * radial
      y = Math.sin(angle) * (outer ? 49 : 35) * radial + (star.depth - 0.5) * 3
      // Far-side layers are subtly dimmer; the outer ring stays subordinate.
      star.clusterLight = (outer ? 0.52 : 0.84) + (Math.sin(angle) + 1) * 0.045
    }
    star.clusterX = x * Math.cos(tilt) - y * Math.sin(tilt)
    star.clusterY = x * Math.sin(tilt) + y * Math.cos(tilt)
  }
  return stars
}

const stars = createStars()

type MovingStar = { star: Star; x: number; y: number; influence: number }

// Calibrated against visible Hero points at matching aspect ratios, rather than
// its full spherical population. Narrow screens retain the same tiny star sizes.
function visibleCount(width: number, height: number) {
  const aspect = width / height
  const vertical = Math.tan(29 * Math.PI / 180)
  const horizontal = vertical * aspect
  const coverage = Math.atan(horizontal * vertical / Math.sqrt(1 + horizontal ** 2 + vertical ** 2)) / Math.PI
  return Math.min(stars.length, Math.max(70, Math.round(2476 * coverage * 1.40 * (0.84 + 0.105 * aspect))))
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
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false }
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const touchPointer = window.matchMedia('(any-pointer: coarse)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const canInteract = () => finePointer.matches && !touchPointer.matches && !reducedMotion.matches
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
        const growth = star.layer === 'core' ? 0.3 : star.layer === 'ring' ? 0.18 : 0.08
        const radius = star.radius * (1 + influence * (growth + star.depth * 0.12))
        const gatheredOpacity = Math.min(0.95, star.opacity + 0.22 + star.depth * 0.1) * star.clusterLight
        const opacity = star.opacity + (gatheredOpacity - star.opacity) * influence
        context.fillStyle = star.frost ? '#f2f5f5' : '#ffffff'
        context.globalAlpha = opacity * (0.12 + influence * 0.1)
        context.beginPath()
        context.arc(x, y, radius * (1.7 + influence * 0.55), 0, Math.PI * 2)
        context.fill()
        context.globalAlpha = opacity
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
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
      // Damping the formation's center keeps fast pointer travel composed.
      if (pointer.active) {
        const follow = 1 - Math.exp(-9 * delta)
        pointer.x += (pointer.targetX - pointer.x) * follow
        pointer.y += (pointer.targetY - pointer.y) * follow
        if (Math.hypot(pointer.targetX - pointer.x, pointer.targetY - pointer.y) < 0.015) {
          pointer.x = pointer.targetX
          pointer.y = pointer.targetY
        }
      }
      const radius = Math.min(560, Math.max(320, Math.min(width * 0.38, height * 0.6)))
      let settled = !pointer.active || (pointer.x === pointer.targetX && pointer.y === pointer.targetY)
      for (const state of movingStars) {
        const { star } = state
        const restX = star.u * width
        const restY = star.v * height
        const dx = pointer.x - restX
        const dy = pointer.y - restY
        const distance = pointer.active ? Math.min(1, Math.hypot(dx, dy) / radius) : 1
        // A broad plateau fully repacks nearby stars; a soft outer boundary
        // recruits/releases stars continuously without reassigning their slots.
        const gathering = Math.max(0, Math.min(1, (1 - distance) / 0.2))
        const influence = gathering * gathering * (3 - 2 * gathering)
        const targetX = restX + (pointer.x + star.clusterX - restX) * influence
        const targetY = restY + (pointer.y + star.clusterY - restY) * influence
        const response = pointer.active ? 7 + star.depth * 1.5 : 8 + star.depth * 2
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
      pointer.targetX = event.clientX - bounds.left
      pointer.targetY = event.clientY - bounds.top
      if (!pointer.active) {
        pointer.x = pointer.targetX
        pointer.y = pointer.targetY
      }
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
    for (const query of [finePointer, touchPointer, reducedMotion]) query.addEventListener('change', syncInput)
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
      for (const query of [finePointer, touchPointer, reducedMotion]) query.removeEventListener('change', syncInput)
    }
  }, [])

  return (
    <section id="work" className={`work-placeholder ${styles.work}`} aria-label="Work">
      <canvas ref={canvasRef} className={styles.field} aria-hidden="true" />
    </section>
  )
}
