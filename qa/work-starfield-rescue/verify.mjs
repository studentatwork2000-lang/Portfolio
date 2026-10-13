import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'

// Test tooling only: use an existing Playwright installation, without adding a
// runtime dependency. Start Vite here so browser/server share a network context.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = process.env.QA_OUTPUT || join(tmpdir(), `work-starfield-rescue-${process.env.QA_PASS || '1'}`)
await mkdir(output, { recursive: true })
const server = process.env.QA_URL ? null : await createServer({
  server: { host: '127.0.0.1', port: 0 },
})
await server?.listen()
const url = process.env.QA_URL || server.resolvedUrls.local[0]
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const results = []

async function makePage(viewport, options = {}) {
  const context = await browser.newContext({ viewport, ...options })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => {
    if (m.type() === 'error' && !m.location().url.endsWith('/favicon.ico')) errors.push(m.text())
  })
  await page.addInitScript(() => {
    const q = window.workRescueQA = {
      points: [], frames: new Set(), draws: 0, allocations: 0,
      times: [], durations: [], listeners: [], observers: [],
    }
    const raf = window.requestAnimationFrame, cancel = window.cancelAnimationFrame
    window.requestAnimationFrame = function (fn) {
      if (fn.name !== 'animate' || !fn.toString().includes('movingStars')) return raf.call(window, fn)
      const id = raf.call(window, time => { q.frames.delete(id); fn(time) })
      q.frames.add(id)
      return id
    }
    window.cancelAnimationFrame = function (id) {
      q.frames.delete(id)
      return cancel.call(window, id)
    }
    const fillRect = CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      if (this.canvas.closest('#work')) {
        q.points = []; q.draws++; q.times.push(performance.now())
      }
      return fillRect.apply(this, args)
    }
    const drawImage = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (image, x, y, w, h, ...args) {
      const result = drawImage.call(this, image, x, y, w, h, ...args)
      if (this.canvas.closest('#work')) {
        q.points.push({ x: x + w / 2, y: y + h / 2, size: w, alpha: this.globalAlpha })
        q.durations[q.times.length - 1] = performance.now() - q.times.at(-1)
      }
      return result
    }
    for (const name of ['width', 'height']) {
      const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, name)
      Object.defineProperty(HTMLCanvasElement.prototype, name, { ...d, set(value) {
        if (this.closest('#work')) q.allocations++
        d.set.call(this, value)
      } })
    }
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener
    EventTarget.prototype.addEventListener = function (type, fn, options) {
      if (['onPointerMove', 'releasePointer', 'resize', 'syncVisibility', 'syncInput'].includes(fn?.name)
        && ['canInteract', 'pointer.active', 'movingStars', 'resetStars'].some(s => fn.toString().includes(s))) {
        q.listeners.push({ target: this, type, fn })
      }
      return add.call(this, type, fn, options)
    }
    EventTarget.prototype.removeEventListener = function (type, fn, options) {
      q.listeners = q.listeners.filter(l => !(l.target === this && l.type === type && l.fn === fn))
      return remove.call(this, type, fn, options)
    }
    for (const name of ['ResizeObserver', 'IntersectionObserver']) {
      const Native = window[name]
      window[name] = class extends Native {
        constructor(callback) { super(callback); this.qaActive = false; q.observers.push(this) }
        observe(target, ...args) { if (target.id === 'work') this.qaActive = true; return super.observe(target, ...args) }
        disconnect() { this.qaActive = false; return super.disconnect() }
      }
    }
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { context, page, errors }
}

const settle = page => page.waitForFunction(() => window.workRescueQA.frames.size === 0)
async function enterWork(page) {
  await page.mouse.move(-20, -20)
  await page.evaluate(() => document.querySelector('#work').scrollIntoView({ behavior: 'instant' }))
  await page.waitForTimeout(150)
  await page.waitForFunction(() => {
    const c = document.querySelector('#work canvas'), r = c.parentElement.getBoundingClientRect()
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3_000_000 / (r.width * r.height)))
    return window.workRescueQA.points.length > 0 && window.workRescueQA.frames.size === 0
      && Math.abs(r.top) < 1 && c.width === Math.round(r.width * scale)
      && c.height === Math.round(r.height * scale)
  })
}
const snapshot = page => page.evaluate(() => ({
  points: window.workRescueQA.points, draws: window.workRescueQA.draws,
  allocations: window.workRescueQA.allocations,
  data: document.querySelector('#work canvas').toDataURL(),
}))
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const maxDifference = (a, b, filter = () => true) => Math.max(0, ...a.points.map((p, i) =>
  filter(p, i) ? distance(p, b.points[i]) : 0))
const countNear = (state, pointer, radius) => state.points.filter(p => distance(p, pointer) < radius).length
const release = page => page.mouse.move(-20, -20)
const percentile = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)]

try {
  const { page, context, errors } = await makePage({ width: 1440, height: 900 })
  await enterWork(page)
  const rest = await snapshot(page)
  await page.screenshot({ path: join(output, 'rest-1440x900.png') })
  await page.waitForTimeout(200)
  assert.equal((await snapshot(page)).draws, rest.draws, 'static field sleeps')

  // A: stationary cursor produces a compact concentration with distant stars
  // untouched. Star shape stays identical; no overbright central knot.
  const pointer = { x: 418, y: 279 }
  await page.mouse.move(pointer.x, pointer.y)
  await settle(page)
  const cluster = await snapshot(page)
  const density = { rest: countNear(rest, pointer, 70), gathered: countNear(cluster, pointer, 70) }
  assert(density.gathered >= density.rest * 4 && density.gathered > 25, 'perceptible compact concentration')
  assert(maxDifference(rest, cluster, p => distance(p, pointer) >= 480) < 0.001, 'finite home-based influence')
  assert(maxDifference(rest, cluster) > 100 && maxDifference(rest, cluster) < 250, 'strong but bounded displacement')
  cluster.points.forEach((p, i) => {
    assert.equal(p.size, rest.points[i].size, 'stars never grow')
    assert(p.alpha - rest.points[i].alpha <= 0.04001, 'subtle brightness only')
  })
  assert.equal(cluster.allocations, rest.allocations, 'no interaction canvas allocations')
  await page.screenshot({ path: join(output, 'cluster-pocket-1440x900.png') })
  await page.waitForTimeout(200)
  assert.equal((await snapshot(page)).draws, cluster.draws, 'stationary cluster sleeps')

  // B: slow travel releases the old stars while recruiting a NEW local region.
  const end = { x: 1080, y: 594 }
  for (let i = 1; i <= 32; i++) {
    await page.mouse.move(pointer.x + (end.x - pointer.x) * i / 32, pointer.y + (end.y - pointer.y) * i / 32)
    await page.waitForTimeout(17)
  }
  await settle(page)
  const travelled = await snapshot(page)
  const releasedAtOldRegion = maxDifference(rest, travelled, p => distance(p, end) >= 480)
  assert(releasedAtOldRegion < 0.001, 'old stars home while cursor remains elsewhere in section')
  assert(countNear(travelled, end, 70) > countNear(rest, end, 70) * 3, 'new nearby stars gather')
  await page.screenshot({ path: join(output, 'slow-travel-1440x900.png') })

  // C: rapid cross-section travel. After just 250 ms, displaced stars whose
  // homes are outside the CURRENT influence must already be very close home.
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(i % 2 ? 1260 : 130, i % 2 ? 650 : 220)
    await page.waitForTimeout(25)
  }
  const rapidEnd = { x: 1290, y: 300 }
  await page.mouse.move(rapidEnd.x, rapidEnd.y)
  await page.waitForTimeout(250)
  const rapid = await snapshot(page)
  const fastReleaseError = maxDifference(rest, rapid, p => distance(p, rapidEnd) >= 480)
  assert(fastReleaseError < 3, 'no travelling passengers or long return tails')
  await settle(page)
  assert(maxDifference(rest, await snapshot(page), p => distance(p, rapidEnd) >= 480) < 0.001)
  await page.screenshot({ path: join(output, 'rapid-travel-1440x900.png') })

  // D/E: smooth exit and pixel-identical restoration, then repeated visits
  // reproduce the exact cluster with no accumulated positional drift.
  await release(page)
  await page.waitForTimeout(100)
  const partial = await snapshot(page)
  assert(maxDifference(rest, partial) > 0 && maxDifference(rest, partial) < 45, 'prompt, gradual restoration')
  await settle(page)
  assert((await snapshot(page)).data === rest.data, 'exact resting pixels after exit')
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(pointer.x, pointer.y)
    await settle(page)
    assert((await snapshot(page)).data === cluster.data, 'deterministic repeated cluster')
    await release(page)
    await settle(page)
    assert((await snapshot(page)).data === rest.data, 'zero cumulative drift')
    await page.mouse.move(-20, -20)
  }
  await page.screenshot({ path: join(output, 'restored-1440x900.png') })
  await page.mouse.move(720, 450)
  await settle(page)
  await page.screenshot({ path: join(output, 'cluster-center-1440x900.png') })

  if (process.env.QA_MOTION) {
    let index = 0
    const capture = async delay => {
      await page.waitForTimeout(delay)
      await page.screenshot({ path: join(output, `motion-${String(index++).padStart(2, '0')}.png`) })
    }
    await release(page); await settle(page); await capture(0)
    await page.mouse.move(418, 279)
    for (const delay of [40, 60, 120, 300]) await capture(delay)
    await page.mouse.move(1200, 550)
    for (const delay of [40, 80, 220]) await capture(delay)
    await release(page)
    for (const delay of [40, 80, 350]) await capture(delay)
    await settle(page)
    assert((await snapshot(page)).data === rest.data, 'motion sampling restores exact field')
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(150)
  const offscreen = await snapshot(page)
  await page.waitForTimeout(200)
  assert.equal((await snapshot(page)).draws, offscreen.draws, 'offscreen processing stops')
  await enterWork(page)
  assert((await snapshot(page)).data === rest.data, 'scroll reentry restores field')
  await page.mouse.move(720, 450)
  await page.waitForTimeout(60)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(100)
  // Intro's reduced-motion flow shifts Work out of view; inspect its fallback
  // after navigating back, rather than comparing a suspended offscreen buffer.
  await enterWork(page)
  assert((await snapshot(page)).data === rest.data, 'live reduced motion restores field')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await enterWork(page)
  await page.mouse.move(740, 460)
  await page.waitForTimeout(60)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hidden = await snapshot(page)
  await page.waitForTimeout(150)
  assert.equal((await snapshot(page)).draws, hidden.draws, 'hidden tab processing stops')
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')) })
  assert((await snapshot(page)).data === rest.data, 'visibility restoration resets field')

  const lifecycle = await page.evaluate(async () => {
    const q = window.workRescueQA
    const listeners = q.listeners.length, observers = q.observers.filter(o => o.qaActive).length
    const strictModeCounts = { pointerMove: q.listeners.filter(l => l.fn.name === 'onPointerMove').length,
      mediaChange: q.listeners.filter(l => l.fn.name === 'syncInput').length, observers }
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const dom = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { createRoot } = dom.default || dom
    const { default: Work } = await import('/src/components/WorkStarField/WorkStarField.tsx')
    const original = document.querySelector('#work'); original.id = 'work-original'
    const cycles = []
    for (let i = 0; i < 3; i++) {
      const host = document.createElement('div'); document.body.append(host)
      const root = createRoot(host)
      root.render(React.createElement(React.StrictMode, null, React.createElement(Work)))
      await new Promise(r => setTimeout(r, 70))
      const work = host.querySelector('#work'); work.scrollIntoView({ behavior: 'instant' })
      await new Promise(r => setTimeout(r, 70))
      work.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', clientX: 418, clientY: 279 }))
      await new Promise(r => setTimeout(r, 30))
      const pendingBefore = q.frames.size
      root.unmount(); host.remove()
      await new Promise(r => setTimeout(r, 30))
      cycles.push({ pendingBefore, pendingAfter: q.frames.size, listeners: q.listeners.length,
        observers: q.observers.filter(o => o.qaActive).length })
    }
    original.id = 'work'
    return { listeners, observers, strictModeCounts, cycles,
      drawMs: q.durations.filter(Number.isFinite), frameTimes: q.times.slice() }
  })
  assert.equal(lifecycle.strictModeCounts.pointerMove, 1, 'StrictMode does not duplicate input')
  assert.equal(lifecycle.strictModeCounts.mediaChange, 2)
  assert.equal(lifecycle.strictModeCounts.observers, 2)
  for (const cycle of lifecycle.cycles) {
    assert(cycle.pendingBefore > 0, 'unmount exercised during active animation')
    assert.equal(cycle.pendingAfter, 0, 'unmount cancels animation')
    assert.equal(cycle.listeners, lifecycle.listeners, 'unmount removes listeners')
    assert.equal(cycle.observers, lifecycle.observers, 'unmount disconnects observers')
  }
  assert.deepEqual(errors, [], 'no browser runtime errors')
  results.push({ test: 'A–E interaction, visibility, reduced motion, StrictMode, cleanup', stars: rest.points.length,
    densityWithin70px: density, releasedAtOldRegion, fastReleaseError,
    drawMs: { median: percentile(lifecycle.drawMs, 0.5), p95: percentile(lifecycle.drawMs, 0.95) },
    lifecycle: { ...lifecycle, drawMs: undefined, frameTimes: undefined }, errors })
  console.log('A–E interaction and lifecycle: passed')
  await context.close()

  for (const item of [
    { width: 1366, height: 640 }, { width: 1280, height: 720 },
    { width: 390, height: 844, touch: true, dpr: 3 },
    { width: 320, height: 568, touch: true, dpr: 2 },
    { width: 844, height: 390, touch: true, dpr: 2 },
    { width: 1440, height: 900, reduced: true },
    { width: 2560, height: 1440, dpr: 2 },
  ]) {
    const { width, height, touch = false, reduced = false, dpr = 1 } = item
    const name = `${width}x${height}${touch ? '-touch' : ''}${reduced ? '-reduced' : ''}`
    const { page, context, errors } = await makePage({ width, height }, {
      hasTouch: touch, isMobile: touch, deviceScaleFactor: dpr,
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    })
    await enterWork(page)
    const rest = await snapshot(page)
    const layout = await page.locator('#work').evaluate(el => {
      const c = el.querySelector('canvas'), r = el.getBoundingClientRect()
      return { background: getComputedStyle(el).backgroundColor, width: r.width, height: r.height,
        documentWidth: document.documentElement.scrollWidth, text: el.textContent,
        controls: el.querySelectorAll('h1,h2,h3,a,button,nav').length,
        pixels: c.width * c.height, scale: c.width / r.width,
        nextGap: el.nextElementSibling.getBoundingClientRect().top - r.bottom }
    })
    assert.equal(layout.background, 'rgb(3, 4, 5)')
    assert.equal(layout.width, width); assert.equal(layout.height, height)
    assert.equal(layout.documentWidth, width); assert.equal(layout.nextGap, 0)
    assert.equal(layout.text, ''); assert.equal(layout.controls, 0)
    assert(layout.pixels <= 3_005_000 && layout.scale <= 1.501, 'bounded canvas memory')
    await page.screenshot({ path: join(output, `rest-${name}.png`) })
    await page.mouse.move(width * 0.29, height * 0.31)
    if (touch) await page.locator('#work').dispatchEvent('pointermove', { pointerType: 'touch', clientX: 100, clientY: 100 })
    await settle(page)
    const gathered = await snapshot(page)
    if (touch || reduced) {
      assert(gathered.data === rest.data, 'static touch/reduced-motion fallback')
      assert.equal(gathered.draws, rest.draws, 'fallback does not process pointer events')
    } else {
      assert(maxDifference(rest, gathered) > 60, 'desktop attraction visible')
      await page.screenshot({ path: join(output, `cluster-${name}.png`) })
      await release(page); await settle(page)
      assert((await snapshot(page)).data === rest.data, 'restoration at every desktop size')
      await page.setViewportSize({ width: 1024, height: 700 }); await enterWork(page)
      await page.setViewportSize({ width, height }); await enterWork(page)
      assert((await snapshot(page)).data === rest.data, 'resize round trip is deterministic')
    }
    const idle = await snapshot(page)
    await page.waitForTimeout(200)
    assert.equal((await snapshot(page)).draws, idle.draws, 'viewport field sleeps')
    assert.deepEqual(errors, [], 'no browser runtime errors')
    results.push({ test: name, stars: rest.points.length, layout, errors })
    console.log(`${name}: passed`)
    await context.close()
  }
  await writeFile(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n')
  console.log(`Evidence: ${output}`)
} finally {
  await browser.close()
  await server?.close()
}
