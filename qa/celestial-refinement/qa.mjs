// Run against a running Vite or preview server. Playwright stays outside app dependencies:
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node qa/celestial-refinement/qa.mjs
// Optional: HERO_QA_URL, HERO_QA_OUTPUT, PLAYWRIGHT_CHROMIUM_EXECUTABLE.
// Targeted reruns: HERO_QA_CASES='responsive,WebGL context loss'
// HERO_QA_VIEWPORTS='390x844,600x900,768x1024'.
// HERO_QA_CLEARANCE=1 additionally pulls the cord at every requested viewport.
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const output = process.env.HERO_QA_OUTPUT || path.join(tmpdir(), 'hero-celestial-refinement')
const baseURL = process.env.HERO_QA_URL || 'http://127.0.0.1:5173/'
const selectedCases = process.env.HERO_QA_CASES?.split(',').map(value => value.trim())
const viewports = (process.env.HERO_QA_VIEWPORTS || '1440x900,390x844,1920x1080,1366x768,768x1024,360x800,320x568,844x390')
  .split(',').map(value => value.split('x').map(Number))
const results = { baseURL, viewports: {}, interactions: {}, consoleErrors: [], pageErrors: [], expectedWebGLErrors: [], failures: [] }
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

async function scenario(name, test) {
  if (selectedCases && !selectedCases.some(selected => name.startsWith(selected))) return
  try {
    await test()
    console.log(`PASS ${name}`)
  } catch (error) {
    results.failures.push({ name, error: error.message })
    console.error(`FAIL ${name}: ${error.message}`)
  } finally {
    await writeFile(path.join(output, 'metrics.json'), JSON.stringify(results, null, 2) + '\n')
  }
}

async function makePage(viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    hasTouch: Boolean(options.touch),
    isMobile: Boolean(options.touch),
    reducedMotion: options.reduced ? 'reduce' : 'no-preference',
  })
  if (options.noWebGL) await context.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (/webgl|experimental-webgl/.test(kind)) return null
      return getContext.call(this, kind, ...args)
    }
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => results.pageErrors.push({ scenario: options.name, error: error.message }))
  page.on('console', message => {
    if (message.type() !== 'error') return
    const value = { scenario: options.name, error: message.text() }
    if (options.noWebGL && /(?:Error creating WebGL context|WebGL is not supported)/i.test(value.error)) results.expectedWebGLErrors.push(value)
    else results.consoleErrors.push(value)
  })
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.locator('[data-bulb-control]').waitFor()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(900)
  assert.equal(await page.locator('vite-error-overlay').count(), 0, 'No Vite error overlay')
  return { context, page }
}

const screenshot = (page, name) => page.screenshot({ path: path.join(output, `${name}.png`) })
const bulb = page => page.locator('[data-bulb-control]')
const title = page => page.locator('[class*="titleVisual"]')

async function geometry(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect()
      return bounds ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, right: bounds.right, bottom: bounds.bottom } : null
    }
    return {
      viewport: { width: innerWidth, height: innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      hero: rect('main[data-light]'),
      title: rect('[class*="titleVisual"]'),
      copy: rect('[class*="location"]'),
      bulb: rect('[data-bulb-control]'),
      topBar: [rect('main[data-light] > header > a'), rect('main[data-light] > header > nav')],
      footer: [rect('main[data-light] > footer > p'), rect('main[data-light] > footer > a')],
      skyReady: document.querySelector('[data-sky-ready]')?.getAttribute('data-sky-ready'),
    }
  })
}

function assertLayout(data) {
  assert.ok(data.documentWidth <= data.viewport.width + 1, 'No horizontal document overflow')
  for (const key of ['title', 'copy', 'bulb']) {
    const box = data[key]
    assert.ok(box?.width > 0 && box.height > 0, `${key} exists and has area`)
    assert.ok(box.x >= -1 && box.right <= data.viewport.width + 1, `${key} fits horizontally`)
    assert.ok(box.y >= data.hero.y && box.bottom <= data.hero.bottom + 1, `${key} fits inside Hero`)
  }
  for (const key of ['topBar', 'footer']) {
    const [left, right] = data[key]
    assert.ok(left && right, `${key} has both children`)
    assert.ok(left.x >= -1 && right.right <= data.viewport.width + 1, `${key} children fit viewport`)
    assert.ok(left.right <= right.x || left.bottom <= right.y || right.bottom <= left.y, `${key} children do not overlap`)
  }
}

async function pull(page, { touch = false, distance = 72, cancel = false } = {}) {
  // Use the actual hit area of the hanging weight, not the visually separate bulb.
  const handle = page.locator('[data-cord-hit]').last()
  let box = await handle.boundingBox()
  assert.ok(box, 'Cord weight has a hit target')
  const overflow = box.y + box.height / 2 + distance + 20 - page.viewportSize().height
  if (overflow > 0) {
    await page.evaluate(amount => window.scrollBy({ top: amount, behavior: 'instant' }), overflow)
    await page.waitForTimeout(80)
    box = await handle.boundingBox()
  }
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  let session
  if (touch) {
    session = await page.context().newCDPSession(page)
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  } else {
    await page.mouse.move(x, y)
    await page.mouse.down()
  }
  for (let step = 1; step <= 12; step++) {
    const nextY = y + distance * step / 12
    if (touch) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: nextY }] })
    else await page.mouse.move(x, nextY)
    await page.waitForTimeout(18)
  }
  const dragging = await bulb(page).getAttribute('data-dragging')
  const armed = await bulb(page).getAttribute('data-armed')
  // Hold long enough for the rope solver to reach the full extension before measuring.
  await page.waitForTimeout(250)
  const copyClearance = await page.evaluate(() => {
    const weight = document.querySelector('[class*="pullWeight_"]')?.getBoundingClientRect()
    const copy = document.querySelector('[class*="location"]')?.getBoundingClientRect()
    return weight && copy ? copy.top - weight.bottom : null
  })
  if (touch) {
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] })
    await session.detach()
  } else await page.mouse.up()
  await page.waitForTimeout(180)
  return { dragging, armed, pressed: await bulb(page).getAttribute('aria-pressed'), copyClearance }
}

try {
  for (const [width, height] of viewports) {
    await scenario(`responsive ${width}x${height}`, async () => {
      const { page, context } = await makePage({ width, height }, { touch: width <= 844, name: `${width}x${height}` })
      try {
        const data = await geometry(page)
        results.viewports[`${width}x${height}`] = data
        await screenshot(page, `hero-${width}x${height}`)
        assertLayout(data)
        assert.equal(await page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link').count(), 3)
        assert.equal(await page.getByRole('heading', { level: 1 }).count(), 1)
        if (process.env.HERO_QA_CLEARANCE === '1') {
          const pulled = await pull(page, { touch: width <= 844 })
          results.viewports[`${width}x${height}`].fullPull = pulled
          assert.equal(pulled.armed, 'true', 'Full pull arms the bulb at this viewport')
          assert.equal(pulled.pressed, 'true', 'Full pull toggles the bulb at this viewport')
          assert.ok(pulled.copyClearance > 0, 'Fully extended cord does not overlap support copy')
        }
      } finally { await context.close() }
    })
  }

  await scenario('desktop camera and bulb interaction', async () => {
    const { page, context } = await makePage({ width: 1440, height: 900 }, { name: 'desktop-interaction' })
    try {
      assert.equal(await page.locator('[data-sky-ready]').getAttribute('data-sky-ready'), 'true', 'WebGL scene renders')
      const initial = await title(page).boundingBox()
      const positions = []
      for (const [name, x, y] of [['left-up', 5, 100], ['right-up', 1435, 100], ['right-down', 1435, 895], ['left-down', 5, 895]]) {
        await page.mouse.move(x, y, { steps: 15 })
        await page.waitForTimeout(850)
        const box = await title(page).boundingBox()
        positions.push({ name, box, drift: await page.locator('main[data-light]').evaluate(element => ({ x: element.style.getPropertyValue('--sky-drift-x'), y: element.style.getPropertyValue('--sky-drift-y') })) })
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(box[key] - initial[key]) < 0.1, `Title ${key} stays fixed at ${name}`)
        await screenshot(page, `camera-${name}`)
      }
      results.interactions.pointer = positions
      const drift = positions.map(position => ({ x: Number.parseFloat(position.drift.x), y: Number.parseFloat(position.drift.y) }))
      assert.ok(drift.every(value => Number.isFinite(value.x) && Number.isFinite(value.y)), 'Scene reports damped motion')
      assert.ok(drift.every(value => Math.abs(value.x) <= 22.1 && Math.abs(value.y) <= 16.1), 'Scene drift remains bounded')
      assert.ok(drift[0].x > 15 && drift[1].x < -15, 'Scene visibly responds in both horizontal directions')
      assert.ok(drift[0].y > 10 && drift[2].y < -10, 'Scene visibly responds in both vertical directions')
      await page.mouse.move(720, 450, { steps: 12 })
      await page.waitForTimeout(650)
      const pulled = await pull(page)
      assert.equal(pulled.dragging, 'true', 'Mouse captures cord')
      assert.equal(pulled.armed, 'true', 'Full mouse pull arms bulb')
      assert.equal(pulled.pressed, 'true', 'Full mouse pull toggles light on')
      results.interactions.mousePull = pulled
      await screenshot(page, 'desktop-light-on')
      await bulb(page).focus()
      await page.keyboard.press('Enter')
      assert.equal(await bulb(page).getAttribute('aria-pressed'), 'false', 'Enter toggles off')
      await page.keyboard.press('Space')
      assert.equal(await bulb(page).getAttribute('aria-pressed'), 'true', 'Space toggles on')
      results.interactions.keyboard = { enter: 'off', space: 'on' }
      await screenshot(page, 'desktop-keyboard-focus')
      await page.waitForTimeout(2400)
      const partial = await pull(page, { distance: 10 })
      assert.equal(partial.armed, null, 'Short pull does not arm bulb')
      assert.equal(partial.pressed, 'true', 'Short pull leaves light unchanged')
      results.interactions.shortPull = partial
    } finally { await context.close() }
  })

  await scenario('mobile touch pull and cancellation', async () => {
    const { page, context } = await makePage({ width: 390, height: 844 }, { touch: true, name: 'touch' })
    try {
      const scrollBefore = await page.evaluate(() => scrollY)
      const pulled = await pull(page, { touch: true })
      assert.equal(pulled.dragging, 'true')
      assert.equal(pulled.armed, 'true')
      assert.equal(pulled.pressed, 'true', 'Touch pull toggles light on')
      assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'Cord drag does not scroll page')
      results.interactions.touch = pulled
      await screenshot(page, 'mobile-light-on')
      await page.waitForTimeout(2500)
      const cancelled = await pull(page, { touch: true, cancel: true })
      assert.equal(cancelled.pressed, 'true', 'Cancelled gesture leaves light on')
      results.interactions.touchCancelled = cancelled
    } finally { await context.close() }
  })

  await scenario('reduced motion', async () => {
    const { page, context } = await makePage({ width: 1440, height: 900 }, { reduced: true, name: 'reduced-motion' })
    try {
      const initial = await title(page).boundingBox()
      const canvas = page.locator('main[data-light] canvas')
      const before = await canvas.screenshot()
      await page.mouse.move(1430, 20)
      await page.waitForTimeout(400)
      const after = await canvas.screenshot()
      assert.ok(before.equals(after), 'Reduced-motion sky is static across pointer moves')
      assert.deepEqual(await title(page).boundingBox(), initial)
      await bulb(page).focus()
      await page.keyboard.press('Enter')
      assert.equal(await bulb(page).getAttribute('aria-pressed'), 'true')
      results.interactions.reducedMotion = { staticSky: true, keyboardWorks: true }
      await screenshot(page, 'reduced-motion')
    } finally { await context.close() }
  })

  await scenario('no WebGL fallback', async () => {
    const { page, context } = await makePage({ width: 1440, height: 900 }, { noWebGL: true, name: 'no-WebGL' })
    try {
      await page.waitForFunction(() => !document.querySelector('main[data-light] canvas'))
      const fallback = page.locator('[class*="skyFallback"]')
      assert.equal(await fallback.isVisible(), true, 'Fallback sky is visible')
      assert.equal(await fallback.evaluate(element => getComputedStyle(element).opacity), '1')
      assertLayout(await geometry(page))
      await bulb(page).focus()
      await page.keyboard.press('Space')
      assert.equal(await bulb(page).getAttribute('aria-pressed'), 'true')
      results.interactions.noWebGL = { fallbackVisible: true, bulbWorks: true }
      await screenshot(page, 'no-webgl-fallback')
    } finally { await context.close() }
  })

  await scenario('WebGL context loss', async () => {
    const { page, context } = await makePage({ width: 1440, height: 900 }, { name: 'context-loss' })
    try {
      await page.mouse.move(1420, 100, { steps: 12 })
      await page.waitForTimeout(650)
      const driftBefore = await page.locator('main[data-light]').evaluate(element => element.style.getPropertyValue('--sky-drift-x'))
      assert.ok(Math.abs(Number.parseFloat(driftBefore)) > 1, 'Move scene before context loss')
      const supported = await page.locator('main[data-light] canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        const extension = gl?.getExtension('WEBGL_lose_context')
        extension?.loseContext()
        return Boolean(extension)
      })
      assert.ok(supported, 'Context-loss extension available in test browser')
      await page.waitForFunction(() => !document.querySelector('main[data-light] canvas'))
      assert.equal(await page.locator('[class*="skyFallback"]').isVisible(), true)
      const driftAfter = await page.locator('main[data-light]').evaluate(element => ({ x: element.style.getPropertyValue('--sky-drift-x'), y: element.style.getPropertyValue('--sky-drift-y') }))
      assert.equal(Number.parseFloat(driftAfter.x), 0, 'Context loss resets horizontal accent drift')
      assert.equal(Number.parseFloat(driftAfter.y), 0, 'Context loss resets vertical accent drift')
      await bulb(page).focus()
      await page.keyboard.press('Enter')
      assert.equal(await bulb(page).getAttribute('aria-pressed'), 'true')
      results.interactions.contextLoss = { fallbackVisible: true, bulbWorks: true, driftBefore, driftAfter }
      await screenshot(page, 'context-loss-fallback')
    } finally { await context.close() }
  })
} finally {
  await browser.close()
  if (results.pageErrors.length) results.failures.push({ name: 'runtime errors', errors: results.pageErrors })
  if (results.consoleErrors.length) results.failures.push({ name: 'console errors', errors: results.consoleErrors })
  await writeFile(path.join(output, 'metrics.json'), JSON.stringify(results, null, 2) + '\n')
  console.log(`Artifacts: ${output}`)
  if (results.failures.length) process.exitCode = 1
}
