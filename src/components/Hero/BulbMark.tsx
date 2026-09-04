import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import styles from './Hero.module.css'

type BulbMarkProps = {
  isLit: boolean
  onToggle: () => void
}

type PullGesture = {
  id: number
  startX: number
  startY: number
  startEndX: number
  startEndY: number
  moved: boolean
  armed: boolean
  threshold: number
  pointerVelocityX: number
  pointerVelocityY: number
  lastPointerX: number
  lastPointerY: number
  lastPointerTime: number
  lastHorizontalDirection: -1 | 0 | 1
}

type RopeParticle = {
  x: number
  y: number
  previousX: number
  previousY: number
  pinned: boolean
  inverseMass: number
}

type CollisionGeometry = {
  glass: { x: number; y: number; radius: number }
  socket: { left: number; right: number; top: number; bottom: number }
  handleRadius: number
}

type RopeState = {
  mode: 'idle' | 'drag' | 'release'
  particles: RopeParticle[]
  normalLength: number
  deployedLength: number
  targetDeployment: number
  maxExtension: number
  dragTargetX: number
  dragTargetY: number
  lastTime: number
  accumulator: number
  releaseAge: number
  deploymentVelocity: number
  quietTime: number
  lastRendered: Array<{ x: number; y: number }>
  collision: CollisionGeometry
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const ANCHOR_X = 24
const FIXED_STEP = 1 / 120
const MAX_FRAME_DELTA = 0.05
const SOLVER_ITERATIONS = 24
const GRAVITY = 2100
const AIR_DAMPING_PER_SECOND = 0.75
const AIR_DRAG_SPEED_THRESHOLD = 40
const AIR_DRAG_SPEED_FACTOR = 0.006
const REDUCED_MOTION_RETENTION = 0.72
const DRAG_STEP_STRENGTH = 0.82
const RELEASE_RETRACTION_DELAY = 0.095
const REEL_NATURAL_FREQUENCY = 5
const REEL_DAMPING_RATIO = 1
const REDUCED_REEL_RATE = 36
const VERTICAL_RELEASE_ASSIST = 34
const VERTICAL_RELEASE_TOLERANCE = 3
const STATIONARY_TANGENTIAL_SPEED = 18
const SLEEP_MOVEMENT_RMS = 0.065
const NORMAL_MINIMUM_RELEASE_AGE = 1.4
const NORMAL_QUIET_TIME = 0.4

const getParticleCount = (length: number) =>
  clamp(Math.round(length / 6) + 1, 18, 32)

const getPullLimits = (cordLength: number, coarsePointer = false) => {
  const maxExtension = clamp(cordLength * 0.42, 28, 47)
  return {
    maxExtension,
    threshold: maxExtension * (coarsePointer ? 0.8 : 0.84),
  }
}

const createParticles = (length: number): RopeParticle[] => {
  const count = getParticleCount(length)
  return Array.from({ length: count }, (_, index) => {
    const y = (length * index) / (count - 1)
    return {
      x: 0,
      y,
      previousX: 0,
      previousY: y,
      pinned: index === 0,
      inverseMass: index === 0 ? 0 : index === count - 1 ? 0.55 : 1,
    }
  })
}

const resampleParticles = (
  particles: RopeParticle[],
  nextLength: number,
  previousLength: number,
) => {
  const nextCount = getParticleCount(nextLength)
  const scale = previousLength > 0 ? nextLength / previousLength : 1
  const sample = (progress: number, key: 'x' | 'y' | 'previousX' | 'previousY') => {
    const sourceIndex = progress * (particles.length - 1)
    const lower = Math.floor(sourceIndex)
    const upper = Math.min(particles.length - 1, lower + 1)
    const mix = sourceIndex - lower
    return (particles[lower][key] + (particles[upper][key] - particles[lower][key]) * mix) * scale
  }

  return Array.from({ length: nextCount }, (_, index) => {
    const progress = index / (nextCount - 1)
    return {
      x: index === 0 ? 0 : sample(progress, 'x'),
      y: index === 0 ? 0 : sample(progress, 'y'),
      previousX: index === 0 ? 0 : sample(progress, 'previousX'),
      previousY: index === 0 ? 0 : sample(progress, 'previousY'),
      pinned: index === 0,
      inverseMass: index === 0 ? 0 : index === nextCount - 1 ? 0.55 : 1,
    }
  })
}

const createInitialRope = (): RopeState => ({
  mode: 'idle',
  particles: createParticles(112),
  normalLength: 112,
  deployedLength: 0,
  targetDeployment: 0,
  maxExtension: 47,
  dragTargetX: 0,
  dragTargetY: 112,
  lastTime: 0,
  accumulator: 0,
  releaseAge: 0,
  deploymentVelocity: 0,
  quietTime: 0,
  lastRendered: [],
  collision: {
    glass: { x: -10, y: -47, radius: 31 },
    socket: { left: -23, right: -0.75, top: -8, bottom: 15 },
    handleRadius: 5,
  },
})

const clampToReach = (x: number, y: number, maximum: number) => {
  const distance = Math.hypot(x, y)
  if (distance <= maximum || distance === 0) return { x, y }
  const scale = maximum / distance
  return { x: x * scale, y: y * scale }
}

const getRenderPoints = (particles: RopeParticle[], contourLength: number) => {
  const last = particles[particles.length - 1]
  const reach = Math.hypot(last.x, last.y)
  const tautBlend = clamp((reach / Math.max(contourLength, 1) - 0.975) / 0.02, 0, 1)

  return particles.map((particle, index) => {
    const progress = index / (particles.length - 1)
    return {
      x: ANCHOR_X + particle.x + (last.x * progress - particle.x) * tautBlend,
      y: particle.y + (last.y * progress - particle.y) * tautBlend,
    }
  })
}

const makeSplinePath = (particles: RopeParticle[], contourLength: number) => {
  if (particles.length < 2) return `M ${ANCHOR_X} 0`

  const points = getRenderPoints(particles, contourLength)
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const before = points[Math.max(0, index - 1)]
    const current = points[index]
    const next = points[index + 1]
    const after = points[Math.min(points.length - 1, index + 2)]
    const segmentLength = Math.hypot(next.x - current.x, next.y - current.y)
    const incomingLength = Math.hypot(current.x - before.x, current.y - before.y)
    const outgoingLength = Math.hypot(after.x - next.x, after.y - next.y)
    const tangent1Length = Math.hypot(next.x - before.x, next.y - before.y) || 1
    const tangent2Length = Math.hypot(after.x - current.x, after.y - current.y) || 1
    const handle1Length = Math.min(segmentLength / 3, Math.max(incomingLength, segmentLength) * 0.32)
    const handle2Length = Math.min(segmentLength / 3, Math.max(outgoingLength, segmentLength) * 0.32)
    const control1X = current.x + ((next.x - before.x) / tangent1Length) * handle1Length
    const control1Y = current.y + ((next.y - before.y) / tangent1Length) * handle1Length
    const control2X = next.x - ((after.x - current.x) / tangent2Length) * handle2Length
    const control2Y = next.y - ((after.y - current.y) / tangent2Length) * handle2Length
    path += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)} ${control2X.toFixed(2)} ${control2Y.toFixed(2)} ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
  }

  return path
}

export default function BulbMark({ isLit, onToggle }: BulbMarkProps) {
  const controlRef = useRef<HTMLButtonElement>(null)
  const bulbDepthRef = useRef<HTMLSpanElement>(null)
  const cordSvgRef = useRef<SVGSVGElement>(null)
  const cordPathRef = useRef<SVGPathElement>(null)
  const cordHitPathRef = useRef<SVGPathElement>(null)
  const pullWeightRef = useRef<HTMLSpanElement>(null)
  const gestureRef = useRef<PullGesture | null>(null)
  const motionFrameRef = useRef<number | null>(null)
  const motionRef = useRef<RopeState>(createInitialRope())
  const keyboardTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const suppressTimerRef = useRef<number | null>(null)
  const reduceMotionRef = useRef(false)
  const syncLayoutRef = useRef<() => void>(() => {})
  const id = useId().replace(/:/g, '')
  const warmGlassId = `warm-glass-${id}`
  const filamentGlowId = `filament-glow-${id}`

  const writeCordVisual = () => {
    const control = controlRef.current
    const path = cordPathRef.current
    const hitPath = cordHitPathRef.current
    const rope = motionRef.current
    if (!control || !path || !hitPath || rope.particles.length < 2) return Number.POSITIVE_INFINITY

    const last = rope.particles[rope.particles.length - 1]
    const renderPoints = getRenderPoints(
      rope.particles,
      rope.normalLength + rope.deployedLength,
    )
    const renderedLast = renderPoints[renderPoints.length - 1]
    const renderedBeforeLast = renderPoints[renderPoints.length - 2]
    const tangentAngle = clamp(
      Math.atan2(
        renderedLast.x - renderedBeforeLast.x,
        renderedLast.y - renderedBeforeLast.y,
      ) * (180 / Math.PI),
      -7,
      7,
    )
    const pathData = makeSplinePath(
      rope.particles,
      rope.normalLength + rope.deployedLength,
    )
    path.setAttribute('d', pathData)
    hitPath.setAttribute('d', pathData)
    control.style.setProperty('--pull-y', `${last.y - rope.normalLength}px`)
    control.style.setProperty('--pull-x', `${last.x}px`)
    control.style.setProperty('--weight-angle', `${tangentAngle}deg`)
    control.style.setProperty('--cord-radius', `${Math.hypot(last.x, last.y)}px`)

    let movementRms = Number.POSITIVE_INFINITY
    if (rope.lastRendered.length === renderPoints.length) {
      const squaredMovement = renderPoints.reduce((sum, point, index) => {
        const previous = rope.lastRendered[index]
        const deltaX = point.x - previous.x
        const deltaY = point.y - previous.y
        return sum + deltaX * deltaX + deltaY * deltaY
      }, 0)
      movementRms = Math.sqrt(squaredMovement / renderPoints.length)
    }
    rope.lastRendered = renderPoints
    return movementRms
  }

  const cancelMotion = () => {
    if (motionFrameRef.current !== null) {
      window.cancelAnimationFrame(motionFrameRef.current)
      motionFrameRef.current = null
    }
  }

  const resolveCircleCollision = (
    particle: RopeParticle,
    circle: CollisionGeometry['glass'],
    particleRadius: number,
  ) => {
    const deltaX = particle.x - circle.x
    const deltaY = particle.y - circle.y
    const distance = Math.hypot(deltaX, deltaY)
    const minimumDistance = circle.radius + particleRadius
    if (distance >= minimumDistance) return

    const normalX = distance > 0.0001 ? deltaX / distance : 1
    const normalY = distance > 0.0001 ? deltaY / distance : 0
    const correctionX = normalX * (minimumDistance - distance)
    const correctionY = normalY * (minimumDistance - distance)
    particle.x += correctionX
    particle.y += correctionY
    particle.previousX += correctionX * 0.82
    particle.previousY += correctionY * 0.82
  }

  const resolveRectangleCollision = (
    particle: RopeParticle,
    rectangle: CollisionGeometry['socket'],
    particleRadius: number,
  ) => {
    const left = rectangle.left - particleRadius
    const right = rectangle.right + particleRadius
    const top = rectangle.top - particleRadius
    const bottom = rectangle.bottom + particleRadius
    if (particle.x <= left || particle.x >= right || particle.y <= top || particle.y >= bottom) {
      return
    }

    const distances = [
      { distance: particle.x - left, x: left, y: particle.y },
      { distance: right - particle.x, x: right, y: particle.y },
      { distance: particle.y - top, x: particle.x, y: top },
      { distance: bottom - particle.y, x: particle.x, y: bottom },
    ]
    const nearest = distances.reduce((best, candidate) =>
      candidate.distance < best.distance ? candidate : best,
    )
    const correctionX = nearest.x - particle.x
    const correctionY = nearest.y - particle.y
    particle.x = nearest.x
    particle.y = nearest.y
    particle.previousX += correctionX * 0.82
    particle.previousY += correctionY * 0.82
  }

  const resolveCollisions = (rope: RopeState, ropeRadius: number) => {
    rope.particles.forEach((particle, index) => {
      if (particle.pinned) return
      const radius = index === rope.particles.length - 1 ? rope.collision.handleRadius : ropeRadius
      resolveCircleCollision(particle, rope.collision.glass, radius)
      resolveRectangleCollision(particle, rope.collision.socket, radius)
    })
  }

  const simulateStep = (rope: RopeState, delta: number) => {
    const reducedMotion = reduceMotionRef.current
    if (rope.mode === 'release' && reducedMotion) {
      const previousDeployment = rope.deployedLength
      const reelMix = 1 - Math.exp(-REDUCED_REEL_RATE * delta)
      rope.deployedLength += -rope.deployedLength * reelMix
      rope.deploymentVelocity = (rope.deployedLength - previousDeployment) / delta
      if (rope.deployedLength < 0.02) {
        rope.deployedLength = 0
        rope.deploymentVelocity = 0
      }
    } else if (rope.mode === 'release') {
      if (rope.releaseAge >= RELEASE_RETRACTION_DELAY) {
        const reelAcceleration =
          -REEL_NATURAL_FREQUENCY * REEL_NATURAL_FREQUENCY * rope.deployedLength -
          2 * REEL_DAMPING_RATIO * REEL_NATURAL_FREQUENCY * rope.deploymentVelocity
        rope.deploymentVelocity += reelAcceleration * delta
      }
      rope.deployedLength += rope.deploymentVelocity * delta
      if (
        rope.deployedLength <= 0 ||
        (rope.deployedLength < 0.5 && Math.abs(rope.deploymentVelocity) < 2)
      ) {
        rope.deployedLength = 0
        rope.deploymentVelocity = 0
      }
    } else {
      const previousDeployment = rope.deployedLength
      const deploymentRate = rope.targetDeployment > rope.deployedLength ? 26 : 18
      const deploymentMix = 1 - Math.exp(-deploymentRate * delta)
      rope.deployedLength += (rope.targetDeployment - rope.deployedLength) * deploymentMix
      rope.deploymentVelocity = (rope.deployedLength - previousDeployment) / delta
    }

    if (rope.deployedLength >= rope.maxExtension) {
      rope.deployedLength = rope.maxExtension
      rope.deploymentVelocity = Math.min(0, rope.deploymentVelocity)
    }
    rope.deployedLength = Math.max(0, rope.deployedLength)
    const lastIndex = rope.particles.length - 1
    rope.particles.forEach((particle, index) => {
      if (particle.pinned) {
        particle.x = 0
        particle.y = 0
        particle.previousX = 0
        particle.previousY = 0
        return
      }

      const displacementX = particle.x - particle.previousX
      const displacementY = particle.y - particle.previousY
      const speed = Math.hypot(displacementX, displacementY) / delta
      const retention = reducedMotion
        ? REDUCED_MOTION_RETENTION
        : Math.exp(
            -(
              AIR_DAMPING_PER_SECOND +
              AIR_DRAG_SPEED_FACTOR * Math.max(0, speed - AIR_DRAG_SPEED_THRESHOLD)
            ) * delta,
          )
      const velocityX = displacementX * retention
      const velocityY = displacementY * retention
      particle.previousX = particle.x
      particle.previousY = particle.y
      particle.x += velocityX
      particle.y += velocityY + GRAVITY * (index === lastIndex ? 1.18 : 1) * delta * delta
    })

    const contourLength = rope.normalLength + rope.deployedLength
    const segmentLength = contourLength / lastIndex
    const ropeCollisionRadius = clamp(segmentLength * 0.48, 2.4, 3.4)
    const totalDragStrength = reducedMotion ? 0.9 : DRAG_STEP_STRENGTH
    const dragStrength = 1 - Math.pow(1 - totalDragStrength, 1 / SOLVER_ITERATIONS)
    const availableTarget = clampToReach(
      rope.dragTargetX,
      rope.dragTargetY,
      contourLength,
    )

    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
      const first = rope.particles[0]
      first.x = 0
      first.y = 0

      if (rope.mode === 'drag') {
        const end = rope.particles[lastIndex]
        end.x += (availableTarget.x - end.x) * dragStrength
        end.y += (availableTarget.y - end.y) * dragStrength
      }

      for (let index = 0; index < lastIndex; index += 1) {
        const start = rope.particles[index]
        const end = rope.particles[index + 1]
        const deltaX = end.x - start.x
        const deltaY = end.y - start.y
        const distance = Math.hypot(deltaX, deltaY) || 0.0001
        const totalInverseMass = start.inverseMass + end.inverseMass
        if (totalInverseMass === 0) continue

        const difference = (distance - segmentLength) / distance
        const correctionX = deltaX * difference
        const correctionY = deltaY * difference
        start.x += correctionX * (start.inverseMass / totalInverseMass)
        start.y += correctionY * (start.inverseMass / totalInverseMass)
        end.x -= correctionX * (end.inverseMass / totalInverseMass)
        end.y -= correctionY * (end.inverseMass / totalInverseMass)
      }

      resolveCollisions(rope, ropeCollisionRadius)
      first.x = 0
      first.y = 0
      first.previousX = 0
      first.previousY = 0
    }

    if (reducedMotion && rope.mode === 'release') {
      const settleMix = 1 - Math.exp(-28 * delta)
      const contourLength = rope.normalLength + rope.deployedLength
      rope.particles.forEach((particle, index) => {
        if (particle.pinned) return
        const targetY = (contourLength * index) / lastIndex
        const correctionX = -particle.x * settleMix
        const correctionY = (targetY - particle.y) * settleMix
        particle.x += correctionX
        particle.y += correctionY
        particle.previousX += correctionX
        particle.previousY += correctionY
      })
    }

    if (rope.mode === 'drag') {
      const gesture = gestureRef.current
      if (gesture) {
        const pointerRetention = Math.exp(-10 * delta)
        gesture.pointerVelocityX *= pointerRetention
        gesture.pointerVelocityY *= pointerRetention
      }
    }
  }

  const stepMotion = (time: number) => {
    motionFrameRef.current = null
    const rope = motionRef.current
    if (rope.mode === 'idle') return

    const frameDelta = rope.lastTime === 0 ? 1 / 60 : (time - rope.lastTime) / 1000
    rope.lastTime = time
    rope.accumulator = Math.min(rope.accumulator + Math.min(frameDelta, MAX_FRAME_DELTA), MAX_FRAME_DELTA)
    let simulatedTime = 0

    while (rope.accumulator >= FIXED_STEP) {
      simulateStep(rope, FIXED_STEP)
      rope.accumulator -= FIXED_STEP
      simulatedTime += FIXED_STEP
      if (rope.mode === 'release') rope.releaseAge += FIXED_STEP
    }

    const movementRms = writeCordVisual()
    if (rope.mode === 'release' && simulatedTime > 0) {
      const minimumAge = reduceMotionRef.current ? 0.08 : NORMAL_MINIMUM_RELEASE_AGE
      const requiredQuietTime = reduceMotionRef.current ? 0.06 : NORMAL_QUIET_TIME
      const sleepMovement = reduceMotionRef.current ? 0.12 : SLEEP_MOVEMENT_RMS
      const endpointSpeedThreshold = reduceMotionRef.current ? 12 : 8
      const angularSpeedThreshold = reduceMotionRef.current ? 0.1 : 0.055
      const reelVelocityThreshold = reduceMotionRef.current ? 1 : 0.6
      const end = rope.particles[rope.particles.length - 1]
      const endpointVelocityX = (end.x - end.previousX) / FIXED_STEP
      const endpointVelocityY = (end.y - end.previousY) / FIXED_STEP
      const endpointSpeed = Math.hypot(endpointVelocityX, endpointVelocityY)
      const endpointReach = Math.hypot(end.x, end.y) || 1
      const endpointAngularSpeed = Math.abs(
        (endpointVelocityX * end.y - endpointVelocityY * end.x) /
          (endpointReach * endpointReach),
      )
      const endpointIsQuiet =
        reduceMotionRef.current ||
        (endpointSpeed < endpointSpeedThreshold &&
          endpointAngularSpeed < angularSpeedThreshold)
      if (
        rope.releaseAge >= minimumAge &&
        rope.deployedLength <= 0.02 &&
        Math.abs(rope.deploymentVelocity) < reelVelocityThreshold &&
        endpointIsQuiet &&
        movementRms < sleepMovement
      ) {
        rope.quietTime += simulatedTime
      } else {
        rope.quietTime = 0
      }

      if (rope.quietTime >= requiredQuietTime) {
        rope.mode = 'idle'
        rope.accumulator = 0
        rope.particles.forEach((particle) => {
          particle.previousX = particle.x
          particle.previousY = particle.y
        })
        const control = controlRef.current
        if (control) delete control.dataset.releasing
        return
      }
    }

    motionFrameRef.current = window.requestAnimationFrame(stepMotion)
  }

  const startMotion = () => {
    if (motionFrameRef.current === null) {
      motionRef.current.lastTime = 0
      motionFrameRef.current = window.requestAnimationFrame(stepMotion)
    }
  }

  const releaseCord = (gesture?: PullGesture, releaseTimeStamp?: number) => {
    const control = controlRef.current
    if (!control) return

    delete control.dataset.dragging
    delete control.dataset.armed
    const rope = motionRef.current
    rope.mode = 'release'
    rope.targetDeployment = 0
    rope.releaseAge = 0
    rope.quietTime = 0
    rope.accumulator = 0

    if (!reduceMotionRef.current) {
      const end = rope.particles[rope.particles.length - 1]
      if (gesture) {
        const actualVelocityX = (end.x - end.previousX) / FIXED_STEP
        const actualVelocityY = (end.y - end.previousY) / FIXED_STEP
        const pointerAge = Math.max(
          0,
          ((releaseTimeStamp ?? gesture.lastPointerTime) - gesture.lastPointerTime) / 1000,
        )
        const usePointerVelocity = pointerAge <= 0.12
        const releaseVelocityX = clamp(
          usePointerVelocity
            ? actualVelocityX * 0.35 + gesture.pointerVelocityX * 0.65
            : actualVelocityX,
          -1400,
          1400,
        )
        const releaseVelocityY = clamp(
          usePointerVelocity
            ? actualVelocityY * 0.35 + gesture.pointerVelocityY * 0.65
            : actualVelocityY,
          -1400,
          1400,
        )
        const velocityDeltaX = releaseVelocityX - actualVelocityX
        const velocityDeltaY = releaseVelocityY - actualVelocityY
        rope.particles.forEach((particle, index) => {
          if (particle.pinned) return
          const progress = index / (rope.particles.length - 1)
          const weight = Math.pow(progress, 1.35)
          particle.previousX -= velocityDeltaX * weight * FIXED_STEP
          particle.previousY -= velocityDeltaY * weight * FIXED_STEP
        })
      }
      const endpointVelocityX = (end.x - end.previousX) / FIXED_STEP
      const endpointVelocityY = (end.y - end.previousY) / FIXED_STEP
      const endpointReach = Math.hypot(end.x, end.y) || 1
      const tangentialSpeed =
        endpointVelocityX * (end.y / endpointReach) -
        endpointVelocityY * (end.x / endpointReach)
      const freeParticles = rope.particles.slice(1)
      const meanCurve =
        freeParticles.reduce((sum, particle) => sum + particle.x, 0) /
        freeParticles.length
      if (
        Math.abs(end.x) <= VERTICAL_RELEASE_TOLERANCE &&
        Math.abs(tangentialSpeed) <= STATIONARY_TANGENTIAL_SPEED
      ) {
        const direction =
          gesture?.lastHorizontalDirection ||
          (Math.abs(meanCurve) >= 0.1 ? Math.sign(meanCurve) : 0) ||
          -Math.sign(rope.collision.glass.x) ||
          1
        const deploymentRatio = clamp(
          rope.deployedLength / Math.max(rope.maxExtension, 1),
          0.25,
          1,
        )
        rope.particles.forEach((particle, index) => {
          if (particle.pinned) return
          const progress = index / (rope.particles.length - 1)
          const particleReach = Math.hypot(particle.x, particle.y) || 1
          const tangentX = particle.y / particleReach
          const tangentY = -particle.x / particleReach
          const assistVelocity =
            VERTICAL_RELEASE_ASSIST * deploymentRatio * Math.pow(progress, 1.35)
          particle.previousX -= direction * tangentX * assistVelocity * FIXED_STEP
          particle.previousY -= direction * tangentY * assistVelocity * FIXED_STEP
        })
      }
    }
    control.dataset.releasing = 'true'
    startMotion()
  }

  useLayoutEffect(() => {
    const cord = cordSvgRef.current
    const bulb = bulbDepthRef.current
    if (!cord || !bulb) return

    const syncLayout = () => {
      if (gestureRef.current) return
      const length = cord.getBoundingClientRect().height
      if (length <= 0) return

      const rope = motionRef.current
      const previousLength = rope.normalLength
      if (Math.abs(length - previousLength) > 0.25) {
        rope.particles = resampleParticles(rope.particles, length, previousLength)
        rope.normalLength = length
        rope.deployedLength = clamp(
          rope.deployedLength * (length / previousLength),
          0,
          getPullLimits(length).maxExtension,
        )
        rope.targetDeployment = Math.min(rope.targetDeployment, getPullLimits(length).maxExtension)
        rope.maxExtension = getPullLimits(length).maxExtension
        const end = rope.particles[rope.particles.length - 1]
        rope.dragTargetX = end.x
        rope.dragTargetY = end.y
        rope.lastRendered = []
      }

      const cordRect = cord.getBoundingClientRect()
      const bulbRect = bulb.getBoundingClientRect()
      const weightRect = pullWeightRef.current?.getBoundingClientRect()
      const anchorClientX = cordRect.left + cordRect.width / 2
      const anchorClientY = cordRect.top
      const bulbCenterX = bulbRect.left + bulbRect.width / 2
      rope.collision = {
        glass: {
          x: bulbCenterX - anchorClientX,
          y: bulbRect.top + bulbRect.height * 0.32 - anchorClientY,
          radius: Math.min(bulbRect.width * 0.44, bulbRect.height * 0.32),
        },
        socket: {
          left: bulbCenterX - bulbRect.width * 0.18 - anchorClientX,
          right: Math.min(-0.75, bulbCenterX + bulbRect.width * 0.18 - anchorClientX),
          top: bulbRect.top + bulbRect.height * 0.74 - anchorClientY,
          bottom: bulbRect.top + bulbRect.height * 0.995 - anchorClientY,
        },
        handleRadius: Math.max(3.5, (weightRect?.width ?? 10) / 2),
      }
      writeCordVisual()
    }

    syncLayoutRef.current = syncLayout
    syncLayout()
    const observer = new ResizeObserver(syncLayout)
    observer.observe(cord)
    observer.observe(bulb)

    return () => {
      syncLayoutRef.current = () => {}
      observer.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const bulb = bulbDepthRef.current
    const hero = controlRef.current?.closest('main')
    if (!bulb || !hero) return

    const syncLightPosition = () => {
      const bulbRect = bulb.getBoundingClientRect()
      const heroRect = hero.getBoundingClientRect()
      hero.style.setProperty(
        '--light-x',
        `${bulbRect.left - heroRect.left + bulbRect.width / 2}px`,
      )
      hero.style.setProperty(
        '--light-y',
        `${bulbRect.top - heroRect.top + bulbRect.height * 0.37}px`,
      )
    }

    syncLightPosition()
    const observer = new ResizeObserver(syncLightPosition)
    observer.observe(hero)
    observer.observe(bulb)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotionPreference = () => {
      reduceMotionRef.current = motionQuery.matches
    }

    updateMotionPreference()
    motionQuery.addEventListener('change', updateMotionPreference)

    return () => {
      motionQuery.removeEventListener('change', updateMotionPreference)
      cancelMotion()

      const control = controlRef.current
      const gesture = gestureRef.current
      if (control && gesture && control.hasPointerCapture(gesture.id)) {
        control.releasePointerCapture(gesture.id)
      }
      gestureRef.current = null

      if (keyboardTimerRef.current !== null) {
        window.clearTimeout(keyboardTimerRef.current)
      }
      if (suppressTimerRef.current !== null) {
        window.clearTimeout(suppressTimerRef.current)
      }
    }
  }, [])

  const scheduleClickReset = () => {
    if (suppressTimerRef.current !== null) {
      window.clearTimeout(suppressTimerRef.current)
    }

    suppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false
      suppressTimerRef.current = null
    }, 0)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    if (!(event.target as Element).closest('[data-cord-hit]')) return
    if (gestureRef.current) return

    cancelMotion()
    if (keyboardTimerRef.current !== null) {
      window.clearTimeout(keyboardTimerRef.current)
      keyboardTimerRef.current = null
    }

    suppressClickRef.current = false
    if (suppressTimerRef.current !== null) {
      window.clearTimeout(suppressTimerRef.current)
      suppressTimerRef.current = null
    }

    const coarsePointer =
      event.pointerType === 'touch' || window.matchMedia('(pointer: coarse)').matches
    const rope = motionRef.current
    const limits = getPullLimits(rope.normalLength, coarsePointer)
    const end = rope.particles[rope.particles.length - 1]
    delete controlRef.current?.dataset.releasing
    delete controlRef.current?.dataset.armed
    if (controlRef.current) controlRef.current.dataset.dragging = 'true'
    rope.mode = 'drag'
    rope.dragTargetX = end.x
    rope.dragTargetY = end.y
    rope.targetDeployment = rope.deployedLength
    rope.deploymentVelocity = 0
    rope.maxExtension = limits.maxExtension
    rope.accumulator = 0
    rope.releaseAge = 0
    rope.quietTime = 0

    gestureRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startEndX: end.x,
      startEndY: end.y,
      moved: false,
      armed: false,
      threshold: limits.threshold,
      pointerVelocityX: 0,
      pointerVelocityY: 0,
      lastPointerX: event.clientX,
      lastPointerY: event.clientY,
      lastPointerTime: event.timeStamp,
      lastHorizontalDirection: 0,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    startMotion()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    const distance = Math.hypot(deltaX, deltaY)
    if (distance >= 3) gesture.moved = true
    event.preventDefault()
    const rope = motionRef.current
    const requestedX = gesture.startEndX + deltaX
    const requestedY = gesture.startEndY + deltaY
    const requestedDistance = Math.hypot(requestedX, requestedY)
    const requestedDeployment = clamp(requestedDistance - rope.normalLength, 0, rope.maxExtension)
    const endpoint = clampToReach(
      requestedX,
      requestedY,
      rope.normalLength + rope.maxExtension,
    )
    rope.dragTargetX = endpoint.x
    rope.dragTargetY = endpoint.y
    rope.targetDeployment = requestedDeployment
    gesture.armed =
      requestedY - rope.normalLength >= gesture.threshold &&
      requestedDeployment >= gesture.threshold * 0.75

    const control = controlRef.current
    if (control) {
      if (gesture.armed) control.dataset.armed = 'true'
      else delete control.dataset.armed
    }

    const pointerDelta = clamp((event.timeStamp - gesture.lastPointerTime) / 1000, 1 / 240, 0.05)
    const pointerVelocityX = (event.clientX - gesture.lastPointerX) / pointerDelta
    const pointerVelocityY = (event.clientY - gesture.lastPointerY) / pointerDelta
    const velocityMix = 1 - Math.exp(-18 * pointerDelta)
    gesture.pointerVelocityX +=
      (clamp(pointerVelocityX, -1200, 1200) - gesture.pointerVelocityX) * velocityMix
    gesture.pointerVelocityY +=
      (clamp(pointerVelocityY, -1200, 1200) - gesture.pointerVelocityY) * velocityMix
    if (Math.abs(event.clientX - gesture.lastPointerX) >= 0.25) {
      gesture.lastHorizontalDirection = event.clientX > gesture.lastPointerX ? 1 : -1
    }
    gesture.lastPointerX = event.clientX
    gesture.lastPointerY = event.clientY
    gesture.lastPointerTime = event.timeStamp
  }

  const finishPointer = (
    event: React.PointerEvent<HTMLButtonElement>,
    cancelled = false,
  ) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return

    gestureRef.current = null
    const shouldToggle = !cancelled && gesture.moved && gesture.armed

    suppressClickRef.current = true
    const captureTarget = controlRef.current
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldToggle) {
      onToggle()
    }

    releaseCord(gesture, event.timeStamp)
    window.requestAnimationFrame(() => syncLayoutRef.current())
    scheduleClickReset()
  }

  const playKeyboardPull = () => {
    cancelMotion()
    if (keyboardTimerRef.current !== null) {
      window.clearTimeout(keyboardTimerRef.current)
    }

    const rope = motionRef.current
    const end = rope.particles[rope.particles.length - 1]
    rope.mode = 'drag'
    rope.dragTargetX = end.x
    rope.dragTargetY = Math.max(end.y, rope.normalLength + 7)
    rope.targetDeployment = Math.max(rope.deployedLength, 7)
    rope.accumulator = 0
    startMotion()
    keyboardTimerRef.current = window.setTimeout(() => {
      keyboardTimerRef.current = null
      releaseCord()
    }, 90)
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current || event.detail > 0) {
      event.preventDefault()
      suppressClickRef.current = false
      return
    }

    onToggle()
    playKeyboardPull()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return

    event.preventDefault()
    onToggle()
    playKeyboardPull()
  }

  return (
    <button
      ref={controlRef}
      className={styles.customI}
      type="button"
      aria-pressed={isLit}
      aria-label={`Pull to turn studio light ${isLit ? 'off' : 'on'}`}
      data-bulb-control="true"
      data-lit={isLit ? 'true' : 'false'}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishPointer(event)}
      onPointerCancel={(event) => finishPointer(event, true)}
      onLostPointerCapture={(event) => finishPointer(event, true)}
      onDragStart={(event) => event.preventDefault()}
    >
      <span className={styles.iStem} aria-hidden="true" />
      <span ref={bulbDepthRef} className={styles.bulbDepth} aria-hidden="true">
        <span className={styles.swingAssembly}>
          <span className={styles.haloInner} />
          <span className={styles.haloCore} />
          <svg
            className={styles.bulb}
            viewBox="0 0 60 84"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            focusable="false"
          >
            <defs>
              <radialGradient
                id={warmGlassId}
                cx="0"
                cy="0"
                r="1"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(28 28) rotate(78) scale(35 29)"
              >
                <stop stopColor="#fff9e8" stopOpacity=".72" />
                <stop offset=".43" stopColor="#f2e9cf" stopOpacity=".34" />
                <stop offset="1" stopColor="#d4c49e" stopOpacity=".045" />
              </radialGradient>
              <filter
                id={filamentGlowId}
                x="-180%"
                y="-180%"
                width="460%"
                height="460%"
                colorInterpolationFilters="sRGB"
              >
                <feGaussianBlur stdDeviation="1.45" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              className={styles.glassBody}
              d="M30 2.5C15.4 2.1 6.2 11.2 4.6 24.1 3.2 35.7 8.9 45.2 16.8 53.2c3.2 3.2 4.6 6.8 4.8 11.3h16.8c.2-4.5 1.6-8.1 4.8-11.3 7.9-8 13.6-17.5 12.2-29.1C53.8 11.2 44.6 2.1 30 2.5Z"
            />
            <path
              className={styles.glassWarm}
              d="M30 2.5C15.4 2.1 6.2 11.2 4.6 24.1 3.2 35.7 8.9 45.2 16.8 53.2c3.2 3.2 4.6 6.8 4.8 11.3h16.8c.2-4.5 1.6-8.1 4.8-11.3 7.9-8 13.6-17.5 12.2-29.1C53.8 11.2 44.6 2.1 30 2.5Z"
              fill={`url(#${warmGlassId})`}
            />
            <path
              className={styles.glassHighlight}
              d="M12.7 18.9c1.8-5.5 6.1-9.2 10.8-10.7"
            />
            <path className={styles.neckLine} d="M21.7 64h16.6" />

            <g className={styles.filamentSupports}>
              <path d="M19.2 34 24.7 63.8M40.8 34 35.3 63.8" />
              <path d="M26.1 40v23.8M33.9 40v23.8" />
            </g>
            <path
              className={styles.filament}
              d="M19.2 34c2.7 1.9 5.1 1.9 7.6 0 2.1 2.2 4.3 2.2 6.4 0 2.5 1.9 4.9 1.9 7.6 0"
              filter={isLit ? `url(#${filamentGlowId})` : undefined}
            />

            <g className={styles.socket}>
              <path d="M20.3 64.3h19.4v9.3L35.5 78h-11l-4.2-4.4v-9.3Z" />
              <path d="M21.2 66.8h17.6M21.2 69.7h17.6M21.8 72.6h16.4M23.5 75.3h13" />
              <path className={styles.contactPoint} d="M26.4 78h7.2l-1.4 2.8h-4.4L26.4 78Z" />
            </g>
          </svg>

          <span className={styles.pullAssembly}>
            <svg
              ref={cordSvgRef}
              className={styles.pullCordSvg}
              width="48"
              aria-hidden="true"
              focusable="false"
            >
              <path ref={cordPathRef} className={styles.pullCordPath} />
              <path
                ref={cordHitPathRef}
                className={styles.pullCordHitPath}
                data-cord-hit="true"
              />
            </svg>
            <span ref={pullWeightRef} className={styles.pullWeight} />
            <span className={styles.pullWeightHit} data-cord-hit="true" />
          </span>
        </span>
      </span>
    </button>
  )
}
