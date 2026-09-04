import { useEffect, useRef, useState } from 'react'
import BulbMark from './BulbMark'
import StudioLineArt from './StudioLineArt'
import styles from './Hero.module.css'

const navItems = ['Work', 'Approach', 'Contact']

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const nextDepthRef = useRef({ x: 0, y: 0 })
  const [isLit, setIsLit] = useState(false)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const writeDepth = (x: number, y: number) => {
    const hero = heroRef.current
    if (!hero) return

    hero.style.setProperty('--depth-grid-x', `${x * -1.5}px`)
    hero.style.setProperty('--depth-grid-y', `${y * -1.2}px`)
    hero.style.setProperty('--depth-drawing-x', `${x * 3.2}px`)
    hero.style.setProperty('--depth-drawing-y', `${y * 2.4}px`)
    hero.style.setProperty('--depth-bulb-x', `${y * -1.1}deg`)
    hero.style.setProperty('--depth-bulb-y', `${x * 1.5}deg`)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return
    if ((event.target as Element).closest('[data-bulb-control]')) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    nextDepthRef.current = {
      x: Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2)),
    }

    if (frameRef.current !== null) return

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null
      writeDepth(nextDepthRef.current.x, nextDepthRef.current.y)
    })
  }

  const resetDepth = () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    nextDepthRef.current = { x: 0, y: 0 }
    writeDepth(0, 0)
  }

  return (
    <main
      ref={heroRef}
      className={styles.hero}
      data-light={isLit ? 'on' : 'off'}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetDepth}
    >
      <StudioLineArt />

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

      <section className={styles.titleRegion} id="top" aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.visuallyHidden}>
          Rishav Web Studio
        </h1>
        <div className={styles.titleVisual}>
          <span className={styles.firstLine} data-text="RISHAV" aria-hidden="true">
            RISHAV
          </span>
          <span className={styles.secondLine}>
            <span className={`${styles.titleText} ${styles.titleLead}`} aria-hidden="true">WEB STUD</span>
            <BulbMark isLit={isLit} onToggle={() => setIsLit((current) => !current)} />
            <span className={`${styles.titleText} ${styles.titleTail}`} aria-hidden="true">O</span>
          </span>
        </div>
      </section>

      <footer className={styles.bottomBar}>
        <p className={styles.location}>
          <span>Independent web design &amp; development</span>
          <span>India / Worldwide</span>
        </p>
        <p className={styles.scrollPrompt}>
          Scroll to explore <span aria-hidden="true">↓</span>
        </p>
      </footer>
    </main>
  )
}
