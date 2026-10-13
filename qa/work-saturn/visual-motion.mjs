import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
import {launch,makePage,enterWork,snapshot,differences} from '../work-star-field/browser.mjs'
const output=`qa/work-saturn/pass-${process.env.QA_PASS||'1'}`
await mkdir(output,{recursive:true})
const browser=await launch()
try {
 const {page,context,errors}=await makePage(browser,{width:1440,height:900},{recordVideo:{dir:output,size:{width:960,height:600}}})
 await enterWork(page)
 const rest=await snapshot(page), target={x:720,y:450}
 await page.mouse.move(target.x,target.y)
 await page.waitForTimeout(120)
 const entrance=await snapshot(page)
 await page.screenshot({path:`${output}/motion-entry-120ms.png`})
 await page.waitForTimeout(280)
 await page.screenshot({path:`${output}/motion-entry-400ms.png`})
 await page.waitForFunction(()=>window.workQA.frames.size===0)
 const formed=await snapshot(page)
 assert(differences(rest,entrance).maxDisplacement<differences(rest,formed).maxDisplacement,'entrance eases toward targets')
 await page.evaluate(()=>{
  window.motionSamples=[]
  let count=0
  const sample=()=>{window.motionSamples.push({time:performance.now(),stars:window.workQA.arcs.filter((_,i)=>i%2===1).map(s=>({x:s.x,y:s.y}))});if(++count<120)requestAnimationFrame(sample)}
  requestAnimationFrame(sample)
 })
 for(let i=1;i<=45;i++) {
  await page.mouse.move(target.x+i*7,target.y+Math.sin(i/12)*35)
  await page.waitForTimeout(25)
  if([15,30,45].includes(i))await page.screenshot({path:`${output}/motion-follow-${i}.png`})
 }
 await page.waitForFunction(()=>window.workQA.frames.size===0)
 const samples=await page.evaluate(()=>window.motionSamples)
 let maxStep=0,maxFrameGap=0,maxNormalizedStep=0
 for(let f=1;f<samples.length;f++) {
  const delta=samples[f].time-samples[f-1].time
  maxFrameGap=Math.max(maxFrameGap,delta)
  for(let i=0;i<samples[f].stars.length;i++) {
   const step=Math.hypot(samples[f].stars[i].x-samples[f-1].stars[i].x,samples[f].stars[i].y-samples[f-1].stars[i].y)
   maxStep=Math.max(maxStep,step)
   maxNormalizedStep=Math.max(maxNormalizedStep,step/Math.max(16.7,delta)*16.7)
  }
 }
 console.log({maxStep,maxFrameGap,maxNormalizedStep})
 assert(maxNormalizedStep<35,'continuous travel has no particle jumps at a normalized 60 Hz interval')
 await page.mouse.move(target.x,target.y)
 await page.waitForFunction(()=>window.workQA.frames.size===0)
 const retraced=await snapshot(page)
 assert.deepEqual(retraced.stars,formed.stars,'revisiting a pointer location preserves every assigned slot')
 assert.equal(retraced.data,formed.data,'no random reshuffling or flicker')
 await page.locator('#work').dispatchEvent('pointerleave',{pointerType:'mouse'})
 await page.waitForTimeout(160)
 const returning=await snapshot(page)
 await page.screenshot({path:`${output}/motion-return-160ms.png`})
 await page.waitForFunction(()=>window.workQA.frames.size===0)
 assert.equal((await snapshot(page)).data,rest.data,'exact restoration')
 assert.deepEqual(errors,[])
 const metrics={sampleCount:samples.length,maxParticleStepPx:maxStep,maxSampleGapMs:maxFrameGap,maxStepPer60HzFrame:maxNormalizedStep,entrance:differences(rest,entrance),stableSlots:true,restorationExact:true,errors}
 await writeFile(`${output}/visual-motion.json`,JSON.stringify(metrics,null,2))
 const video=page.video();await context.close();await video.saveAs(`${output}/motion.webm`)
 console.log(JSON.stringify(metrics,null,2))
} finally {await browser.close()}
