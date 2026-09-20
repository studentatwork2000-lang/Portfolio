import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createRoot, extend, useFrame, useThree, type RootState } from '@react-three/fiber'
import {
  BufferAttribute, BufferGeometry, Color, DataTexture, LinearFilter,
  Points, PointsMaterial, RGBAFormat,
} from 'three'
import CssSkyFallback from './CssSkyFallback'
import styles from './Hero.module.css'

// Viewing angles in degrees; response controls the slope, not the bounds.
const YAW_LEFT = -32
const YAW_RIGHT = 32
const PITCH_UP = 27
const PITCH_DOWN = -32
const RESPONSE_X = 1.2
const RESPONSE_UP = 1.55
const RESPONSE_DOWN = 1.2
const DAMPING = 16
const FOV = 58
const PARALLAX_X = 0.12
const PARALLAX_Y = 0.08
const DEG = Math.PI / 180

export type SkyPointer = {
  x: number
  y: number
  enabled: boolean
  invalidate: () => void
}

type SkyProps = { pointer: RefObject<SkyPointer> }

// A small R3F catalogue, without raycasting or DOM event registration.
extend({ Points, BufferGeometry, BufferAttribute, PointsMaterial })

const populations = [
  { count: 1800, min: 70, max: 100, size: 2, opacity: 0.64, seed: 817 },
  { count: 550, min: 30, max: 50, size: 2.8, opacity: 0.76, seed: 231 },
  { count: 110, min: 12, max: 22, size: 3.6, opacity: 0.86, seed: 593 },
  { count: 16, min: 18, max: 35, size: 5.2, opacity: 0.92, seed: 941 },
]

function generateStars({ count, min, max, seed }: typeof populations[number]) {
  let state = seed
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const color = new Color()
  const palette = ['#dce5ef', '#cadbed', '#edf0ed', '#ebe7db']

  for (let index = 0; index < count; index += 1) {
    // Uniform full spheres: even diagonal/ultrawide views have no field edge.
    const y = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)
    const x = Math.cos(angle) * ring
    const z = Math.sin(angle) * ring
    const radius = min + random() * (max - min)
    positions.set([x * radius, y * radius, z * radius], index * 3)

    // A soft world-space quiet patch near the neutral title, never camera-pinned.
    const quiet = z < 0
      ? Math.exp(-((x / -z / 0.34) ** 2 + ((y / -z - 0.08) / 0.2) ** 2))
      : 0
    const temperature = random()
    color.set(palette[temperature < 0.48 ? 0 : temperature < 0.78 ? 1 : temperature < 0.97 ? 2 : 3])
    color.multiplyScalar((0.55 + random() * 0.45) * (1 - quiet * 0.5))
    color.toArray(colors, index * 3)
  }
  return { positions, colors }
}

// One tiny radial alpha sprite, shared by all four point clouds.
function createStarTexture() {
  const size = 32
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1)
      const core = 1 - Math.min(1, Math.max(0, (radius - 0.18) / 0.55))
      const alpha = radius >= 1 ? 0 : core * core * (3 - 2 * core) * 0.9 + (1 - radius) ** 3 * 0.1
      const offset = (y * size + x) * 4
      data[offset] = data[offset + 1] = data[offset + 2] = 255
      data[offset + 3] = Math.round(alpha * 255)
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat)
  texture.magFilter = texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}

const saturate = (value: number, response: number) =>
  Math.tanh(value * response) / Math.tanh(response)

function StarScene({ pointer, onReady }: SkyProps & { onReady: () => void }) {
  const { camera, gl, invalidate, setFrameloop } = useThree()
  const fields = useMemo(() => populations.map(generateStars), [])
  const texture = useMemo(createStarTexture, [])
  const motion = useRef({ yaw: 0, pitch: 0, x: 0, y: 0, awake: false, lastTime: 0 })
  const firstFrame = useRef(true)

  useEffect(() => {
    let inView = true
    let active = !document.hidden
    const wake = () => {
      if (!active) return
      if (!motion.current.awake) motion.current.lastTime = performance.now()
      motion.current.awake = true
      invalidate()
    }
    const syncVisibility = () => {
      active = inView && !document.hidden
      setFrameloop(active ? 'demand' : 'never')
      motion.current.awake = false
      if (active) wake()
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      syncVisibility()
    })
    observer.observe(gl.domElement)
    document.addEventListener('visibilitychange', syncVisibility)
    pointer.current.invalidate = wake
    syncVisibility()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      pointer.current.invalidate = () => {}
      texture.dispose()
    }
  }, [gl, invalidate, pointer, setFrameloop, texture])

  useFrame(() => {
    const input = pointer.current
    const x = input.enabled ? input.x : 0
    const y = input.enabled ? -input.y : 0
    const yaw = (x < 0 ? -YAW_LEFT : YAW_RIGHT) * saturate(x, RESPONSE_X) * DEG
    const pitch = (y < 0 ? -PITCH_DOWN : PITCH_UP) * saturate(y, y < 0 ? RESPONSE_DOWN : RESPONSE_UP) * DEG
    const state = motion.current
    const now = performance.now()
    // Ignore time spent asleep, and cap long interrupted frames to avoid snapping.
    const delta = Math.min((now - state.lastTime) / 1000, 0.05)
    state.lastTime = now
    const alpha = input.enabled ? 1 - Math.exp(-DAMPING * delta) : 1
    state.yaw += (yaw - state.yaw) * alpha
    state.pitch += (pitch - state.pitch) * alpha
    state.x += (x * PARALLAX_X - state.x) * alpha
    state.y += (y * PARALLAX_Y - state.y) * alpha

    const settled = Math.max(
      Math.abs(yaw - state.yaw), Math.abs(pitch - state.pitch),
      Math.abs(x * PARALLAX_X - state.x), Math.abs(y * PARALLAX_Y - state.y),
    ) < 0.00001
    if (settled) {
      state.yaw = yaw
      state.pitch = pitch
      state.x = x * PARALLAX_X
      state.y = y * PARALLAX_Y
    }
    // Three looks down -Z: positive website yaw (right) is negative Euler Y.
    camera.rotation.set(state.pitch, -state.yaw, 0, 'YXZ')
    camera.position.set(state.x, state.y, 0)
    state.awake = !settled
    if (!settled) invalidate()
  })

  return fields.map((field, index) => (
    <points
      key={index}
      frustumCulled={false}
      onAfterRender={() => {
        if (!firstFrame.current) return
        firstFrame.current = false
        onReady()
      }}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[field.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        size={populations[index].size}
        sizeAttenuation={false}
        opacity={populations[index].opacity}
        vertexColors
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </points>
  ))
}

class SkyErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onError() }
  render() { return this.state.failed ? null : this.props.children }
}

export default function CelestialSky({ pointer }: SkyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container || failed) return
    let disposed = false
    let root: ReturnType<typeof createRoot> | null = null
    let getState: (() => RootState) | undefined
    const fail = () => {
      if (!disposed) {
        setReady(false)
        setFailed(true)
      }
    }
    const contextLost = (event: Event) => {
      event.preventDefault()
      fail()
    }
    canvas.addEventListener('webglcontextlost', contextLost)
    // Explicit setup catches renderer initialization failures as well as scene errors.
    // createRoot also avoids Canvas's unused pointer event manager/full Three catalogue.
    const resize = async () => {
      const { width, height } = container.getBoundingClientRect()
      if (!width || !height || disposed || !root) return
      try {
        await root.configure({
          gl: { alpha: true, antialias: false, powerPreference: 'low-power' },
          camera: { fov: FOV, near: 0.1, far: 120, position: [0, 0, 0] },
          size: { width, height, top: 0, left: 0 },
          dpr: Math.min(window.devicePixelRatio || 1, 1.5),
          // Resizing must preserve the offscreen/hidden scene's paused loop.
          frameloop: getState?.().frameloop ?? 'demand',
          onCreated: ({ get }) => { getState = get },
        })
        // Three updates inline pixel dimensions; keep display size tied to the Hero.
        canvas.style.width = canvas.style.height = '100%'
        if (!disposed) root.render(
          <SkyErrorBoundary onError={fail}>
            <StarScene pointer={pointer} onReady={() => { if (!disposed) setReady(true) }} />
          </SkyErrorBoundary>,
        )
      } catch {
        fail()
      }
    }
    const onResize = () => { void resize() }
    const observer = new ResizeObserver(onResize)
    // Defer allocation past React StrictMode's effect replay. An abandoned root
    // must never dispose a renderer that a second effect is already using.
    const startFrame = window.requestAnimationFrame(() => {
      root = createRoot(canvas)
      observer.observe(container)
      window.addEventListener('resize', onResize)
      void resize()
    })
    return () => {
      disposed = true
      window.cancelAnimationFrame(startFrame)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', contextLost)
      root?.unmount()
    }
  }, [failed, pointer])

  return (
    <div className={styles.atmosphere} aria-hidden="true" data-sky-ready={ready && !failed}>
      <CssSkyFallback embedded />
      {!failed && <canvas ref={canvasRef} className={styles.celestialCanvas} />}
    </div>
  )
}
