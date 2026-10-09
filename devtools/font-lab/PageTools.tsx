import { useEffect, useRef } from 'react'
import { targetAt, targets, visibleRects, type TargetId } from './targets'

export default function PageTools({ active, picking, panel, onPick, onCancel }: {
  active: TargetId; picking: boolean; panel: React.RefObject<HTMLDivElement | null>;
  onPick: (target: TargetId) => void; onCancel: () => void
}) {
  const layer = useRef<HTMLDivElement>(null)
  const hovered = useRef<TargetId | undefined>(undefined)
  useEffect(() => {
    let frame = 0
    const draw = () => {
      const target = targets.find(item => item.id === (picking ? hovered.current : active))
      const rects = target ? visibleRects(target) : []
      const root = layer.current
      if (root) {
        while (root.children.length > rects.length) root.lastElementChild?.remove()
        rects.forEach((rect, index) => {
          let box = root.children[index] as HTMLElement | undefined
          if (!box) { box = document.createElement('div'); box.className = 'font-lab-outline'; root.append(box) }
          Object.assign(box.style, { left: `${rect.left - 4}px`, top: `${rect.top - 4}px`, width: `${rect.width + 8}px`, height: `${rect.height + 8}px` })
          box.dataset.picking = String(picking)
          box.dataset.label = index === 0 ? target?.name ?? '' : ''
        })
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [active, picking])

  useEffect(() => {
    if (!picking) { hovered.current = undefined; return }
    document.documentElement.classList.add('font-lab-picking')
    const insidePanel = (event: Event) => event.target instanceof Node && panel.current?.contains(event.target)
    const move = (event: PointerEvent) => {
      hovered.current = insidePanel(event) ? undefined : targetAt(event.clientX, event.clientY)?.id
    }
    // Capture before rope, navigation or carousel handlers, including pointerdown.
    const block = (event: Event) => {
      if (insidePanel(event)) return
      event.preventDefault(); event.stopImmediatePropagation()
    }
    const click = (event: MouseEvent) => {
      if (insidePanel(event)) return
      block(event)
      const target = targetAt(event.clientX, event.clientY)
      if (target) onPick(target.id)
    }
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onCancel() }
      else if (!insidePanel(event) && ['Enter', ' '].includes(event.key)) block(event)
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerdown', block, true)
    window.addEventListener('pointerup', block, true)
    window.addEventListener('click', click, true)
    window.addEventListener('keydown', key, true)
    return () => {
      document.documentElement.classList.remove('font-lab-picking')
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerdown', block, true)
      window.removeEventListener('pointerup', block, true)
      window.removeEventListener('click', click, true)
      window.removeEventListener('keydown', key, true)
    }
  }, [picking, panel, onPick, onCancel])
  return <div ref={layer} className="font-lab-outlines" aria-hidden="true" />
}
