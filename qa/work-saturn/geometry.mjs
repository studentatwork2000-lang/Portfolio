import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {launch,makePage,enterWork,snapshot,differences} from '../work-star-field/browser.mjs'
const output=`qa/work-saturn/pass-${process.env.QA_PASS||'1'}`
await mkdir(output,{recursive:true})
const baseline=JSON.parse(await readFile(new URL('./resting-baselines.json',import.meta.url),'utf8'))
const browser=await launch(),results=[]
try {
for(const [width,height] of [[1440,900],[1366,640]]) {
 const {page,context,errors}=await makePage(browser,{width,height})
 await enterWork(page)
 const rest=await snapshot(page)
 assert.deepEqual(rest.stars,baseline[`${width}x${height}`].stars)
 assert.equal(createHash('sha256').update(rest.data).digest('hex'),baseline[`${width}x${height}`].pngSha256,'resting pixels unchanged')
 for(const [name,u,v] of [['pocket',.29,.31],['center',.5,.5],['lower',.72,.7]]) {
  const target={x:width*u,y:height*v}
  await page.mouse.move(target.x,target.y)
  await page.waitForFunction(()=>window.workQA.frames.size===0)
  const formed=await snapshot(page)
  const radius=Math.min(560,Math.max(320,Math.min(width*.38,height*.6)))
  const fullyGathered=rest.stars.map((s,i)=>Math.hypot(s.x-target.x,s.y-target.y)<=radius*.8?formed.stars[i]:null).filter(Boolean)
  const counts={core:0,ring:0,outer:0,unassigned:0},ringAlpha=[],outerAlpha=[]
  for(const star of fullyGathered) {
   const dx=star.x-target.x,dy=star.y-target.y,tilt=-20*Math.PI/180
   const x=dx*Math.cos(tilt)+dy*Math.sin(tilt),y=-dx*Math.sin(tilt)+dy*Math.cos(tilt)
   if(Math.hypot(x,y)<=24.1)counts.core++
   else if(Math.abs(Math.hypot(x/78,y/35)-1)<.1){counts.ring++;ringAlpha.push(star.alpha)}
   else if(Math.abs(Math.hypot(x/108,y/49)-1)<.1){counts.outer++;outerAlpha.push(star.alpha)}
   else counts.unassigned++
  }
  assert.equal(counts.unassigned,0,'all fully recruited stars reach disk or ellipse targets')
  assert(counts.core>=15&&counts.ring>=12&&counts.outer>=7,'each formation layer is populated')
  const mean=a=>a.reduce((s,n)=>s+n,0)/a.length
  assert(mean(outerAlpha)<mean(ringAlpha),'outer ellipse remains fainter')
  await page.screenshot({path:`${output}/${width}x${height}-${name}.png`})
  await page.screenshot({path:`${output}/${width}x${height}-${name}-detail.png`,clip:{x:target.x-160,y:target.y-120,width:320,height:240}})
  results.push({width,height,name,counts,meanRingAlpha:mean(ringAlpha),meanOuterAlpha:mean(outerAlpha),reaction:differences(rest,formed),errors})
  await page.locator('#work').dispatchEvent('pointerleave',{pointerType:'mouse'})
  await page.waitForFunction(()=>window.workQA.frames.size===0)
  assert.equal((await snapshot(page)).data,rest.data,'exact resting restoration')
 }
 assert.deepEqual(errors,[])
 await context.close()
}
await writeFile(`${output}/geometry.json`,JSON.stringify(results,null,2))
console.log(JSON.stringify(results,null,2))
} finally {await browser.close()}
