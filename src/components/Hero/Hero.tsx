import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import BulbMark from './BulbMark'
import CssSkyFallback from './CssSkyFallback'
import CelestialAccents from './CelestialAccents'
import type { SkyPointer } from './CelestialSky'
import styles from './Hero.module.css'

// The DOM Hero and CSS sky can paint before the optional WebGL code arrives.
const CelestialSky = lazy(() => import('./CelestialSky').catch(() => ({ default: () => <CssSkyFallback /> })))
const navItems = ['Work', 'Approach', 'Contact']

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const pointerRef = useRef<SkyPointer>({
    x: 0, y: 0, enabled: false, reducedMotion: false, invalidate: () => {},
    onDrift: (x, y) => {
      heroRef.current?.style.setProperty('--sky-drift-x', `${x}px`)
      heroRef.current?.style.setProperty('--sky-drift-y', `${y}px`)
    },
  })
  const [isLit, setIsLit] = useState(false)

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncInput = () => {
      pointerRef.current.enabled = finePointer.matches && !reducedMotion.matches
      pointerRef.current.reducedMotion = reducedMotion.matches
      resetDepth()
    }
    syncInput()
    finePointer.addEventListener('change', syncInput)
    reducedMotion.addEventListener('change', syncInput)
    window.addEventListener('blur', resetDepth)
    return () => {
      finePointer.removeEventListener('change', syncInput)
      reducedMotion.removeEventListener('change', syncInput)
      window.removeEventListener('blur', resetDepth)
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const writeDepth = (x: number, y: number) => {
    const hero = heroRef.current
    if (!hero) return

    hero.style.setProperty('--depth-bulb-x', `${y * -1.1}deg`)
    hero.style.setProperty('--depth-bulb-y', `${x * 1.5}deg`)
    hero.style.setProperty('--depth-sky-x', `${x * -20}px`)
    hero.style.setProperty('--depth-sky-y', `${y * -16}px`)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || !pointerRef.current.enabled) return
    if ((event.target as Element).closest('[data-bulb-control]')) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const pointer = pointerRef.current
    pointer.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2))
    pointer.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2))
    pointer.invalidate()

    if (frameRef.current !== null) return

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      writeDepth(pointerRef.current.x, pointerRef.current.y)
    })
  }

  const resetDepth = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    pointerRef.current.x = 0
    pointerRef.current.y = 0
    pointerRef.current.invalidate()
    writeDepth(0, 0)
  }

  return (
    <main
      ref={heroRef}
      id="top"
      className={styles.hero}
      data-light={isLit ? 'on' : 'off'}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetDepth}
    >
      <Suspense fallback={<CssSkyFallback />}>
        <CelestialSky pointer={pointerRef} />
      </Suspense>
      <div className={styles.skyVeil} aria-hidden="true" />
      <CelestialAccents />

      <header className={styles.topBar}>
        <a className={styles.wordmark} href="#top" aria-label="Rishav Web Studio, home">
          Rishav Web Studio
        </a>
        <nav aria-label="Primary navigation">
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item}>
                <a href={`#${item.toLowerCase()}`}>{item}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section className={styles.titleRegion} aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.visuallyHidden}>
          Rishav Web Studio
        </h1>
        <p className={styles.eyebrow}>Independent by design.</p>
        <div className={styles.titleVisual}>
          <span className={styles.firstLine} data-text="RISHAV" aria-hidden="true">
            RISHAV
          </span>
          <span className={styles.secondLine}>
            <span className={styles.titleText} aria-hidden="true">WEB</span>
            <span className={styles.studioWord}>
              <span className={`${styles.titleText} ${styles.titleLead}`} aria-hidden="true">STUD</span>
              <BulbMark isLit={isLit} onToggle={() => setIsLit((current) => !current)} />
              <span className={`${styles.titleText} ${styles.titleTail}`} aria-hidden="true">O</span>
            </span>
          </span>
        </div>
        <p className={styles.location}>
          <span>Independent web design &amp; development</span>
          <span>Based in India <span aria-hidden="true">·</span> Creating worldwide</span>
        </p>
      </section>

      <footer className={styles.bottomBar}>
        <p className={styles.interactionHint}>
          <span className={styles.hintDot} aria-hidden="true" />
          Pull the cord. Light an idea.
        </p>
        <a className={styles.scrollPrompt} href="#approach">
          Scroll to explore <span aria-hidden="true">↓</span>
        </a>
      </footer>
    </main>
  )
}
