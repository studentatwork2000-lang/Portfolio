import { useEffect, useRef } from 'react'
import styles from './Aesthetics.module.css'

const offerings = ['Tailored Design', 'Clear Structure', 'Polished Interaction']

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const range = (progress: number, start: number, end: number) =>
  clamp((progress - start) / (end - start))
const ease = (value: number) => value * value * (3 - 2 * value)

function PlantStudy() {
  return (
    <figure
      className={styles.plantStudy}
      role="img"
      aria-label="A temporary sculptural plant study: four different geometric fruits grow from one adaptable stem."
    >
      <svg className={styles.plantArtwork} viewBox="0 0 720 780" aria-hidden="true">
        <defs>
          <linearGradient id="pot-surface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#788087" />
            <stop offset="1" stopColor="#343f49" />
          </linearGradient>
        </defs>

        <ellipse className={styles.groundShadow} cx="382" cy="722" rx="180" ry="25" />

        <g className={styles.stems}>
          <path d="M376 627 C374 520 357 420 374 300 C381 246 405 188 449 139" />
          <path d="M371 502 C318 441 260 391 205 323 C183 296 166 262 157 228" />
          <path d="M372 447 C431 410 482 367 522 309 C540 283 552 255 557 225" />
          <path d="M369 555 C424 536 478 514 527 476 C550 459 569 438 584 414" />
        </g>

        <g className={styles.leaves}>
          <path d="M329 450 C274 432 240 388 245 346 C298 352 334 386 329 450 Z" />
          <path d="M384 398 C408 337 453 309 497 318 C487 372 444 403 384 398 Z" />
          <path d="M351 536 C302 519 273 483 278 448 C324 451 354 486 351 536 Z" />
          <path d="M400 520 C431 467 476 447 515 462 C497 510 455 530 400 520 Z" />
          <path d="M381 306 C345 269 338 222 359 188 C399 215 409 258 381 306 Z" />
          <path d="M414 259 C428 206 465 174 503 176 C499 221 467 253 414 259 Z" />
        </g>

        <g className={styles.fruits}>
          <circle className={styles.circleFruit} cx="456" cy="120" r="45" />
          <path
            className={styles.starFruit}
            d="M157 164 L174 197 L211 202 L184 228 L191 265 L157 247 L124 265 L130 228 L103 202 L140 197 Z"
          />
          <path className={styles.diamondFruit} d="M558 178 L607 217 L558 258 L509 217 Z" />
          <path className={styles.diamondFacet} d="M558 178 L558 258 L607 217 Z" />
          <path className={styles.triangleFruit} d="M584 353 L635 438 L533 438 Z" />
        </g>

        <g className={styles.pot}>
          <path d="M246 582 L487 582 L462 711 L276 711 Z" />
          <path className={styles.potRim} d="M232 565 H501 V602 H232 Z" />
          <path className={styles.potHighlight} d="M270 617 L290 688" />
        </g>

        <path className={styles.baseline} d="M188 724 H555" />
      </svg>
    </figure>
  )
}

export default function Aesthetics() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const flowFallback = window.matchMedia('(max-width: 820px), (max-height: 700px)')

    const update = () => {
      frameRef.current = null
      const bounds = section.getBoundingClientRect()
      const useFlow = reducedMotion.matches || flowFallback.matches

      section.dataset.flow = useFlow ? 'true' : 'false'
      if (useFlow) {
        section.style.setProperty('--aesthetics-progress', '1')
        section.style.setProperty('--aesthetics-heading-progress', '1')
        section.style.setProperty('--aesthetics-composition-progress', '1')
        return
      }

      if (bounds.bottom < -window.innerHeight || bounds.top > window.innerHeight * 2) return

      const travel = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = clamp(-bounds.top / travel)
      section.style.setProperty('--aesthetics-progress', progress.toFixed(4))
      section.style.setProperty(
        '--aesthetics-heading-progress',
        ease(range(progress, 0.18, 0.48)).toFixed(4),
      )
      section.style.setProperty(
        '--aesthetics-composition-progress',
        ease(range(progress, 0.35, 0.62)).toFixed(4),
      )
    }

    const requestUpdate = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    reducedMotion.addEventListener('change', requestUpdate)
    flowFallback.addEventListener('change', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      reducedMotion.removeEventListener('change', requestUpdate)
      flowFallback.removeEventListener('change', requestUpdate)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.aesthetics}
      aria-labelledby="aesthetics-heading"
    >
      <div className={styles.stickyStage}>
        <header className={styles.headingField}>
          <p className={styles.chapterLabel}>03 / Aesthetics</p>
          <h2 id="aesthetics-heading">Aesthetics that fit you.</h2>
        </header>

        <div className={styles.composition}>
          <PlantStudy />

          <div className={styles.provide}>
            <h3>What I Provide</h3>
            <p>
              Distinct visual direction, thoughtful interactions and responsive websites designed
              around the personality and purpose of each project.
            </p>
            <ol>
              {offerings.map((offering, index) => (
                <li key={offering}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {offering}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
