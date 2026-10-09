import hero from '../../src/components/Hero/Hero.module.css'
import intro from '../../src/components/IntroStatement/IntroStatement.module.css'

export type TargetId = 'hero-title' | 'intro-display' | 'intro-subtitle' | 'work-heading' | 'work-project' | 'aesthetics-heading' | 'utility'
export type Settings = { fontId?: string; family?: string; cssFamily?: string; weight?: number; tracking?: number; lineHeight?: number; sizeMultiplier?: number }
export type Target = { id: TargetId; name: string; sample: string; baselineFont: string; nodes: () => HTMLElement[]; outlines: () => HTMLElement[] }
const all = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector))
const attr = (id: string) => `[data-font-lab-target="${id}"]`
export const targets: Target[] = [
  { id: 'hero-title', name: 'RISHAV / WEB STUDIO', sample: 'RISHAV WEB STUDIO', baselineFont: 'manrope', nodes: () => all(`.${hero.firstLine}, .${hero.secondLine}`), outlines: () => all(attr('hero-title')) },
  { id: 'intro-display', name: 'Welcome. / Present your…', sample: 'Welcome. Present your business', baselineFont: 'archivo-black', nodes: () => all(attr('intro-display')), outlines: () => all(`.${intro.welcomeLetter}, .${intro.lead}, .${intro.word}, .${intro.reducedWelcome}, .${intro.reducedStatements}`) },
  { id: 'intro-subtitle', name: 'In a beautiful way.', sample: 'In a beautiful way.', baselineFont: 'inter', nodes: () => all(attr('intro-subtitle')), outlines: () => all(attr('intro-subtitle')) },
  { id: 'work-heading', name: 'GLIMPSES OF MY WORK', sample: 'Glimpses of My Work', baselineFont: 'inter-tight', nodes: () => all(attr('work-heading')), outlines: () => all(attr('work-heading')) },
  { id: 'work-project', name: 'Restaurant / Clinic / Motorsport / Real Estate', sample: 'Restaurant · Clinic · Motorsport · Real Estate', baselineFont: 'inter-tight', nodes: () => all(attr('work-project')), outlines: () => all(attr('work-project')) },
  { id: 'aesthetics-heading', name: 'Aesthetics that fit you.', sample: 'Aesthetics that fit you.', baselineFont: 'archivo-black', nodes: () => all(attr('aesthetics-heading')), outlines: () => all(attr('aesthetics-heading')) },
  { id: 'utility', name: 'RISHAV WEB STUDIO / WORK / APPROACH / CONTACT', sample: 'RISHAV WEB STUDIO  WORK  APPROACH  CONTACT', baselineFont: 'ibm-plex-mono', nodes: () => all('[data-font-lab-target="utility"] a'), outlines: () => all('[data-font-lab-target="utility"] a') },
]
export function baselineValues(target: Target) {
  const node = target.nodes()[0]
  if (!node) return { family: '', weight: 400, tracking: 0, lineHeight: 1, sizeMultiplier: 1 }
  const style = getComputedStyle(node)
  const size = Number.parseFloat(style.fontSize)
  return { family: style.fontFamily.split(',')[0].replaceAll('"', '').trim(), weight: Number(style.fontWeight) || 400, tracking: (Number.parseFloat(style.letterSpacing) || 0) / size, lineHeight: Number.parseFloat(style.lineHeight) / size || 1, sizeMultiplier: 1 }
}
export function visibleRects(target: Target): DOMRect[] {
  return target.outlines().flatMap(node => {
    if (!node.getClientRects().length) return []
    let current: HTMLElement | null = node
    while (current) {
      const style = getComputedStyle(current)
      if (Number(style.opacity) < 0.04 || style.visibility === 'hidden' || style.display === 'none') return []
      current = current.parentElement
    }
    const rect = node.getBoundingClientRect()
    return rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth ? [rect] : []
  })
}
export function targetAt(x: number, y: number) {
  return targets.find(target => visibleRects(target).some(rect => x >= rect.left - 5 && x <= rect.right + 5 && y >= rect.top - 5 && y <= rect.bottom + 5))
}
