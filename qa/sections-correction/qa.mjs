import { chromium } from '/home/rishav/.npm/_npx/fd3bca3c548369c0/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('qa/sections-correction')
const videoRoot = path.join(root, '.video-temp')
const baseURL = 'http://127.0.0.1:5174/'
const executablePath = '/home/rishav/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell'
const metrics = { consoleErrors: [], pageErrors: [], viewports: {}, interactions: {} }

await mkdir(root, { recursive: true })
await mkdir(videoRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

async function makePage(viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    reducedMotion: options.reducedMotion ? 'reduce' : 'no-preference',
    recordVideo: options.recordVideo ? { dir: videoRoot, size: viewport } : undefined,
  })
  const page = await context.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') metrics.consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => metrics.pageErrors.push(error.message))
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

async function scrollToProgress(page, selector, progress) {
  await page.evaluate(
    ({ selector, progress }) => {
      const section = document.querySelector(selector)
      if (!(section instanceof HTMLElement)) throw new Error(`Missing ${selector}`)
      const top = section.getBoundingClientRect().top + window.scrollY
      const travel = Math.max(1, section.offsetHeight - window.innerHeight)
      window.scrollTo({ top: top + travel * progress, behavior: 'instant' })
    },
    { selector, progress },
  )
  await page.waitForTimeout(140)
}

async function saveVideo(page, context, filename) {
  const video = page.video()
  await page.close()
  if (video) await video.saveAs(path.join(root, filename))
  await context.close()
}

const primary = await makePage({ width: 1440, height: 900 })
const primaryPage = primary.page

const introStates = [
  ['welcome', 0.1],
  ['business', 0.38],
  ['work', 0.52],
  ['brand', 0.62],
  ['self', 0.75],
  ['resolved', 0.97],
]

metrics.viewports['1440x900'] = { intro: {}, carousel: {}, aesthetics: {} }
for (const [name, progress] of introStates) {
  await scrollToProgress(primaryPage, '#approach', progress)
  await primaryPage.screenshot({ path: path.join(root, `intro-${name}-1440x900.png`) })
  metrics.viewports['1440x900'].intro[name] = await primaryPage.evaluate(() => {
    const copy = document.querySelector('[class*="copyStage"]')?.getBoundingClientRect()
    const mask = document.querySelector('[class*="wordViewport"]')?.getBoundingClientRect()
    const visibleWords = [...document.querySelectorAll('[class*="_word_"]')]
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return { text: element.textContent, top: rect.top, bottom: rect.bottom }
      })
      .filter((word) => mask && word.bottom > mask.top && word.top < mask.bottom)
    return {
      copyCentreDeltaX: copy ? copy.left + copy.width / 2 - window.innerWidth / 2 : null,
      copyCentreDeltaY: copy ? copy.top + copy.height / 2 - window.innerHeight / 2 : null,
      mask: mask ? { top: mask.top, bottom: mask.bottom, height: mask.height } : null,
      visibleWords,
    }
  })
}

await scrollToProgress(primaryPage, '#approach', 0.85)
await primaryPage.screenshot({ path: path.join(root, 'intro-resolution-transition-1440x900.png') })

await primaryPage.locator('header[class*="headingStage"]').scrollIntoViewIfNeeded()
await primaryPage.waitForTimeout(140)
await primaryPage.screenshot({ path: path.join(root, 'work-heading-1440x900.png') })

const carousel = primaryPage.getByLabel('Project carousel')
await carousel.scrollIntoViewIfNeeded()
await primaryPage.waitForTimeout(150)
for (let index = 0; index < 4; index += 1) {
  if (index > 0) {
    await primaryPage.getByRole('button', { name: 'Show next project' }).click()
    await primaryPage.waitForTimeout(750)
  }
  await primaryPage.screenshot({ path: path.join(root, `work-${index + 1}-1440x900.png`) })
}

await carousel.focus()
await primaryPage.keyboard.press('Home')
await primaryPage.waitForTimeout(700)
metrics.interactions.boundaries = {
  atStart: {
    previousDisabled: await primaryPage
      .getByRole('button', { name: 'Show previous project' })
      .isDisabled(),
    nextDisabled: await primaryPage.getByRole('button', { name: 'Show next project' }).isDisabled(),
  },
}
const keyboardStates = []
for (const key of ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'End', 'Home']) {
  await primaryPage.keyboard.press(key)
  await primaryPage.waitForTimeout(700)
  keyboardStates.push({
    key,
    status: await primaryPage.locator('[class*="activeStatus"]').innerText(),
  })
}
metrics.interactions.keyboard = keyboardStates
await primaryPage.keyboard.press('End')
await primaryPage.waitForTimeout(700)
metrics.interactions.boundaries.atEnd = {
  previousDisabled: await primaryPage
    .getByRole('button', { name: 'Show previous project' })
    .isDisabled(),
  nextDisabled: await primaryPage.getByRole('button', { name: 'Show next project' }).isDisabled(),
}
await primaryPage.keyboard.press('Home')
await primaryPage.waitForTimeout(700)

const carouselBox = await carousel.boundingBox()
if (!carouselBox) throw new Error('Carousel has no bounding box')
await primaryPage.mouse.move(carouselBox.x + carouselBox.width * 0.72, carouselBox.y + carouselBox.height * 0.55)
await primaryPage.mouse.down()
await primaryPage.mouse.move(carouselBox.x + carouselBox.width * 0.18, carouselBox.y + carouselBox.height * 0.55, { steps: 18 })
await primaryPage.mouse.up()
await primaryPage.waitForTimeout(800)
metrics.interactions.pointerDragStatus = await primaryPage.locator('[class*="activeStatus"]').innerText()

metrics.interactions.carousel = await primaryPage.evaluate(() => {
  const viewport = document.querySelector('[aria-label="Project carousel"]')
  const previous = document.querySelector('[aria-label="Show previous project"]')
  const next = document.querySelector('[aria-label="Show next project"]')
  return {
    carouselCount: document.querySelectorAll('[aria-label="Project carousel"]').length,
    articleCount: viewport?.querySelectorAll('article').length,
    previousDisabled: previous instanceof HTMLButtonElement ? previous.disabled : null,
    nextDisabled: next instanceof HTMLButtonElement ? next.disabled : null,
  }
})

await scrollToProgress(primaryPage, 'section[aria-labelledby="aesthetics-heading"]', 0.08)
await primaryPage.screenshot({ path: path.join(root, 'aesthetics-opening-1440x900.png') })
metrics.viewports['1440x900'].aesthetics.opening = await primaryPage.evaluate(() => {
  const heading = document.querySelector('#aesthetics-heading')?.getBoundingClientRect()
  return heading
    ? {
        centreDeltaX: heading.left + heading.width / 2 - window.innerWidth / 2,
        centreDeltaY: heading.top + heading.height / 2 - window.innerHeight / 2,
      }
    : null
})
await scrollToProgress(primaryPage, 'section[aria-labelledby="aesthetics-heading"]', 0.78)
await primaryPage.screenshot({ path: path.join(root, 'aesthetics-formed-1440x900.png') })
metrics.viewports['1440x900'].aesthetics.formed = await primaryPage.evaluate(() => {
  const rect = (selector) => {
    const value = document.querySelector(selector)?.getBoundingClientRect()
    return value ? { top: value.top, right: value.right, bottom: value.bottom, left: value.left } : null
  }
  return {
    heading: rect('#aesthetics-heading'),
    plant: rect('figure[role="img"]'),
    provide: rect('section[aria-labelledby="aesthetics-heading"] h3'),
  }
})

await primary.context.close()

const viewportCases = [
  [1366, 768],
  [768, 800],
  [390, 844],
  [844, 390],
]

for (const [width, height] of viewportCases) {
  const key = `${width}x${height}`
  const { context, page } = await makePage({ width, height })
  metrics.viewports[key] = {}

  await scrollToProgress(page, '#approach', height <= 520 ? 0 : 0.75)
  await page.screenshot({ path: path.join(root, `viewport-${key}-intro.png`) })

  await page.locator('header[class*="headingStage"]').scrollIntoViewIfNeeded()
  await page.waitForTimeout(140)
  await page.screenshot({ path: path.join(root, `viewport-${key}-work-heading.png`) })

  const localCarousel = page.getByLabel('Project carousel')
  await localCarousel.scrollIntoViewIfNeeded()
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(root, `viewport-${key}-work.png`) })

  const aestheticsSection = 'section[aria-labelledby="aesthetics-heading"]'
  await scrollToProgress(page, aestheticsSection, width <= 820 || height <= 700 ? 0 : 0.05)
  await page.screenshot({ path: path.join(root, `viewport-${key}-aesthetics-opening.png`) })

  if (width <= 820 || height <= 700) {
    await page.locator('figure[role="img"]').scrollIntoViewIfNeeded()
    await page.waitForTimeout(120)
    await page.screenshot({ path: path.join(root, `viewport-${key}-aesthetics-plant.png`) })
    await page.getByRole('heading', { name: 'What I Provide' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(120)
    await page.screenshot({ path: path.join(root, `viewport-${key}-aesthetics-copy.png`) })
  } else {
    await scrollToProgress(page, aestheticsSection, 0.78)
    await page.screenshot({ path: path.join(root, `viewport-${key}-aesthetics-formed.png`) })
  }

  metrics.viewports[key].layout = await page.evaluate(() => ({
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    flowFallback: document.querySelector('section[aria-labelledby="aesthetics-heading"]')?.getAttribute('data-flow'),
  }))
  await context.close()
}

const reduced = await makePage({ width: 1440, height: 900 }, { reducedMotion: true })
await reduced.page.locator('#approach').scrollIntoViewIfNeeded()
await reduced.page.waitForTimeout(120)
await reduced.page.screenshot({ path: path.join(root, 'reduced-intro-1440x900.png') })
await reduced.page.getByLabel('Project carousel').scrollIntoViewIfNeeded()
await reduced.page.getByRole('button', { name: 'Show next project' }).click()
await reduced.page.waitForTimeout(120)
await reduced.page.screenshot({ path: path.join(root, 'reduced-work-1440x900.png') })
await reduced.page.locator('#aesthetics-heading').scrollIntoViewIfNeeded()
await reduced.page.waitForTimeout(120)
await reduced.page.screenshot({ path: path.join(root, 'reduced-aesthetics-heading-1440x900.png') })
await reduced.page.locator('figure[role="img"]').scrollIntoViewIfNeeded()
await reduced.page.waitForTimeout(120)
await reduced.page.screenshot({ path: path.join(root, 'reduced-aesthetics-composition-1440x900.png') })
metrics.interactions.reducedMotion = await reduced.page.evaluate(() => ({
  introHeight: document.querySelector('#approach')?.getBoundingClientRect().height,
  introStatic: document.querySelector('#approach')?.getAttribute('data-static'),
  carouselBehavior: getComputedStyle(document.querySelector('[aria-label="Project carousel"]')).scrollBehavior,
  aestheticsFlow: document.querySelector('section[aria-labelledby="aesthetics-heading"]')?.getAttribute('data-flow'),
}))
await reduced.context.close()

const introVideo = await makePage({ width: 1366, height: 768 }, { recordVideo: true })
await introVideo.page.evaluate(async () => {
  const section = document.querySelector('#approach')
  const top = section.getBoundingClientRect().top + window.scrollY
  const travel = section.offsetHeight - window.innerHeight
  document.documentElement.style.scrollBehavior = 'auto'
  window.scrollTo({ top, behavior: 'instant' })
  await new Promise((resolve) => setTimeout(resolve, 500))
  const start = performance.now()
  const duration = 7200
  await new Promise((resolve) => {
    const step = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      window.scrollTo({ top: top + travel * progress, behavior: 'instant' })
      if (progress < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  await new Promise((resolve) => setTimeout(resolve, 700))
})
await saveVideo(introVideo.page, introVideo.context, 'intro-continuous-1366x768.webm')

const workVideo = await makePage({ width: 1366, height: 768 }, { recordVideo: true })
await workVideo.page.getByLabel('Project carousel').scrollIntoViewIfNeeded()
await workVideo.page.waitForTimeout(500)
for (let count = 0; count < 3; count += 1) {
  await workVideo.page.getByRole('button', { name: 'Show next project' }).click()
  await workVideo.page.waitForTimeout(900)
}
for (let count = 0; count < 3; count += 1) {
  await workVideo.page.getByRole('button', { name: 'Show previous project' }).click()
  await workVideo.page.waitForTimeout(900)
}
await saveVideo(workVideo.page, workVideo.context, 'work-next-previous-1366x768.webm')

const aestheticsVideo = await makePage({ width: 1440, height: 900 }, { recordVideo: true })
await aestheticsVideo.page.evaluate(async () => {
  const section = document.querySelector('section[aria-labelledby="aesthetics-heading"]')
  const top = section.getBoundingClientRect().top + window.scrollY
  const travel = section.offsetHeight - window.innerHeight
  document.documentElement.style.scrollBehavior = 'auto'
  window.scrollTo({ top, behavior: 'instant' })
  await new Promise((resolve) => setTimeout(resolve, 500))
  const start = performance.now()
  const duration = 4600
  await new Promise((resolve) => {
    const step = (now) => {
      const progress = Math.min(.8, ((now - start) / duration) * .8)
      window.scrollTo({ top: top + travel * progress, behavior: 'instant' })
      if (progress < .8) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
  await new Promise((resolve) => setTimeout(resolve, 700))
})
await saveVideo(aestheticsVideo.page, aestheticsVideo.context, 'aesthetics-formation-1440x900.webm')

await writeFile(path.join(root, 'metrics.json'), `${JSON.stringify(metrics, null, 2)}\n`)
await browser.close()

console.log(JSON.stringify(metrics, null, 2))
