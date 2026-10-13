import { chromium } from '/home/codespace/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ headless: true, executablePath: '/home/codespace/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox'] })
const results = []
for (const [width, height] of [[1440,900],[1366,640],[390,844]]) {
  const page = await browser.newPage({viewport:{width,height}})
  await page.goto('http://127.0.0.1:5173', {waitUntil:'networkidle'})
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(650)
  await page.screenshot({path:`qa/work-star-field/hero-${width}x${height}.png`})
  const style = await page.addStyleTag({content:'main > header, main > section, main > footer { visibility: hidden !important; }'})
  const png = await page.screenshot({path:`qa/work-star-field/hero-stars-${width}x${height}.png`})
  const pixels = await page.evaluate(async base64 => {
    const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode()
    const c = document.createElement('canvas'); c.width=img.width; c.height=img.height
    const ctx=c.getContext('2d'); ctx.drawImage(img,0,0)
    const {data}=ctx.getImageData(0,0,c.width,c.height)
    const seen = new Uint8Array(c.width*c.height)
    let count=0, litPixels=0, max=0, luminance=0
    const isStar=i=>Math.max(data[i*4],data[i*4+1],data[i*4+2])>25
    for (let i=0;i<seen.length;i++) {
      max=Math.max(max,data[i*4]);
      if (!isStar(i)) continue
      litPixels++; luminance+=data[i*4]
      if(seen[i])continue
      count++;const queue=[i];seen[i]=1
      while(queue.length){const p=queue.pop();const x=p%c.width,y=Math.floor(p/c.width)
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=x+dx,yy=y+dy,n=yy*c.width+xx
          if(xx<0||xx>=c.width||yy<0||yy>=c.height||seen[n]||!isStar(n))continue
          seen[n]=1;queue.push(n)
        }
      }
    }
    return {count,litPixels,max,luminance}
  },png.toString('base64'))
  await style.evaluate(el=>el.remove())
  results.push({width,height,skyReady:await page.locator('[data-sky-ready]').getAttribute('data-sky-ready'),stars:pixels,work:await page.locator('#work').evaluate(el=>({height:el.offsetHeight,children:el.childElementCount,background:getComputedStyle(el).backgroundColor}))})
  await page.close()
}
await writeFile('qa/work-star-field/inspection.json',JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
await browser.close()
