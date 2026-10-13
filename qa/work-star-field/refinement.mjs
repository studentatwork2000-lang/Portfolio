import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { launch, makePage, enterWork, snapshot, differences } from './browser.mjs'

const output = 'qa/work-star-field/refinement'
const before = JSON.parse(await readFile(`${output}/before.json`, 'utf8'))
const browser = await launch()
const results = []
try {
  for (const baseline of before) {
    const { viewport, target } = baseline
    const { page, context, errors } = await makePage(browser, viewport)
    await enterWork(page)
    const rest = await snapshot(page)
    await page.screenshot({ path: `${output}/after-rest-${viewport.width}x${viewport.height}.png` })
    const densityRatio = rest.stars.length / baseline.rest.length
    assert(densityRatio > 1.05 && densityRatio < 1.1, 'resting density increases modestly')
    await page.mouse.move(target.x, target.y)
    await page.waitForTimeout(80)
    const entry = await snapshot(page)
    await page.waitForTimeout(1200)
    const cluster = await snapshot(page)
    const attraction = differences(rest, cluster)
    const responseRatio = differences(rest, entry).maxDisplacement / attraction.maxDisplacement
    assert(responseRatio > 0.5, 'gathering responds within the first 80 ms')
    assert(attraction.moved > baseline.attraction.moved * 3, 'influence reaches substantially more stars')
    const count = (stars, radius) => stars.filter(s => Math.hypot(s.x - target.x, s.y - target.y) < radius).length
    const cores = [30, 45, 85, 150].map(radius => ({
      radius,
      beforeRest: count(baseline.rest, radius), beforeCluster: count(baseline.cluster, radius),
      afterRest: count(rest.stars, radius), afterCluster: count(cluster.stars, radius),
    }))
    assert(cores[1].afterCluster > cores[1].beforeCluster * 3, 'compact core is visibly denser than before')
    // Compare the same stars, so the result measures spacing compression rather
    // than the modest population increase or drawing larger/brighter points.
    const members = rest.stars.map((s, i) => ({ s, i })).filter(({ s }) => Math.hypot(s.x - target.x, s.y - target.y) < 150)
    const meanSeparation = stars => {
      let sum = 0, pairs = 0
      for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
        const a = stars[members[i].i], b = stars[members[j].i]
        sum += Math.hypot(a.x - b.x, a.y - b.y); pairs++
      }
      return sum / pairs
    }
    const spacing = { rest: meanSeparation(rest.stars), cluster: meanSeparation(cluster.stars) }
    assert(spacing.cluster < spacing.rest * 0.3, 'existing stars genuinely pack closer together')
    await page.screenshot({ path: `${output}/after-cluster-${viewport.width}x${viewport.height}.png` })
    // Moving through a sparse pocket and the section edges must remain bounded,
    // finite, and correctly clipped, without reallocating the canvas.
    for (const point of [{ x: viewport.width * .5, y: viewport.height * .55 }, { x: 8, y: 8 }, { x: viewport.width - 8, y: viewport.height - 8 }]) {
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(650)
      const state = await snapshot(page)
      assert(state.stars.every(s => Number.isFinite(s.x) && Number.isFinite(s.y) && s.r > 0 && s.alpha <= .95))
      assert.equal(state.allocations, rest.allocations, 'no buffer reallocations during pointer motion')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width)
    }
    await page.screenshot({ path: `${output}/edge-cluster-${viewport.width}x${viewport.height}.png` })
    await page.locator('#work').dispatchEvent('pointerleave', { pointerType: 'mouse' })
    await page.waitForTimeout(1500)
    assert.equal((await snapshot(page)).data, rest.data, 'edge interaction recovers exact resting pixels')
    assert.deepEqual(errors, [])
    results.push({ viewport, stars: { before: baseline.rest.length, after: rest.stars.length }, densityRatio, attraction, responseRatio, spacing, cores, edgeChecks: true, errors })
    console.log(`${viewport.width}x${viewport.height}: comparison, compression, responsive entry, edges and recovery passed`)
    await context.close()
  }
  await writeFile(`${output}/comparison.json`, JSON.stringify(results, null, 2))
} finally {
  await browser.close()
}
