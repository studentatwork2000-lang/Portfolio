import { useEffect, useRef } from 'react'
import styles from './IntroStatement.module.css'

const words = ['business', 'work', 'brand', 'self.'] as const
const welcomeLetters = [...'Welcome.']
const letterOffsets = [18, 13, 20, 15, 17, 12, 19, 14] as const
const letterRotations = [-3, 2, -2.5, 1.5, -1.5, 2.5, -2, 1] as const

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value))

const segment = (progress: number, start: number, end: number) =>
  clamp((progress - start) / (end - start))

const easeOut = (value: number) => 1 - (1 - value) ** 3
const easeInOut = (value: number) => value * value * (3 - 2 * value)
const mix = (start: number, end: number, amount: number) => start + (end - start) * amount

type IntroMetrics = {
  leadWidth: number
  wordWidths: [number, number, number, number]
  resolutionShift: number
}

export default function IntroStatement() {
  const sectionRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([])
  const leadRef = useRef<HTMLSpanElement>(null)
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([])
  const resolutionSubRef = useRef<HTMLSpanElement>(null)
  const metricsRef = useRef<IntroMetrics>({
    leadWidth: 0,
    wordWidths: [0, 0, 0, 0],
    resolutionShift: 0,
  })

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let needsMeasurement = true

    const measure = () => {
      const measuredWidths = wordRefs.current.map(
        (word) => word?.getBoundingClientRect().width ?? 0,
      ) as IntroMetrics['wordWidths']
      const subtitle = resolutionSubRef.current
      const gap = subtitle
        ? Number.parseFloat(window.getComputedStyle(subtitle).marginTop) || 0
        : 0
      const subtitleHeight = subtitle?.getBoundingClientRect().height ?? 0

      metricsRef.current = {
        leadWidth: leadRef.current?.getBoundingClientRect().width ?? 0,
        wordWidths: measuredWidths,
        resolutionShift: (gap + subtitleHeight) / 2,
      }
    }

    const setSectionValue = (name: string, value: number, unit = '') => {
      section.style.setProperty(name, `${Number(value.toFixed(4))}${unit}`)
    }

    const update = () => {
      frameRef.current = null
      if (motionQuery.matches) return

      if (needsMeasurement) {
        measure()
        needsMeasurement = false
      }

      const bounds = section.getBoundingClientRect()
      const travel = Math.max(1, section.offsetHeight - window.innerHeight)
      const progress = clamp(-bounds.top / travel)

      const welcomeExit = easeInOut(segment(progress, 0.29, 0.38))
      letterRefs.current.forEach((letter, index) => {
        if (!letter) return
        const entrance = easeOut(segment(progress, index * 0.0043, 0.13 + index * 0.0043))
        const spread = (index - (welcomeLetters.length - 1) / 2) * 0.7 * welcomeExit
        letter.style.setProperty('--letter-x', `${Number(spread.toFixed(3))}px`)
        letter.style.setProperty(
          '--letter-y',
          `${Number((letterOffsets[index] * (1 - entrance) - 16 * welcomeExit).toFixed(3))}px`,
        )
        letter.style.setProperty(
          '--letter-rotation',
          `${Number((letterRotations[index] * (1 - entrance)).toFixed(3))}deg`,
        )
        letter.style.setProperty('--letter-opacity', String(entrance * (1 - welcomeExit)))
        letter.style.setProperty(
          '--letter-blur',
          `${Number((1.8 * (1 - entrance) + 0.65 * welcomeExit).toFixed(3))}px`,
        )
      })
      setSectionValue('--welcome-tracking', -0.05 + welcomeExit * 0.025, 'em')

      const businessIn = easeOut(segment(progress, 0.29, 0.38))
      const businessToWork = easeInOut(segment(progress, 0.49, 0.56))
      const workEntrance = easeInOut(segment(progress, 0.5, 0.56))
      const workToBrand = easeInOut(segment(progress, 0.63, 0.7))
      const brandEntrance = easeInOut(segment(progress, 0.64, 0.7))
      const brandToSelf = easeInOut(segment(progress, 0.77, 0.84))
      const selfEntrance = easeInOut(segment(progress, 0.78, 0.84))
      const gapClose = easeInOut(segment(progress, 0.77, 0.835))
      const wordStates = [
        {
          y: 105 * (1 - businessIn) - 108 * businessToWork,
          opacity: businessIn * (1 - businessToWork),
          scale: 0.975 + businessIn * 0.025 - businessToWork * 0.01,
          blur: (1 - businessIn) * 0.8 + businessToWork * 0.65,
        },
        {
          y: 108 * (1 - workEntrance) - 108 * workToBrand,
          opacity: workEntrance * (1 - workToBrand),
          scale: 0.975 + workEntrance * 0.025 - workToBrand * 0.01,
          blur: (1 - workEntrance) * 0.8 + workToBrand * 0.65,
        },
        {
          y: 108 * (1 - brandEntrance) - 108 * brandToSelf,
          opacity: brandEntrance * (1 - brandToSelf),
          scale: 0.975 + brandEntrance * 0.025 - brandToSelf * 0.01,
          blur: (1 - brandEntrance) * 0.8 + brandToSelf * 0.65,
        },
        {
          y: 108 * (1 - selfEntrance),
          opacity: selfEntrance,
          scale: 0.975 + selfEntrance * 0.025,
          blur: (1 - selfEntrance) * 0.8,
        },
      ]

      wordRefs.current.forEach((word, index) => {
        if (!word) return
        const state = wordStates[index]
        word.style.setProperty('--word-y', `${Number(state.y.toFixed(3))}%`)
        word.style.setProperty('--word-opacity', String(state.opacity))
        word.style.setProperty('--word-scale-y', String(state.scale))
        word.style.setProperty('--word-blur', `${Number(state.blur.toFixed(3))}px`)
      })

      const [businessWidth, workWidth, brandWidth, selfWidth] = metricsRef.current.wordWidths
      let currentWordWidth = businessWidth
      if (progress >= 0.49 && progress < 0.56) {
        currentWordWidth = mix(businessWidth, workWidth, businessToWork)
      } else if (progress >= 0.56 && progress < 0.63) {
        currentWordWidth = workWidth
      } else if (progress >= 0.63 && progress < 0.7) {
        currentWordWidth = mix(workWidth, brandWidth, workToBrand)
      } else if (progress >= 0.7 && progress < 0.77) {
        currentWordWidth = brandWidth
      } else if (progress >= 0.77 && progress < 0.84) {
        currentWordWidth = mix(brandWidth, selfWidth, brandToSelf)
      } else if (progress >= 0.84) {
        currentWordWidth = selfWidth
      }

      setSectionValue('--word-width', currentWordWidth, 'px')
      setSectionValue('--lead-y', 105 * (1 - businessIn), '%')
      setSectionValue('--lead-opacity', businessIn)
      setSectionValue('--presentation-gap', 0.22 * (1 - gapClose), 'em')
      setSectionValue('--mobile-lead-x', -(currentWordWidth / 2) * gapClose, 'px')
      setSectionValue('--mobile-word-x', (metricsRef.current.leadWidth / 2) * gapClose, 'px')
      setSectionValue('--mobile-stack-shift', 0.6 * gapClose, 'em')

      const subtitleReveal = easeInOut(segment(progress, 0.9, 0.95))
      setSectionValue(
        '--presentation-y',
        -metricsRef.current.resolutionShift * subtitleReveal,
        'px',
      )
      setSectionValue('--subtitle-opacity', subtitleReveal)
      setSectionValue('--subtitle-y', 8 * (1 - subtitleReveal), 'px')
      setSectionValue('--light-x', mix(-170, 270, subtitleReveal), '%')
      setSectionValue('--light-opacity', Math.sin(Math.PI * subtitleReveal) * 0.72)
    }

    const requestUpdate = () => {
      if (frameRef.current !== null) return
      frameRef.current = window.requestAnimationFrame(update)
    }

    const requestMeasure = () => {
      needsMeasurement = true
      requestUpdate()
    }

    const handleMotionChange = () => requestMeasure()

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestMeasure)
    window.addEventListener('pageshow', requestMeasure)
    motionQuery.addEventListener('change', handleMotionChange)
    void document.fonts.ready.then(requestMeasure)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestMeasure)
      window.removeEventListener('pageshow', requestMeasure)
      motionQuery.removeEventListener('change', handleMotionChange)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.intro}
      id="approach"
      aria-labelledby="intro-heading"
    >
      <div className={styles.stickyStage}>
        <p className={styles.chapterLabel}>01 / Intro</p>
        <h2 id="intro-heading" className={styles.visuallyHidden}>
          Welcome. Present your business. Present your work. Present your brand. Present yourself.
          In a beautiful way.
        </h2>

        <div className={styles.copyStage} aria-hidden="true">
          <p className={styles.welcome}>
            {welcomeLetters.map((letter, index) => (
              <span
                className={styles.welcomeLetter}
                key={`${letter}-${index}`}
                ref={(element) => {
                  letterRefs.current[index] = element
                }}
              >
                {letter}
              </span>
            ))}
          </p>

          <div className={styles.presentation}>
            <span className={styles.leadViewport}>
              <span className={styles.lead} ref={leadRef}>
                Present your
              </span>
            </span>
            <span className={styles.wordViewport}>
              {words.map((word, index) => (
                <span
                  className={styles.word}
                  key={word}
                  data-word={word}
                  ref={(element) => {
                    wordRefs.current[index] = element
                  }}
                >
                  {word}
                </span>
              ))}
            </span>
            <span className={styles.resolutionSub} ref={resolutionSubRef}>
              In a beautiful way.
            </span>
          </div>

          <div className={styles.reducedSequence}>
            <p className={styles.reducedWelcome}>Welcome.</p>
            <div className={styles.reducedStatements}>
              <p>Present your business</p>
              <p>Present your work</p>
              <p>Present your brand</p>
              <p>Present yourself.</p>
            </div>
            <p className={styles.reducedSubtitle}>In a beautiful way.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
