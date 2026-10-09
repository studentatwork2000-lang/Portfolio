import { useEffect, useMemo, useRef, useState } from 'react'
import { loadFont, type CatalogFont } from './fontsource'

const ROW = 94
const categories = [['', 'All'], ['sans-serif', 'Sans Serif'], ['serif', 'Serif'], ['display', 'Display'], ['monospace', 'Monospace'], ['handwriting', 'Handwriting']]

function FontRow({ font, sample, selected, starred, root, onPreview, onAccept, onStar }: {
  font: CatalogFont; sample: string; selected: boolean; starred: boolean; root: HTMLDivElement | null;
  onPreview: () => void; onAccept: () => void; onStar: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const [family, setFamily] = useState<string>()
  const [error, setError] = useState('')
  useEffect(() => {
    if (!row.current || !root) return
    let alive = true
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      void loadFont(font).then(loaded => { if (alive) setFamily(loaded.family) }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : 'Sample unavailable') })
    }, { root })
    observer.observe(row.current)
    return () => { alive = false; observer.disconnect() }
  }, [font, root])
  return <div ref={row} className="font-lab-row" data-selected={selected} role="option" aria-selected={selected} id={`font-option-${font.id}`}>
    <button className="font-lab-row-main" onClick={onPreview} onDoubleClick={onAccept} tabIndex={-1} aria-label={`Preview ${font.family}`}>
      <span className="font-lab-row-name">{font.family}<small>{font.category} · {font.variable ? 'VARIABLE' : 'STATIC'}</small></span>
      <span className="font-lab-sample" style={{ fontFamily: family ? `"${family}"` : undefined }} title={error}>{family ? sample : error ? 'Sample unavailable' : 'Loading sample…'}</span>
    </button>
    <button className="font-lab-star" aria-label={`${starred ? 'Remove' : 'Shortlist'} ${font.family}`} aria-pressed={starred} onClick={onStar}>{starred ? '★' : '☆'}</button>
  </div>
}

export default function FontBrowser({ catalog, sample, candidateId, shortlist, onStar, onPreview, onAccept, onCancel }: {
  catalog: CatalogFont[]; sample: string; candidateId?: string; shortlist: Set<string>;
  onStar: (id: string) => void; onPreview: (font: CatalogFont) => void;
  onAccept: (font: CatalogFont) => void; onCancel: () => void
}) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [variable, setVariable] = useState(false)
  const [shortlisted, setShortlisted] = useState(false)
  const [focused, setFocused] = useState(candidateId ?? '')
  const [scroll, setScroll] = useState(0)
  const [height, setHeight] = useState(320)
  const list = useRef<HTMLDivElement>(null)
  const [listRoot, setListRoot] = useState<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(() => {
    const text = search.trim().toLocaleLowerCase()
    return catalog.filter(font => (!text || `${font.family} ${font.id}`.toLocaleLowerCase().includes(text)) && (!category || font.category === category) && (!variable || font.variable) && (!shortlisted || shortlist.has(font.id)))
  }, [catalog, search, category, variable, shortlisted, shortlist])
  useEffect(() => { searchRef.current?.focus(); setListRoot(list.current) }, [])
  useEffect(() => { if (list.current) list.current.scrollTop = 0; setScroll(0) }, [search, category, variable, shortlisted])
  useEffect(() => {
    if (!list.current) return
    const observer = new ResizeObserver(() => setHeight(list.current?.clientHeight ?? 320))
    observer.observe(list.current)
    return () => observer.disconnect()
  }, [])
  const start = Math.max(0, Math.floor(scroll / ROW) - 1)
  const end = Math.min(filtered.length, Math.ceil((scroll + height) / ROW) + 1)
  const choose = (font: CatalogFont) => { setFocused(font.id); onPreview(font) }
  const key = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); return }
    if (event.key === 'Enter') {
      const font = filtered.find(item => item.id === focused)
      if (font) { event.preventDefault(); onAccept(font) }
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !filtered.length) return
    event.preventDefault()
    const previous = filtered.findIndex(font => font.id === focused)
    const index = previous < 0 ? (event.key === 'ArrowDown' ? 0 : filtered.length - 1) : Math.max(0, Math.min(filtered.length - 1, previous + (event.key === 'ArrowDown' ? 1 : -1)))
    choose(filtered[index])
    if (list.current) {
      const top = index * ROW
      if (top < list.current.scrollTop) list.current.scrollTop = top
      else if (top + ROW > list.current.scrollTop + height) list.current.scrollTop = top + ROW - height
    }
  }
  const focusedFont = catalog.find(font => font.id === focused)
  return <div className="font-lab-browser" role="dialog" aria-label="Font browser" onKeyDown={key}>
    <div className="font-lab-browser-title"><strong>Browse fonts</strong><button onClick={onCancel} aria-label="Cancel font browser">×</button></div>
    <input ref={searchRef} className="font-lab-search" aria-label="Search fonts" placeholder="Search 2,000+ families…" value={search} onChange={event => setSearch(event.target.value)} aria-controls="font-lab-list" aria-activedescendant={focused && filtered.slice(start, end).some(font => font.id === focused) ? `font-option-${focused}` : undefined} role="combobox" aria-expanded="true" aria-autocomplete="list" />
    <div className="font-lab-filters" aria-label="Font filters">{categories.map(([value, label]) => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}</div>
    <div className="font-lab-filters"><button aria-pressed={variable} onClick={() => setVariable(!variable)}>Variable only</button><button aria-pressed={shortlisted} onClick={() => setShortlisted(!shortlisted)}>★ Shortlisted ({shortlist.size})</button></div>
    <p className="font-lab-hint">{filtered.length.toLocaleString()} families · click to audition · double-click to use</p>
    <div ref={list} id="font-lab-list" className="font-lab-list" role="listbox" aria-label="Font families" onScroll={event => setScroll(event.currentTarget.scrollTop)}>
      <div style={{ height: filtered.length * ROW, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: `${start * ROW}px 0 auto` }}>{filtered.slice(start, end).map(font => <FontRow key={font.id} font={font} sample={sample} selected={focused === font.id} starred={shortlist.has(font.id)} root={listRoot} onPreview={() => choose(font)} onAccept={() => onAccept(font)} onStar={() => onStar(font.id)} />)}</div>
      </div>
      {!filtered.length && <p className="font-lab-empty">No families match. Try another search or filter.</p>}
    </div>
    <div className="font-lab-browser-footer"><span>{focusedFont?.family ?? 'Select a font'}<small>↑ ↓ preview · Enter use · Esc cancel</small></span><button className="font-lab-primary" disabled={!focusedFont} onClick={() => { if (focusedFont) onAccept(focusedFont) }}>USE THIS FONT</button></div>
  </div>
}
