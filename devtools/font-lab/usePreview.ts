import { useLayoutEffect } from 'react'
import { targets, type Settings, type TargetId } from './targets'
import intro from '../../src/components/IntroStatement/IntroStatement.module.css'

export function usePreview(settings: Partial<Record<TargetId, Settings>>) {
  useLayoutEffect(() => {
    let restore: Array<() => void> = []
    const own = (node: HTMLElement, property: string, value: string) => {
      const old = node.style.getPropertyValue(property), priority = node.style.getPropertyPriority(property)
      node.style.setProperty(property, value)
      restore.push(() => old ? node.style.setProperty(property, old, priority) : node.style.removeProperty(property))
    }
    const apply = () => {
      restore.reverse().forEach(fn => fn())
      restore = []
      // Read CSS sizes for every target before overriding any parent typography.
      const groups = targets.map(target => ({ target, nodes: target.nodes().map(node => ({ node, size: Number.parseFloat(getComputedStyle(node).fontSize) })) }))
      for (const { target, nodes } of groups) {
        const value = settings[target.id]
        if (!value) continue
        for (const { node, size } of nodes) {
          if (value.cssFamily) { own(node, 'font-family', `"${value.cssFamily}"`); own(node, 'font-synthesis', 'none') }
          if (value.weight !== undefined) { own(node, 'font-weight', String(value.weight)); own(node, 'font-variation-settings', 'normal') }
          if (value.tracking !== undefined) own(node, 'letter-spacing', node.classList.contains(intro.welcome)
            ? `calc(var(--welcome-tracking) + ${value.tracking + 0.05}em)` : `${value.tracking}em`)
          if (value.lineHeight !== undefined) own(node, 'line-height', String(value.lineHeight))
          if (value.sizeMultiplier !== undefined && value.sizeMultiplier !== 1) own(node, 'font-size', `${size * value.sizeMultiplier}px`)
        }
      }
    }
    const refresh = () => { apply(); window.dispatchEvent(new Event('resize')) }
    apply()
    // V1's text ResizeObserver handles Intro. Work already measures on resize.
    window.dispatchEvent(new Event('resize'))
    window.addEventListener('resize', apply)
    document.fonts.addEventListener('loadingdone', refresh)
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    motion.addEventListener('change', refresh)
    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('[data-font-lab-target]') || node.querySelector('[data-font-lab-target]'))))) refresh()
    })
    const root = document.querySelector('#root')
    if (root) observer.observe(root, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      document.fonts.removeEventListener('loadingdone', refresh)
      motion.removeEventListener('change', refresh)
      restore.reverse().forEach(fn => fn())
    }
  }, [settings])
}
