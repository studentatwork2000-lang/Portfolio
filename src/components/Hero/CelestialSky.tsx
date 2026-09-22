import { Component, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createRoot, extend, useFrame, useThree, type RootState } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three'
import CssSkyFallback from './CssSkyFallback'
import styles from './Hero.module.css'

// Viewing angles in degrees; response shapes the slope without changing bounds.
const YAW_LEFT = -32
const YAW_RIGHT = 32
const PITCH_UP = 27
const PITCH_DOWN = -32
const RESPONSE_X = 1.15
const RESPONSE_UP = 1.3
const RESPONSE_DOWN = 1.15
const DAMPING = 11.5
const FOV = 58
const PARALLAX_X = 0.72
const PARALLAX_Y = 0.46
const DEG = Math.PI / 180
const IDLE_FRAME_MS = 50

export type SkyPointer = {
  x: number
  y: number
  enabled: boolean
  reducedMotion?: boolean
  invalidate: () => void
  onDrift?: (x: number, y: number) => void
}

type SkyProps = { pointer: RefObject<SkyPointer> }

// Keep the lazy R3F catalogue small: no event manager, lights, or texture assets.
extend({ Points, BufferGeometry, BufferAttribute, ShaderMaterial })

const populations = [
  { count: 4400, min: 72, max: 108, size: [1.5, 2.8], brightness: [0.32, 0.69], twinkle: 0.07, seed: 817 },
  { count: 1800, min: 38, max: 66, size: [2.2, 4], brightness: [0.46, 0.84], twinkle: 0.11, seed: 231 },
  { count: 520, min: 15, max: 29, size: [3.2, 5.8], brightness: [0.63, 0.94], twinkle: 0.14, seed: 593 },
  { count: 28, min: 22, max: 40, size: [7, 10.5], brightness: [0.78, 1], twinkle: 0.07, seed: 941 },
]

function generateStars(population: typeof populations[number]) {
  const { count, min, max, seed } = population
  let state = seed
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const brightness = new Float32Array(count)
  const phases = new Float32Array(count)
  const twinkles = new Float32Array(count)
  const color = new Color()
  const palette = ['#dce5ef', '#c6d9ed', '#f0f1ec', '#eee6d4']

  for (let index = 0; index < count; index += 1) {
    // Full spheres keep the view continuous at every corner and aspect ratio.
    const y = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const ring = Math.sqrt(1 - y * y)
    const x = Math.cos(angle) * ring
    const z = Math.sin(angle) * ring
    const radius = min + random() * (max - min)
    positions.set([x * radius, y * radius, z * radius], index * 3)

    // A world-space quiet patch leaves breathing room behind the neutral title.
    // It moves with the dome, never looking like a mask attached to the cursor.
    const quiet = z < 0
      ? Math.exp(-((x / -z / 0.4) ** 2 + ((y / -z - 0.08) / 0.24) ** 2))
      : 0
    const temperature = random()
    color.set(palette[temperature < 0.46 ? 0 : temperature < 0.76 ? 1 : temperature < 0.95 ? 2 : 3])
    color.toArray(colors, index * 3)
    sizes[index] = population.size[0] + random() ** 1.8 * (population.size[1] - population.size[0])
    brightness[index] = (population.brightness[0] + random() * (population.brightness[1] - population.brightness[0])) * (1 - quiet * 0.58)
    phases[index] = random() * Math.PI * 2
    // Most stars remain constant; a few breathe independently over ~9–15 s.
    twinkles[index] = random() < 0.24 ? population.twinkle : 0
  }
  return { positions, colors, sizes, brightness, phases, twinkles }
}

const starVertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aBrightness;
  attribute float aPhase;
  attribute float aTwinkle;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uMotion;
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    // Angular sizes stay delicate at the viewport edges. Physical depth still
    // changes each layer's response to the camera's small lateral translation.
    gl_PointSize = aSize * uPixelRatio;
    vColor = aColor;
    float breath = 0.5 + 0.5 * sin(uTime * (0.43 + aPhase * 0.045) + aPhase);
    vBrightness = aBrightness * (1.0 - breath * aTwinkle * uMotion);
  }
`

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vBrightness;

  void main() {
    vec2 point = gl_PointCoord * 2.0 - 1.0;
    float radius = length(point);
    if (radius >= 1.0) discard;
    // Analytic round cores and a soft optical halo, with no square sprite edge.
    float core = exp(-radius * radius * 4.6);
    float halo = exp(-radius * radius * 2.0) * 0.09;
    float edge = 1.0 - smoothstep(0.68, 1.0, radius);
    gl_FragColor = vec4(vColor, (core * 0.91 + halo) * edge * vBrightness);
    #include <colorspace_fragment>
  }
`

const saturate = (value: number, response: number) =>
  Math.tanh(Math.max(-1, Math.min(1, value)) * response) / Math.tanh(response)

function StarScene({ pointer, onReady }: SkyProps & { onReady: () => void }) {
  const { camera, gl, invalidate, setFrameloop } = useThree()
  const fields = useMemo(() => populations.map(generateStars), [])
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: gl.getPixelRatio() },
    uMotion: { value: 1 },
  }), [gl])
  const motion = useRef({ yaw: 0, pitch: 0, x: 0, y: 0, lastTime: 0, driftX: NaN, driftY: NaN })
  const firstFrame = useRef(true)
  const scheduleIdle = useRef<() => void>(() => {})

  useEffect(() => {
    let inView = true
    let active = !document.hidden
    let idleTimer: number | undefined
    const clearIdle = () => {
      window.clearTimeout(idleTimer)
      idleTimer = undefined
    }
    const wake = () => {
      if (!active) return
      clearIdle()
      invalidate()
    }
    scheduleIdle.current = () => {
      if (!active || pointer.current.reducedMotion || idleTimer !== undefined) return
      // A settled camera only repaints the very slow twinkle, capped at 20 fps.
      idleTimer = window.setTimeout(() => {
        idleTimer = undefined
        if (active) invalidate()
      }, IDLE_FRAME_MS)
    }
    const syncVisibility = () => {
      active = inView && !document.hidden
      clearIdle()
      motion.current.lastTime = performance.now()
      setFrameloop(active ? 'demand' : 'never')
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
      clearIdle()
      observer.disconnect()
      document.removeEventListener('visibilitychange', syncVisibility)
      pointer.current.invalidate = () => {}
      scheduleIdle.current = () => {}
    }
  }, [gl, invalidate, pointer, setFrameloop])

  useFrame(() => {
    const input = pointer.current
    const x = input.enabled ? Math.max(-1, Math.min(1, input.x)) : 0
    const y = input.enabled ? Math.max(-1, Math.min(1, -input.y)) : 0
    const yaw = (x < 0 ? -YAW_LEFT : YAW_RIGHT) * saturate(x, RESPONSE_X) * DEG
    const pitch = (y < 0 ? -PITCH_DOWN : PITCH_UP) * saturate(y, y < 0 ? RESPONSE_DOWN : RESPONSE_UP) * DEG
    const state = motion.current
    const now = performance.now()
    // Do not include time spent hidden/offscreen or jump after a stalled frame.
    const delta = Math.min((now - state.lastTime) / 1000, 0.075)
    state.lastTime = now
    const alpha = input.reducedMotion ? 1 : 1 - Math.exp(-DAMPING * delta)
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
    // Three looks down -Z: positive website yaw is negative Euler Y.
    camera.rotation.set(state.pitch, -state.yaw, 0, 'YXZ')
    camera.position.set(state.x, state.y, 0)
    const driftX = -22 * state.yaw / (YAW_RIGHT * DEG)
    const driftY = 16 * state.pitch / ((state.pitch < 0 ? -PITCH_DOWN : PITCH_UP) * DEG)
    if (driftX !== state.driftX || driftY !== state.driftY) {
      state.driftX = driftX
      state.driftY = driftY
      input.onDrift?.(driftX, driftY)
    }
    uniforms.uPixelRatio.value = gl.getPixelRatio()
    uniforms.uMotion.value = input.reducedMotion ? 0 : 1
    if (!input.reducedMotion) uniforms.uTime.value += delta
    if (!settled) invalidate()
    else scheduleIdle.current()
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
        <bufferAttribute attach="attributes-aColor" args={[field.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[field.sizes, 1]} />
        <bufferAttribute attach="attributes-aBrightness" args={[field.brightness, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[field.phases, 1]} />
        <bufferAttribute attach="attributes-aTwinkle" args={[field.twinkles, 1]} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
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
        getState?.().setFrameloop('never')
        pointer.current.onDrift?.(0, 0)
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
          onCreated: ({ get, gl }) => {
            getState = get
            // Shader compilation can fail independently of renderer creation.
            gl.debug.onShaderError = fail
          },
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
      // Stop frames before async R3F disposal can rewrite the neutral DOM drift.
      getState?.().setFrameloop('never')
      pointer.current.onDrift?.(0, 0)
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
