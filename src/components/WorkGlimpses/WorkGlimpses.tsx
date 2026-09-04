import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import styles from './WorkGlimpses.module.css'

import restaurantImg from '../../assets/work/restaurant-preview.png'
import clinicImg from '../../assets/work/clinic-preview.png'
import motorsportImg from '../../assets/work/motorsport-preview.png'
import realEstateImg from '../../assets/work/real-estate-preview.png'

const projects = [
  {
    index: '01',
    title: 'Restaurant',
    category: 'Hospitality / Web Design',
    layout: 'restaurant',
    image: restaurantImg,
  },
  {
    index: '02',
    title: 'Clinic',
    category: 'Healthcare / Web Design',
    layout: 'clinic',
    image: clinicImg,
  },
  {
    index: '03',
    title: 'Motorsport',
    category: 'Racing Portfolio / Web Design',
    layout: 'motorsport',
    image: motorsportImg,
  },
  {
    index: '04',
    title: 'Real Estate',
    category: 'Property / Web Design',
    layout: 'real-estate',
    image: realEstateImg,
  },
] as const

// Provisional handoff copy. Kept here so the content can be revised without
// touching the transition markup or choreography.
const handoffCopy =
  'Distinct visual direction, thoughtful interactions and responsive websites designed around the personality and purpose of each project.'

const BEFORE_CLONE_PHYSICAL_INDEX = 0
const FIRST_REAL_PHYSICAL_INDEX = 1
const LAST_REAL_PHYSICAL_INDEX = projects.length
const AFTER_CLONE_PHYSICAL_INDEX = projects.length + 1

const physicalSlides = [
  {
    project: projects[projects.length - 1],
    logicalIndex: projects.length - 1,
    clone: true,
    cloneSide: 'before',
  },
  ...projects.map((project, logicalIndex) => ({
    project,
    logicalIndex,
    clone: false,
    cloneSide: null,
  })),
  {
    project: projects[0],
    logicalIndex: 0,
    clone: true,
    cloneSide: 'after',
  },
]

const logicalFromPhysical = (physicalIndex: number) =>
  physicalSlides[physicalIndex]?.logicalIndex ?? 0

const canonicalPhysicalFromLogical = (logicalIndex: number) => logicalIndex + 1

type DragState = {
  pointerId: number
  startX: number
  startScrollLeft: number
  dragged: boolean
} | null

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value))

const range = (value: number, start: number, end: number) =>
  clamp((value - start) / (end - start))

const easeInOut = (value: number) => value * value * (3 - 2 * value)
const mix = (start: number, end: number, amount: number) => start + (end - start) * amount

function CarouselArrowIcon() {
  return (
    <svg
      className={styles.arrowIcon}
      viewBox="0 0 14 22"
      width="14"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 2.5 11.5 11 3 19.5" />
    </svg>
  )
}

export default function WorkGlimpses() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingStageRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const exhibitionStageRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const panelRefs = useRef<Array<HTMLElement | null>>([])
  const lightFieldRef = useRef<HTMLDivElement>(null)
  const choreographyFrameRef = useRef<number | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const resizeFrameRef = useRef<number | null>(null)
  const scrollEndTimerRef = useRef<number | null>(null)
  const pointerRafRef = useRef<number | null>(null)
  const dragRef = useRef<DragState>(null)
  const touchActiveRef = useRef(false)
  const activeIndexRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)

  /* ── Pointer-light damping state (refs, never triggers render) ── */
  const pointerTargetRef = useRef({ x: 0.5, y: 0.5 })
  const pointerCurrentRef = useRef({ x: 0.5, y: 0.5 })
  const pointerActiveRef = useRef(false)
  const isTouchDeviceRef = useRef(false)

  /* ── Pointer-light rAF loop ── */
  const startPointerLoop = useCallback(() => {
    if (pointerRafRef.current !== null) return

    const tick = () => {
      const cur = pointerCurrentRef.current
      const tgt = pointerTargetRef.current
      const damping = 0.04
      cur.x += (tgt.x - cur.x) * damping
      cur.y += (tgt.y - cur.y) * damping

      const field = lightFieldRef.current
      if (field) {
        field.style.setProperty('--ptr-x', cur.x.toFixed(4))
        field.style.setProperty('--ptr-y', cur.y.toFixed(4))
      }
      pointerRafRef.current = requestAnimationFrame(tick)
    }
    pointerRafRef.current = requestAnimationFrame(tick)
  }, [])

  const stopPointerLoop = useCallback(() => {
    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current)
      pointerRafRef.current = null
    }
  }, [])

  /* ── Section scroll choreography ── */
  useLayoutEffect(() => {
    const section = sectionRef.current
    const headingStage = headingStageRef.current
    const heading = headingRef.current
    if (!section || !headingStage || !heading) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const shortLandscape = window.matchMedia('(max-height: 620px) and (orientation: landscape)')
    let startY = 0
    let startScale = 1.42

    const measure = () => {
      const useFlow = reducedMotion.matches || shortLandscape.matches
      section.dataset.flow = useFlow ? 'true' : 'false'

      if (useFlow) {
        startY = 0
        startScale = 1
        return
      }

      startScale = window.innerWidth <= 700 ? 1.34 : 1.42
      startY = window.innerHeight / 2 - headingStage.offsetTop - heading.offsetHeight / 2
    }

    const update = () => {
      choreographyFrameRef.current = null
      const useFlow = reducedMotion.matches || shortLandscape.matches

      if (useFlow) {
        section.style.setProperty('--work-title-y', '0px')
        section.style.setProperty('--work-title-scale', '1')
        section.style.setProperty('--work-title-opacity', '1')
        section.style.setProperty('--work-content-reveal', '1')
        section.style.setProperty('--work-exit-progress', '0')
        section.style.setProperty('--work-stack-travel', '1')
        section.style.setProperty('--work-stack-settle', '1')
        section.style.setProperty('--work-stack-visibility', '1')
        section.style.setProperty('--work-copy-reveal', '1')
        if (exhibitionStageRef.current) exhibitionStageRef.current.inert = false
        return
      }

      const bounds = section.getBoundingClientRect()
      if (bounds.top > 0) {
        section.style.setProperty('--work-title-y', `${startY.toFixed(3)}px`)
        section.style.setProperty('--work-title-scale', startScale.toFixed(4))
        const entryReveal = easeInOut(
          clamp((window.innerHeight * 0.32 - bounds.top) / (window.innerHeight * 0.18)),
        )
        section.style.setProperty('--work-title-opacity', entryReveal.toFixed(4))
        section.style.setProperty('--work-content-reveal', '0')
        section.style.setProperty('--work-exit-progress', '0')
        section.style.setProperty('--work-stack-travel', '0')
        section.style.setProperty('--work-stack-settle', '0')
        section.style.setProperty('--work-stack-visibility', '0')
        section.style.setProperty('--work-copy-reveal', '0')
        if (exhibitionStageRef.current) exhibitionStageRef.current.inert = false
        return
      }
      if (bounds.bottom < -window.innerHeight) return

      // The original Work presentation keeps its existing 170vh timing. The
      // added section height is reserved for the sideways handoff and its hold.
      const workProgress = clamp(-bounds.top / (window.innerHeight * 1.7))
      const handoffProgress = clamp(
        (-bounds.top - window.innerHeight * 1.48) / (window.innerHeight * 1.22),
      )
      const titleProgress = easeInOut(range(workProgress, 0.32, 0.6))
      const contentReveal = easeInOut(range(workProgress, 0.5, 0.72))
      const exitProgress = easeInOut(range(handoffProgress, 0, 0.25))
      const stackTravel = easeInOut(range(handoffProgress, 0.15, 0.65))
      const stackSettle = easeInOut(range(handoffProgress, 0.55, 0.85))
      const stackVisibility = easeInOut(range(handoffProgress, 0.12, 0.46))
      const copyReveal = easeInOut(range(handoffProgress, 0.65, 1))

      section.style.setProperty('--work-title-y', `${mix(startY, 0, titleProgress).toFixed(3)}px`)
      section.style.setProperty(
        '--work-title-scale',
        mix(startScale, 1, titleProgress).toFixed(4),
      )
      section.style.setProperty('--work-title-opacity', (1 - exitProgress).toFixed(4))
      section.style.setProperty('--work-content-reveal', contentReveal.toFixed(4))
      section.style.setProperty('--work-exit-progress', exitProgress.toFixed(4))
      section.style.setProperty('--work-stack-travel', stackTravel.toFixed(4))
      section.style.setProperty('--work-stack-settle', stackSettle.toFixed(4))
      section.style.setProperty('--work-stack-visibility', stackVisibility.toFixed(4))
      section.style.setProperty('--work-copy-reveal', copyReveal.toFixed(4))

      const exhibitionStage = exhibitionStageRef.current
      if (exhibitionStage) exhibitionStage.inert = handoffProgress > 0.42
    }

    const requestUpdate = () => {
      if (choreographyFrameRef.current !== null) return
      choreographyFrameRef.current = window.requestAnimationFrame(update)
    }

    const measureAndUpdate = () => {
      measure()
      requestUpdate()
    }

    measure()
    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', measureAndUpdate)
    window.addEventListener('pageshow', measureAndUpdate)
    reducedMotion.addEventListener('change', measureAndUpdate)
    shortLandscape.addEventListener('change', measureAndUpdate)
    void document.fonts.ready.then(measureAndUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', measureAndUpdate)
      window.removeEventListener('pageshow', measureAndUpdate)
      reducedMotion.removeEventListener('change', measureAndUpdate)
      shortLandscape.removeEventListener('change', measureAndUpdate)
      if (choreographyFrameRef.current !== null) {
        window.cancelAnimationFrame(choreographyFrameRef.current)
      }
    }
  }, [])

  /* ── Pointer-light setup (desktop only) ── */
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reducedMotion.matches) return

    const onFirstTouch = () => {
      isTouchDeviceRef.current = true
      stopPointerLoop()
      section.removeEventListener('touchstart', onFirstTouch)
    }
    section.addEventListener('touchstart', onFirstTouch, { passive: true, once: true })

    const handleMove = (e: globalThis.PointerEvent) => {
      if (isTouchDeviceRef.current) return
      if (e.pointerType === 'touch') return

      const rect = section.getBoundingClientRect()
      pointerTargetRef.current = {
        x: clamp((e.clientX - rect.left) / rect.width),
        y: clamp((e.clientY - rect.top) / rect.height),
      }

      if (!pointerActiveRef.current) {
        pointerActiveRef.current = true
        pointerCurrentRef.current = { ...pointerTargetRef.current }
        startPointerLoop()
      }
    }

    const handleLeave = () => {
      pointerTargetRef.current = { x: 0.5, y: 0.5 }
    }

    section.addEventListener('pointermove', handleMove, { passive: true })
    section.addEventListener('pointerleave', handleLeave, { passive: true })

    return () => {
      section.removeEventListener('pointermove', handleMove)
      section.removeEventListener('pointerleave', handleLeave)
      section.removeEventListener('touchstart', onFirstTouch)
      stopPointerLoop()
    }
  }, [startPointerLoop, stopPointerLoop])

  const getNearestPhysicalIndex = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return 0

    const viewportCentre = viewport.scrollLeft + viewport.clientWidth / 2
    let nearestIndex = 0
    let nearestDistance = Number.POSITIVE_INFINITY

    panelRefs.current.forEach((panel, index) => {
      if (!panel) return
      const panelCentre = panel.offsetLeft + panel.offsetWidth / 2
      const distance = Math.abs(panelCentre - viewportCentre)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })

    return nearestIndex
  }, [])

  const updatePanelFocus = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const viewportCentre = viewport.scrollLeft + viewport.clientWidth / 2
    panelRefs.current.forEach((panel) => {
      if (!panel) return
      const panelCentre = panel.offsetLeft + panel.offsetWidth / 2
      const signedDistance = panelCentre - viewportCentre
      const distance = Math.abs(signedDistance)
      const focus = clamp(1 - distance / panel.offsetWidth)
      const centredThreshold = panel.offsetWidth * 0.01
      const origin =
        distance <= centredThreshold ? '50%' : signedDistance > 0 ? '0%' : '100%'
      panel.style.setProperty('--panel-focus', focus.toFixed(4))
      panel.style.setProperty('--panel-origin-x', origin)
      panel.style.setProperty('--panel-direction', distance <= centredThreshold ? '0' : signedDistance > 0 ? '1' : '-1')
    })
  }, [])

  const setActiveProject = useCallback((index: number) => {
    activeIndexRef.current = index
    setActiveIndex((current) => (current === index ? current : index))
  }, [])

  const scrollToPhysical = useCallback(
    (physicalIndex: number, forceInstant = false) => {
      const viewport = viewportRef.current
      const panel = panelRefs.current[physicalIndex]
      if (!viewport || !panel) return

      const left = panel.offsetLeft + panel.offsetWidth / 2 - viewport.clientWidth / 2
      const useInstant = forceInstant || reducedMotionRef.current

      if (useInstant) {
        const previousBehavior = viewport.style.scrollBehavior
        viewport.style.scrollBehavior = 'auto'
        viewport.scrollLeft = left
        viewport.style.scrollBehavior = previousBehavior
        updatePanelFocus()
        setActiveProject(logicalFromPhysical(physicalIndex))
        return
      }

      viewport.scrollTo({ left, behavior: 'smooth' })
    },
    [setActiveProject, updatePanelFocus],
  )

  const normalizeLoopPosition = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || dragRef.current || touchActiveRef.current) return

    const physicalIndex = getNearestPhysicalIndex()
    let canonicalIndex: number | null = null

    if (physicalIndex === BEFORE_CLONE_PHYSICAL_INDEX) {
      canonicalIndex = LAST_REAL_PHYSICAL_INDEX
    } else if (physicalIndex === AFTER_CLONE_PHYSICAL_INDEX) {
      canonicalIndex = FIRST_REAL_PHYSICAL_INDEX
    }

    if (canonicalIndex === null) return

    const clonePanel = panelRefs.current[physicalIndex]
    if (!clonePanel) return
    const cloneLeft = clonePanel.offsetLeft + clonePanel.offsetWidth / 2 - viewport.clientWidth / 2

    // Only teleport once snapping has actually centred the visual clone.
    if (Math.abs(viewport.scrollLeft - cloneLeft) > 2) return
    scrollToPhysical(canonicalIndex, true)
  }, [getNearestPhysicalIndex, scrollToPhysical])

  const scheduleLoopSettlement = useCallback(() => {
    if (scrollEndTimerRef.current !== null) {
      window.clearTimeout(scrollEndTimerRef.current)
    }
    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null
      normalizeLoopPosition()
    }, 110)
  }, [normalizeLoopPosition])

  const navigateByPhysicalStep = useCallback(
    (direction: -1 | 1) => {
      let currentPhysicalIndex = getNearestPhysicalIndex()

      // A rapid second input can arrive before a settled clone has normalized.
      if (currentPhysicalIndex === BEFORE_CLONE_PHYSICAL_INDEX) {
        currentPhysicalIndex = LAST_REAL_PHYSICAL_INDEX
        scrollToPhysical(currentPhysicalIndex, true)
      } else if (currentPhysicalIndex === AFTER_CLONE_PHYSICAL_INDEX) {
        currentPhysicalIndex = FIRST_REAL_PHYSICAL_INDEX
        scrollToPhysical(currentPhysicalIndex, true)
      }

      scrollToPhysical(currentPhysicalIndex + direction)
      if (reducedMotionRef.current) normalizeLoopPosition()
    },
    [getNearestPhysicalIndex, normalizeLoopPosition, scrollToPhysical],
  )

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => {
      reducedMotionRef.current = reducedMotion.matches
    }
    syncMotionPreference()

    const updateActivePanel = () => {
      scrollFrameRef.current = null
      updatePanelFocus()
      setActiveProject(logicalFromPhysical(getNearestPhysicalIndex()))
    }
    const supportsNativeScrollEnd = 'onscrollend' in viewport
    const onScroll = () => {
      if (scrollFrameRef.current === null) {
        scrollFrameRef.current = window.requestAnimationFrame(updateActivePanel)
      }
      if (!supportsNativeScrollEnd) scheduleLoopSettlement()
    }
    const onScrollEnd = () => normalizeLoopPosition()

    const recenter = () => {
      resizeFrameRef.current = null
      scrollToPhysical(canonicalPhysicalFromLogical(activeIndexRef.current), true)
    }
    const requestRecenter = () => {
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current)
      resizeFrameRef.current = window.requestAnimationFrame(recenter)
    }

    const resizeObserver = new ResizeObserver(requestRecenter)
    resizeObserver.observe(viewport)
    panelRefs.current.forEach((panel) => {
      if (panel) resizeObserver.observe(panel)
    })

    viewport.addEventListener('scroll', onScroll, { passive: true })
    if (supportsNativeScrollEnd) viewport.addEventListener('scrollend', onScrollEnd)
    reducedMotion.addEventListener('change', syncMotionPreference)
    recenter()

    return () => {
      viewport.removeEventListener('scroll', onScroll)
      if (supportsNativeScrollEnd) viewport.removeEventListener('scrollend', onScrollEnd)
      reducedMotion.removeEventListener('change', syncMotionPreference)
      resizeObserver.disconnect()
      if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current)
      if (resizeFrameRef.current !== null) window.cancelAnimationFrame(resizeFrameRef.current)
      if (scrollEndTimerRef.current !== null) {
        window.clearTimeout(scrollEndTimerRef.current)
      }
      const drag = dragRef.current
      if (drag && viewport.hasPointerCapture(drag.pointerId)) {
        viewport.releasePointerCapture(drag.pointerId)
      }
      dragRef.current = null
      touchActiveRef.current = false
    }
  }, [
    getNearestPhysicalIndex,
    normalizeLoopPosition,
    scheduleLoopSettlement,
    scrollToPhysical,
    setActiveProject,
    updatePanelFocus,
  ])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let targetIndex: number | null = null

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      navigateByPhysicalStep(-1)
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      navigateByPhysicalStep(1)
      return
    }
    if (event.key === 'Home') targetIndex = FIRST_REAL_PHYSICAL_INDEX
    if (event.key === 'End') targetIndex = LAST_REAL_PHYSICAL_INDEX

    if (targetIndex === null) return
    event.preventDefault()
    scrollToPhysical(targetIndex, true)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const viewport = viewportRef.current
    if (!viewport) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
      dragged: false,
    }
    viewport.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag || drag.pointerId !== event.pointerId) return

    const delta = event.clientX - drag.startX
    if (!drag.dragged && Math.abs(delta) < 6) return
    drag.dragged = true
    viewport.dataset.dragging = 'true'
    viewport.scrollLeft = drag.startScrollLeft - delta
    event.preventDefault()
  }

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current
    const drag = dragRef.current
    if (!viewport || !drag || drag.pointerId !== event.pointerId) return

    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
    delete viewport.dataset.dragging
    dragRef.current = null

    const nearestPhysicalIndex = getNearestPhysicalIndex()
    setActiveProject(logicalFromPhysical(nearestPhysicalIndex))
    scrollToPhysical(nearestPhysicalIndex)
    if (reducedMotionRef.current) normalizeLoopPosition()
    scheduleLoopSettlement()
  }

  const handleTouchStart = () => {
    touchActiveRef.current = true
  }

  const finishTouchInteraction = () => {
    touchActiveRef.current = false
    scheduleLoopSettlement()
  }

  const activeProject = projects[activeIndex]
  const stackedProjects = [3, 2, 1, 0].map((depth) => ({
    depth,
    project: projects[(activeIndex + depth) % projects.length],
  }))

  return (
    <section
      ref={sectionRef}
      className={styles.work}
      id="work"
      aria-labelledby="work-heading"
    >
      <div className={styles.stickyStage}>
        {/* ── Ambient light field with pointer perturbation ── */}
        <div ref={lightFieldRef} className={styles.workLightField} aria-hidden="true">
          <div className={styles.lightLayerA} />
          <div className={styles.lightLayerB} />
          <div className={styles.lightLayerC} />
        </div>

        {/* ── Heading zone: large counter + section heading ── */}
        <header ref={headingStageRef} className={styles.headingStage}>
          <span className={styles.backgroundCounter} aria-hidden="true">
            {activeProject.index}&thinsp;/&thinsp;0{projects.length}
          </span>
          <h2 ref={headingRef} id="work-heading">
            Glimpses of My Work
          </h2>
        </header>

        {/* ── Exhibition: project label + carousel ── */}
        <div ref={exhibitionStageRef} className={styles.exhibitionStage}>
          <div className={styles.activeProjectMeta} aria-hidden="true">
            <div className={styles.activeProjectMetaContent} key={activeProject.title}>
              <h3>{activeProject.title}</h3>
              {/* <p>{activeProject.category}</p> */}
            </div>
          </div>

          <div className={styles.visualStage}>
            <button
              className={`${styles.sideArrow} ${styles.previousArrow}`}
              type="button"
              onClick={() => navigateByPhysicalStep(-1)}
              aria-label="Show previous project"
            >
              <span className={styles.arrowMotion} aria-hidden="true">
                <CarouselArrowIcon />
              </span>
            </button>

            <div
              ref={viewportRef}
              className={styles.carouselViewport}
              role="region"
              aria-roledescription="carousel"
              aria-label="Project carousel"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointerDrag}
              onPointerCancel={finishPointerDrag}
              onTouchStart={handleTouchStart}
              onTouchEnd={finishTouchInteraction}
              onTouchCancel={finishTouchInteraction}
            >
              <div className={styles.carouselTrack}>
                {physicalSlides.map((slide, physicalIndex) => {
                  const { project, logicalIndex, clone, cloneSide } = slide

                  return (
                    <article
                      ref={(panel) => {
                        panelRefs.current[physicalIndex] = panel
                      }}
                      className={`${styles.panel} ${styles[project.layout]}`}
                      key={clone ? `${project.title}-${cloneSide}-clone` : project.title}
                      data-project={project.title.toLowerCase()}
                      data-active={activeIndex === logicalIndex ? 'true' : 'false'}
                      data-clone={clone ? cloneSide : undefined}
                      aria-hidden={clone ? 'true' : undefined}
                      aria-label={
                        clone
                          ? undefined
                          : `${logicalIndex + 1} of ${projects.length}: ${project.title}`
                      }
                      aria-current={
                        !clone && activeIndex === logicalIndex ? 'true' : undefined
                      }
                    >
                      <div className={styles.projectPreview} aria-hidden="true">
                        <img 
                          src={project.image} 
                          alt="" 
                          className={styles.previewImage}
                          loading={clone ? "lazy" : "eager"}
                          decoding="async"
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <button
              className={`${styles.sideArrow} ${styles.nextArrow}`}
              type="button"
              onClick={() => navigateByPhysicalStep(1)}
              aria-label="Show next project"
            >
              <span className={styles.arrowMotion} aria-hidden="true">
                <CarouselArrowIcon />
              </span>
            </button>
          </div>

          {/* ── Pagination indicator ── */}
          <nav className={styles.carouselPagination} aria-label="Carousel pagination">
            {projects.map((project, i) => (
              <button
                key={project.title}
                className={styles.paginationTick}
                type="button"
                data-active={activeIndex === i ? 'true' : 'false'}
                aria-label={`Go to ${project.title}`}
                aria-current={activeIndex === i ? 'true' : undefined}
                onClick={() => scrollToPhysical(canonicalPhysicalFromLogical(i))}
              />
            ))}
          </nav>

          <p className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
            {activeIndex + 1} of {projects.length}: {activeProject.title}
          </p>
        </div>

        {/*
          The infinite carousel remains untouched above. This representation is
          derived from the same project data and active index, then crossfades
          into view so the cards can settle without destabilising clone snapping.
        */}
        <div className={styles.handoffScene}>
          <div className={styles.handoffCopy} aria-labelledby="aesthetics-handoff-heading">
            <p className={styles.handoffEyebrow}>What I Provide</p>
            <h3 id="aesthetics-handoff-heading">Aesthetics that fit you.</h3>
            <p className={styles.handoffSupport}>{handoffCopy}</p>
          </div>

          <div className={styles.handoffStack} aria-hidden="true">
            {stackedProjects.map(({ depth, project }) => (
              <figure
                className={`${styles.stackCard} ${styles[project.layout]}`}
                data-depth={depth}
                key={`${project.title}-${depth}`}
              >
                <img
                  src={project.image}
                  alt=""
                  className={styles.previewImage}
                  decoding="async"
                />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
