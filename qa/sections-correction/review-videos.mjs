import { chromium } from '/home/rishav/.npm/_npx/fd3bca3c548369c0/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('qa/sections-correction')
const frameRoot = path.join(root, 'recording-review-frames')
const executablePath = '/home/rishav/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell'
const recordings = [
  { name: 'intro', file: 'intro-continuous-1366x768.webm', width: 1366, height: 768 },
  { name: 'work', file: 'work-next-previous-1366x768.webm', width: 1366, height: 768 },
  { name: 'aesthetics', file: 'aesthetics-formation-1440x900.webm', width: 1440, height: 900 },
]
const fractions = [0.04, 0.18, 0.34, 0.5, 0.66, 0.82, 0.96]
const review = {}

await mkdir(frameRoot, { recursive: true })
const browser = await chromium.launch({ executablePath, headless: true })

for (const recording of recordings) {
  const page = await browser.newPage({ viewport: { width: recording.width, height: recording.height } })
  await page.goto(`file://${path.join(root, recording.file)}`)
  const video = page.locator('video')
  await video.waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const element = document.querySelector('video')
    return element && Number.isFinite(element.duration) && element.duration > 0
  })
  await video.evaluate((element) => {
    element.controls = false
    element.pause()
  })
  const duration = await video.evaluate((element) => element.duration)
  review[recording.name] = { duration, frames: [] }

  for (const fraction of fractions) {
    const time = duration * fraction
    await video.evaluate(async (element, targetTime) => {
      await new Promise((resolve) => {
        element.addEventListener('seeked', resolve, { once: true })
        element.currentTime = targetTime
      })
    }, time)
    const filename = `${recording.name}-${String(Math.round(fraction * 100)).padStart(2, '0')}.png`
    await video.screenshot({ path: path.join(frameRoot, filename) })
    review[recording.name].frames.push({ fraction, time, filename })
  }

  await page.close()
}

await browser.close()
await writeFile(path.join(root, 'recording-review.json'), `${JSON.stringify(review, null, 2)}\n`)
console.log(JSON.stringify(review, null, 2))
