// Dev-only module: never imported by the production entry graph.
export type CatalogFont = {
  id: string; family: string; category: string; weights: number[]; styles: string[];
  subsets: string[]; defSubset: string; variable: boolean; type: string
}
export type Axis = { min: number; max: number; default: number; step: number }
type Variant = { url: { woff2?: string } }
type FontMetadata = CatalogFont & {
  variants: Record<string, Record<string, Record<string, Variant>>>;
  unicodeRange?: Record<string, string>
}
export type FontInfo = { font: FontMetadata; axes: Record<string, Axis>; weightAxis?: Axis }
export type LoadedFont = { info: FontInfo; family: string; weight: number }
const API = 'https://api.fontsource.org/v1'
let catalogPromise: Promise<CatalogFont[]> | undefined
const metadata = new Map<string, Promise<FontInfo>>()
const files = new Map<string, Promise<LoadedFont>>()
const jobs: Array<{ priority: number; run: () => void }> = []
let active = 0
function drain() {
  jobs.sort((a, b) => b.priority - a.priority)
  while (active < 4 && jobs.length) {
    active++
    jobs.shift()!.run()
  }
}
function queued<T>(work: () => Promise<T>, priority: number): Promise<T> {
  return new Promise((resolve, reject) => {
    jobs.push({ priority, run: () => { void work().then(resolve, reject).finally(() => { active--; drain() }) } })
    drain()
  })
}
async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Fontsource returned ${response.status}. Try again when the service is available.`)
  return response.json() as Promise<T>
}
export function getCatalog(retry = false) {
  if (retry) catalogPromise = undefined
  return catalogPromise ??= json<CatalogFont[]>('fonts').then(fonts => fonts.sort((a, b) => a.family.localeCompare(b.family)))
}
export function getInfo(font: CatalogFont, priority = 0): Promise<FontInfo> {
  let promise = metadata.get(font.id)
  if (!promise) {
    promise = queued(async () => {
      const detail = await json<FontMetadata>(`fonts/${encodeURIComponent(font.id)}`)
      const axes: Record<string, Axis> = {}
      if (detail.variable) {
        const response = await json<{ axes: Record<string, Record<string, string | number>> }>(`variable/${encodeURIComponent(font.id)}`)
        for (const [name, axis] of Object.entries(response.axes)) {
          axes[name] = { min: Number(axis.min), max: Number(axis.max), default: Number(axis.default), step: Number(axis.step) || 1 }
        }
      }
      return { font: detail, axes, weightAxis: axes.wght }
    }, priority)
    metadata.set(font.id, promise)
    void promise.catch(() => metadata.delete(font.id))
  }
  return promise
}
export function realWeight(info: FontInfo, desired: number) {
  const axis = info.weightAxis
  if (axis) return Math.max(axis.min, Math.min(axis.max, axis.min + Math.round((desired - axis.min) / axis.step) * axis.step))
  return info.font.weights.reduce((best, weight) => Math.abs(weight - desired) < Math.abs(best - desired) ? weight : best, info.font.weights[0] ?? 400)
}
export function loadFont(font: CatalogFont, desired = 400, priority = 0): Promise<LoadedFont> {
  return getInfo(font, priority).then(info => {
    const weight = realWeight(info, desired)
    const key = `${font.id}:${info.weightAxis ? 'variable' : weight}`
    let promise = files.get(key)
    if (!promise) {
      promise = queued(async () => {
        const subset = info.font.subsets.includes('latin') ? 'latin' : info.font.defSubset
        if (!info.font.subsets.some(name => name.startsWith('latin'))) throw new Error(`${font.family} has no Latin subset for this English text.`)
        const style = info.font.styles.includes('normal') ? 'normal' : info.font.styles[0]
        // The individual endpoint exposes static file URLs. Fontsource documents
        // this separate :vf CDN format for variable WOFF2 files (see README).
        const url = info.weightAxis
          ? `https://cdn.jsdelivr.net/fontsource/fonts/${encodeURIComponent(font.id)}:vf@latest/${subset}-wght-${style}.woff2`
          : info.font.variants[String(weight)]?.[style]?.[subset]?.url.woff2
        if (!url) throw new Error(`No usable WOFF2 variant for ${font.family}.`)
        const family = `FontLab-${font.id}` // Isolate previews from the local production families.
        const sheet = document.createElement('style')
        sheet.dataset.fontLabFace = key
        const range = info.weightAxis ? `${info.weightAxis.min} ${info.weightAxis.max}` : String(weight)
        sheet.textContent = `@font-face { font-family: "${family}"; src: url(${JSON.stringify(url)}) format("woff2"); font-weight: ${range}; font-style: normal; font-display: swap; ${info.font.unicodeRange?.[subset] ? `unicode-range: ${info.font.unicodeRange[subset]};` : ''} }`
        document.head.append(sheet)
        let timeout: ReturnType<typeof setTimeout> | undefined
        try {
          const faces = await Promise.race([
            document.fonts.load(`${weight} 24px "${family}"`, 'Welcome. RISHAV'),
            new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Font download timed out. Try this font again.')), 20000) }),
          ])
          if (!faces.length) throw new Error(`The font file for ${font.family} could not be loaded.`)
          return { info, family, weight }
        } catch (error) {
          sheet.remove()
          throw new Error(`${font.family} preview failed. Your previous font is intact. ${error instanceof Error ? error.message : ''}`)
        } finally { if (timeout) clearTimeout(timeout) }
      }, priority)
      files.set(key, promise)
      void promise.catch(() => files.delete(key))
    }
    return promise.then(loaded => ({ ...loaded, weight }))
  })
}
