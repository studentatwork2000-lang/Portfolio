import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FontBrowser from './FontBrowser'
import PageTools from './PageTools'
import { getCatalog, getInfo, loadFont, realWeight, type CatalogFont, type FontInfo } from './fontsource'
import { baselineValues, targets, type Settings, type TargetId } from './targets'
import { usePreview } from './usePreview'
import './FontLab.css'

type Config = Partial<Record<TargetId, Settings>>
type Candidate = { target: TargetId; settings: Settings }

function Slider({ label, value, min, max, step, suffix = '', disabled = false, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string; disabled?: boolean; onChange: (value: number) => void
}) {
  return <label className="font-lab-control"><span>{label}<output>{Number(value.toFixed(3))}{suffix}</output></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} disabled={disabled || min === max} onChange={event => onChange(Number(event.target.value))} /></label>
}

export default function FontLab() {
  const [accepted, setAccepted] = useState<Config>({})
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [active, setActive] = useState<TargetId>('hero-title')
  const [open, setOpen] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [picking, setPicking] = useState(false)
  const [catalog, setCatalog] = useState<CatalogFont[]>([])
  const [catalogError, setCatalogError] = useState('')
  const [shortlist, setShortlist] = useState(new Set<string>())
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<FontInfo>()
  const [infoError, setInfoError] = useState('')
  const [copyFallback, setCopyFallback] = useState('')
  const [position, setPosition] = useState({ x: Math.max(8, innerWidth - 396), y: Math.max(8, innerHeight - 650) })
  const [bases] = useState(() => Object.fromEntries(targets.map(target => [target.id, baselineValues(target)])) as Record<TargetId, ReturnType<typeof baselineValues>>)
  const panel = useRef<HTMLDivElement>(null)
  const controls = useRef<HTMLDivElement>(null)
  const fontButton = useRef<HTMLButtonElement>(null)
  const copyArea = useRef<HTMLTextAreaElement>(null)
  const sequence = useRef(0)
  const mounted = useRef(true)
  const drag = useRef<{ pointer: number; x: number; y: number; startX: number; startY: number } | null>(null)
  const currentTarget = targets.find(target => target.id === active)!
  const current = candidate?.target === active ? candidate.settings : accepted[active] ?? {}
  const effective = useMemo(() => candidate ? { ...accepted, [candidate.target]: candidate.settings } : accepted, [accepted, candidate])
  usePreview(effective)
  const base = bases[active]
  const currentFontId = current.fontId ?? currentTarget.baselineFont
  const currentFont = catalog.find(font => font.id === currentFontId)
  const currentWeight = info && info.font.id === currentFontId ? realWeight(info, current.weight ?? base.weight) : current.weight ?? base.weight

  const fetchCatalog = useCallback((retry = false) => {
    setCatalogError('')
    void getCatalog(retry).then(fonts => { if (mounted.current) setCatalog(fonts) }).catch(error => {
      if (mounted.current) setCatalogError(`Catalog unavailable. Existing website fonts are safe. ${error instanceof Error ? error.message : 'Check your connection and retry.'}`)
    })
  }, [])
  useEffect(() => {
    mounted.current = true
    fetchCatalog()
    return () => { mounted.current = false; sequence.current++ }
  }, [fetchCatalog])
  useEffect(() => {
    let alive = true
    setInfo(undefined); setInfoError('')
    if (currentFont) void getInfo(currentFont, 1).then(value => { if (alive) setInfo(value) }).catch(error => { if (alive) setInfoError(error instanceof Error ? error.message : 'Weight metadata unavailable') })
    return () => { alive = false }
  }, [currentFont])

  const cancelBrowser = useCallback(() => {
    sequence.current++
    setBrowsing(false); setCandidate(null); setLoading(false); setStatus('Candidate discarded. Accepted runtime font restored.')
    requestAnimationFrame(() => fontButton.current?.focus())
  }, [])
  const selectTarget = useCallback((id: TargetId) => {
    sequence.current++; setActive(id); setCandidate(null); setBrowsing(false); setPicking(false); setOpen(true); setLoading(false); setStatus(''); setCopyFallback('')
    requestAnimationFrame(() => controls.current?.scrollIntoView({ block: 'nearest' }))
  }, [])
  const stopPicking = useCallback(() => setPicking(false), [])
  useEffect(() => {
    if (!browsing) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.font-lab-browser') && !event.target.closest('[data-font-browser-trigger]')) cancelBrowser()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelBrowser() }
    }
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('keydown', escape)
    return () => { window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', escape) }
  }, [browsing, cancelBrowser])
  const clampPosition = useCallback((x: number, y: number) => ({
    x: Math.max(8, Math.min(x, innerWidth - Math.min(panel.current?.offsetWidth ?? 380, innerWidth - 16) - 8)),
    y: Math.max(8, Math.min(y, innerHeight - Math.min(panel.current?.offsetHeight ?? 48, innerHeight - 16) - 8)),
  }), [])
  useEffect(() => {
    const resize = () => setPosition(pos => {
      const next = clampPosition(pos.x, pos.y)
      return next.x === pos.x && next.y === pos.y ? pos : next
    })
    const observer = new ResizeObserver(resize)
    if (panel.current) observer.observe(panel.current)
    window.addEventListener('resize', resize)
    return () => { observer.disconnect(); window.removeEventListener('resize', resize) }
  }, [clampPosition])
  useEffect(() => { setPosition(pos => clampPosition(pos.x, pos.y)) }, [open, browsing, picking, clampPosition])

  const previewFont = async (font: CatalogFont, accept = false) => {
    const token = ++sequence.current
    const target = active
    const previous = accepted[target] ?? {}
    setLoading(true); setStatus(`Loading ${font.family}…`)
    try {
      const loaded = await loadFont(font, previous.weight ?? bases[target].weight, 2)
      if (token !== sequence.current || !mounted.current) return
      setInfo(loaded.info); setInfoError('')
      const settings = { ...previous, fontId: font.id, family: font.family, cssFamily: loaded.family, weight: loaded.weight }
      if (accept) {
        setAccepted(values => ({ ...values, [target]: settings })); setCandidate(null); setBrowsing(false)
        setStatus(`${font.family} accepted for this session.`)
        requestAnimationFrame(() => fontButton.current?.focus())
      } else { setCandidate({ target, settings }); setStatus(`Auditioning ${font.family}. Use or cancel to finish.`) }
    } catch (error) { if (token === sequence.current && mounted.current) setStatus(error instanceof Error ? error.message : 'Preview unavailable. Previous font preserved.') }
    finally { if (token === sequence.current && mounted.current) setLoading(false) }
  }
  const update = (patch: Partial<Settings>) => {
    setAccepted(values => ({ ...values, [active]: { ...values[active], ...patch } }))
    setStatus(''); setCopyFallback('')
  }
  const weightChange = async (desired: number) => {
    if (!currentFont) return
    const target = active, token = ++sequence.current
    setLoading(true)
    try {
      const loaded = await loadFont(currentFont, desired, 2)
      if (token !== sequence.current || !mounted.current) return
      setInfo(loaded.info); setInfoError('')
      setAccepted(values => ({ ...values, [target]: { ...values[target], fontId: currentFont.id, family: currentFont.family, cssFamily: loaded.family, weight: loaded.weight } }))
      setStatus(`Weight ${loaded.weight}`)
    } catch (error) { if (token === sequence.current && mounted.current) setStatus(error instanceof Error ? error.message : 'Weight file unavailable. Previous weight preserved.') }
    finally { if (token === sequence.current && mounted.current) setLoading(false) }
  }
  const reset = () => {
    sequence.current++; setAccepted(values => { const next = { ...values }; delete next[active]; return next })
    setCandidate(null); setLoading(false); setStatus('Target reset to existing website typography.'); setCopyFallback('')
  }
  const copy = async (all = false) => {
    const configFor = (id: TargetId) => {
      const settings = effective[id] ?? {}, baseline = bases[id], target = targets.find(item => item.id === id)!
      return {
        target: target.name, font: settings.family ?? baseline.family,
        weight: settings.weight ?? baseline.weight, tracking: `${Number((settings.tracking ?? baseline.tracking).toFixed(4))}em`,
        lineHeight: Number((settings.lineHeight ?? baseline.lineHeight).toFixed(4)), sizeMultiplier: settings.sizeMultiplier ?? 1,
        // Hero's distinct line defaults and other shared targets are retained.
        parts: target.nodes().map(node => { const style = getComputedStyle(node), size = Number.parseFloat(style.fontSize); return {
          text: node.textContent?.trim().replace(/\s+/g, ' '), weight: Number(style.fontWeight), tracking: `${Number(((Number.parseFloat(style.letterSpacing) || 0) / size).toFixed(4))}em`, lineHeight: Number((Number.parseFloat(style.lineHeight) / size).toFixed(4)),
        } }),
      }
    }
    const output = JSON.stringify(all ? Object.fromEntries(targets.map(target => [target.id, configFor(target.id)])) : { [active]: configFor(active) }, null, 2)
    try { await navigator.clipboard.writeText(output); setStatus('Copied font config.') }
    catch { setCopyFallback(output); setStatus('Clipboard unavailable. Copy the selected config below.'); requestAnimationFrame(() => copyArea.current?.select()) }
  }
  const star = (id: string) => {
    setShortlist(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const minWeight = info?.weightAxis?.min ?? Math.min(...(info?.font.weights ?? [base.weight]))
  const maxWeight = info?.weightAxis?.max ?? Math.max(...(info?.font.weights ?? [base.weight]))

  return <>
    <PageTools active={active} picking={picking} panel={panel} onPick={selectTarget} onCancel={stopPicking} />
    <div ref={panel} className="font-lab" style={{ left: position.x, top: position.y }}>
      <header className="font-lab-header" onPointerDown={event => {
        if ((event.target as Element).closest('button') || event.button !== 0) return
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y }
      }} onPointerMove={event => {
        if (drag.current?.pointer !== event.pointerId) return
        const origin = drag.current
        setPosition(clampPosition(origin.startX + event.clientX - origin.x, origin.startY + event.clientY - origin.y))
      }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
        <span className="font-lab-grip" aria-hidden="true">⠿</span><strong>FONT LAB <small>DEV · V2</small></strong>
        <button className="font-lab-icon" aria-label="Pick text" aria-pressed={picking} title="Pick text on the website" onClick={() => { if (browsing) cancelBrowser(); setPicking(!picking) }}>✎</button>
        <button className="font-lab-icon" aria-label={open ? 'Collapse Font Lab' : 'Expand Font Lab'} aria-expanded={open} onClick={() => { if (browsing) cancelBrowser(); setOpen(!open) }}>{open ? '−' : '+'}</button>
      </header>
      {picking && <p className="font-lab-pick-message">PICK TEXT · click a highlighted target · Esc cancels</p>}
      {open && <>
        <div className="font-lab-editing"><small>EDITING</small><strong>{currentTarget.name}</strong></div>
        <div className="font-lab-body">
        {browsing ? <FontBrowser catalog={catalog} sample={currentTarget.sample} candidateId={current.fontId ?? currentTarget.baselineFont} shortlist={shortlist} onStar={star} onPreview={font => void previewFont(font)} onAccept={font => void previewFont(font, true)} onCancel={cancelBrowser} /> : <>
          <details className="font-lab-targets"><summary>Choose text target <span>{targets.length} targets</span></summary>
            {targets.map(target => <button key={target.id} aria-pressed={active === target.id} onClick={() => selectTarget(target.id)}>{target.name}</button>)}
          </details>
          <div ref={controls} className="font-lab-controls">
            <span className="font-lab-label">FONT</span>
            <button ref={fontButton} data-font-browser-trigger className="font-lab-font-button" aria-label="Browse fonts" aria-haspopup="dialog" disabled={!catalog.length} onClick={() => { sequence.current++; setCandidate(null); setStatus(''); setCopyFallback(''); setPicking(false); setBrowsing(true) }}><strong>{current.family ?? base.family}</strong><span>Browse fonts ↗</span></button>
            {catalogError ? <div role="alert" className="font-lab-error">{catalogError}<button onClick={() => fetchCatalog(true)}>Retry catalog</button></div> : <p className="font-lab-hint">{catalog.length ? `${catalog.length.toLocaleString()} families · temporary session only` : 'Loading Fontsource catalog…'}</p>}
            {info && <p className="font-lab-axis">{info.weightAxis ? `VARIABLE · ${info.weightAxis.min}–${info.weightAxis.max}` : 'STATIC · supported weights only'}{Object.keys(info.axes).filter(axis => axis !== 'wght').length > 0 && <span>Also exposes: {Object.keys(info.axes).filter(axis => axis !== 'wght').join(', ')}</span>}</p>}
            {infoError && <p className="font-lab-error">Weight controls unavailable: {infoError}</p>}
            <Slider label="WEIGHT" value={currentWeight} min={minWeight} max={maxWeight} step={info?.weightAxis?.step ?? 1} disabled={!info} onChange={value => void weightChange(value)} />
            <Slider label="TRACKING" value={current.tracking ?? base.tracking} min={-0.1} max={0.3} step={0.001} suffix=" em" onChange={tracking => update({ tracking })} />
            <Slider label="LINE HEIGHT" value={current.lineHeight ?? base.lineHeight} min={0.7} max={2} step={0.01} onChange={lineHeight => update({ lineHeight })} />
            <Slider label="SIZE" value={current.sizeMultiplier ?? 1} min={0.75} max={1.25} step={0.01} suffix="×" onChange={sizeMultiplier => update({ sizeMultiplier })} />
            <div className="font-lab-actions"><button onClick={reset}>RESET TARGET</button><button onClick={() => void copy()}>COPY TARGET CONFIG</button></div>
            <button className="font-lab-copy-all" onClick={() => void copy(true)}>COPY FONT CONFIG · ALL TARGETS</button>
          </div>
        </>}
        <p className="font-lab-status" role="status" data-loading={loading}>{status}</p>
        {copyFallback && <textarea ref={copyArea} aria-label="Font config to copy" value={copyFallback} readOnly />}
        </div>
      </>}
    </div>
  </>
}
