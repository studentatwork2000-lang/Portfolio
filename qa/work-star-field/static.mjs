import { chromium } from '/home/codespace/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs'
import { readFile, writeFile } from 'node:fs/promises'
const browser=await chromium.launch({headless:true,executablePath:'/home/codespace/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']})
const hero=JSON.parse(await readFile('qa/work-star-field/inspection.json','utf8'))
const results=[]
for(const {width,height,stars:baseline} of hero){
  const page=await browser.newPage({viewport:{width,height}})
  await page.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'})
  await page.evaluate(()=>document.querySelector('#work').scrollIntoView({behavior:'instant'}))
  await page.waitForTimeout(250)
  await page.screenshot({path:`qa/work-star-field/static-${width}x${height}.png`})
  const field=await page.locator('#work canvas').evaluate(c=>{
    const {data}=c.getContext('2d').getImageData(0,0,c.width,c.height)
    const seen=new Uint8Array(c.width*c.height), sectors=Array(12).fill(0)
    let count=0,litPixels=0,background=0,luminance=0
    const lit=i=>Math.max(data[i*4],data[i*4+1],data[i*4+2])>25
    for(let i=0;i<seen.length;i++){
      if(data[i*4]===3&&data[i*4+1]===4&&data[i*4+2]===5)background++
      if(!lit(i))continue
      litPixels++;luminance+=data[i*4]
      if(seen[i])continue
      count++; sectors[Math.min(2,Math.floor(Math.floor(i/c.width)/c.height*3))*4+Math.min(3,Math.floor((i%c.width)/c.width*4))]++
      const q=[i];seen[i]=1
      while(q.length){const p=q.pop(),x=p%c.width,y=Math.floor(p/c.width)
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=x+dx,yy=y+dy,n=yy*c.width+xx
          if(xx<0||xx>=c.width||yy<0||yy>=c.height||seen[n]||!lit(n))continue
          seen[n]=1;q.push(n)
        }
      }
    }
    return {count,litPixels,luminance,exactBackgroundPercent:background/seen.length*100,sectors}
  })
  results.push({width,height,hero:baseline,work:field,countRatio:field.count/baseline.count})
  await page.close()
}
console.log(JSON.stringify(results,null,2))
await writeFile('qa/work-star-field/static.json',JSON.stringify(results,null,2))
await browser.close()
