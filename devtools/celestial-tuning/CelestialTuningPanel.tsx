import { useCallback, useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import { createRoot, type Root } from 'react-dom/client'

type Placement = { yaw: number; elevation: number; distance: number; angularSize: number; rotation: number }
export type CelestialConfig = {
  astronaut: Placement
  earth: Placement & { centerY: number }
}

type Props = {
  config: CelestialConfig
  defaults: CelestialConfig
  onChange: (config: CelestialConfig) => void
}

const ranges = {
  yaw: [-180, 180, 0.1],
  elevation: [-90, 90, 0.1],
  distance: [1, 100, 0.1],
  angularSize: [0.1, 90, 0.1],
  rotation: [-180, 180, 0.1],
  centerY: [-2, 3, 0.01],
} as const

type Position = { x: number; y: number }

function clampPosition(position: Position, panel: HTMLDetailsElement) {
  return {
    x: Math.max(8, Math.min(position.x, document.documentElement.clientWidth - panel.offsetWidth - 8)),
    y: Math.max(8, Math.min(position.y, document.documentElement.clientHeight - panel.offsetHeight - 8)),
  }
}

function NumericValue({ label, value, min, max, step, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  // Keep partial input (empty, minus sign, decimal) while typing.
  const [draft, setDraft] = useState<string | null>(null)

  return <input
    type="number" aria-label={label}
    min={min} max={max} step={step} value={draft ?? value}
    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', padding: '2px 3px', font: 'inherit', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
    onChange={(event) => {
      setDraft(event.currentTarget.value)
      const next = event.currentTarget.valueAsNumber
      if (Number.isFinite(next) && next >= min && next <= max) onChange(next)
    }}
    onBlur={(event) => {
      const next = event.currentTarget.valueAsNumber
      if (Number.isFinite(next)) onChange(Math.max(min, Math.min(max, next)))
      setDraft(null)
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter') event.currentTarget.blur()
    }}
  />
}

function Panel({ config, defaults, onChange, frozen, onToggleFreeze }: Props & {
  frozen: boolean
  onToggleFreeze: () => void
}) {
  const [copyStatus, setCopyStatus] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const panelRef = useRef<HTMLDetailsElement>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const values = JSON.stringify(config, null, 2)

  useEffect(() => { setCopyStatus('') }, [values])

  const keepInView = useCallback(() => {
    setPosition((current) => current && panelRef.current ? clampPosition(current, panelRef.current) : current)
  }, [])

  useEffect(() => {
    window.addEventListener('resize', keepInView)
    return () => window.removeEventListener('resize', keepInView)
  }, [keepInView])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(values)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Clipboard unavailable — select the values below to copy.')
    }
  }

  return (
    <details ref={panelRef} open onToggle={keepInView} aria-label="Celestial development controls" style={{
      position: 'fixed', top: position?.y ?? 12, left: position?.x,
      right: position ? undefined : 12, zIndex: 10000,
      width: 'min(300px, calc(100vw - 24px))', maxHeight: 'calc(100dvh - 24px)',
      overflowY: 'auto', overscrollBehavior: 'contain', boxSizing: 'border-box',
      padding: 12, border: '1px solid #556', borderRadius: 8,
      background: 'rgba(15, 18, 28, 0.94)', color: '#eee',
      font: '12px/1.4 monospace', colorScheme: 'dark', pointerEvents: 'auto',
    }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
        Celestial tuning · DEV
        <button
          type="button" aria-label="Move celestial tuning panel"
          title="Drag to move; arrow keys also move the panel"
          style={{ float: 'right', display: 'inline-flex', padding: 2, cursor: 'move', touchAction: 'none' }}
          onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
          onPointerDown={(event) => {
            if (event.button !== 0 || !panelRef.current) return
            event.preventDefault()
            const bounds = panelRef.current.getBoundingClientRect()
            dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId || !panelRef.current) return
            setPosition(clampPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY }, panelRef.current))
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            dragRef.current = null
          }}
          onPointerCancel={() => { dragRef.current = null }}
          onLostPointerCapture={() => { dragRef.current = null }}
          onKeyDown={(event) => {
            const directions: Record<string, Position> = {
              ArrowLeft: { x: -16, y: 0 }, ArrowRight: { x: 16, y: 0 },
              ArrowUp: { x: 0, y: -16 }, ArrowDown: { x: 0, y: 16 },
            }
            const delta = directions[event.key]
            if (!delta || !panelRef.current) return
            event.preventDefault()
            const bounds = panelRef.current.getBoundingClientRect()
            setPosition(clampPosition({ x: bounds.left + delta.x, y: bounds.top + delta.y }, panelRef.current))
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4" />
          </svg>
        </button>
      </summary>
      <p style={{ margin: '8px 0', fontSize: 10 }}>Angles in degrees. Collapse to inspect the Hero.</p>
      <button type="button" aria-pressed={frozen} aria-keyshortcuts="Shift+F" onClick={onToggleFreeze}>
        {frozen ? 'Resume view' : 'Freeze view'} · Shift+F
      </button>
      <p role="status" style={{ margin: '4px 0', fontSize: 10 }}>
        {frozen ? 'View frozen — sliders stay live.' : 'Aim in the Hero, then press Shift+F to hold that view.'}
      </p>
      {(['astronaut', 'earth'] as const).map((body) => (
        <fieldset key={body} style={{ margin: '8px 0', padding: 8, border: '1px solid #445' }}>
          <legend>{body === 'astronaut' ? 'Astronaut' : 'Earth'}</legend>
          {Object.entries(config[body]).map(([key, value]) => {
            const [min, max, step] = ranges[key as keyof typeof ranges]
            const updateValue = (next: number) => onChange({
              ...config,
              [body]: { ...config[body], [key]: next },
            })
            return (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '82px 1fr 68px', gap: 6, alignItems: 'center', margin: '5px 0' }}>
                <span>{key}</span>
                <input
                  type="range" aria-label={`${body} ${key}`}
                  min={min} max={max} step={step} value={value}
                  style={{ width: '100%', minWidth: 0, margin: 0, accentColor: '#9abfff' }}
                  onChange={(event) => updateValue(event.currentTarget.valueAsNumber)}
                />
                <NumericValue label={`${body} ${key} value`} value={value} min={min} max={max} step={step} onChange={updateValue} />
              </div>
            )
          })}
        </fieldset>
      ))}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => onChange(defaults)}>Reset</button>
        <button type="button" onClick={() => void copy()}>Copy</button>
        <span role="status">{copyStatus}</span>
      </div>
      <pre aria-label="Current celestial config" style={{
        margin: '8px 0 0', font: '10px/1.3 monospace', whiteSpace: 'pre-wrap', userSelect: 'text',
      }}>{values}</pre>
    </details>
  )
}

// The celestial scene uses the Three reconciler. Mount DOM controls separately
// so neither the canvas root nor the Hero's pointer handling needs to change.
export default function CelestialTuningPanel(props: Props) {
  const rootRef = useRef<Root | null>(null)
  const { camera, invalidate } = useThree()
  const [frozen, setFrozen] = useState(false)

  const toggleFreeze = useCallback(() => {
    const next = !camera.userData.celestialDevFrozen
    camera.userData.celestialDevFrozen = next
    setFrozen(next)
    invalidate()
  }, [camera, invalidate])

  useEffect(() => {
    // Effect replay during hot reload clears the camera flag in cleanup.
    setFrozen(Boolean(camera.userData.celestialDevFrozen))
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'f') return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('textarea, select, input:not([type="range"]):not([type="button"])'))) return
      event.preventDefault()
      toggleFreeze()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      delete camera.userData.celestialDevFrozen
      invalidate()
    }
  }, [camera, invalidate, toggleFreeze])

  useEffect(() => {
    const host = document.createElement('div')
    host.dataset.celestialDevControls = ''
    document.body.appendChild(host)
    const root = createRoot(host)
    rootRef.current = root
    return () => {
      rootRef.current = null
      host.remove()
      // Finish the scene's cleanup before unmounting the separate DOM root.
      queueMicrotask(() => root.unmount())
    }
  }, [])

  useEffect(() => {
    rootRef.current?.render(<Panel {...props} frozen={frozen} onToggleFreeze={toggleFreeze} />)
  }, [props, frozen, toggleFreeze])

  return null
}
