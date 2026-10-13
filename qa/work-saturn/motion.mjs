import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { launch,makePage,enterWork,snapshot,differences } from '../work-star-field/browser.mjs'
const output=`qa/work-saturn/pass-${process.env.QA_PASS||'1'}`
await mkdir(output,{recursive:true})
const browser=await launch(),{page,context,errors}=await makePage(browser,{width:1440,height:900})
await enterWork(page)
const rest=await snapshot(page)
await page.waitForTimeout(450)
assert.equal((await snapshot(page)).draws,rest.draws,'static field must stop drawing')
const target={x:1440*.29,y:900*.31}
await page.mouse.move(target.x,target.y)
await page.waitForFunction(()=>window.workQA.frames.size===0)
const cluster=await snapshot(page), attraction=differences(rest,cluster)
assert(attraction.moved>150&&attraction.maxDisplacement>150,'wide, strong gathering should be perceptible')
assert(attraction.maxDisplacement<670,'gathering displacement stays bounded')
assert(attraction.maxRadiusGrowth>0.3&&attraction.maxRadiusGrowth<=.42,'layered size increase')
assert(attraction.maxAlphaGrowth>0.25&&attraction.maxAlphaGrowth<=.34,'layered brightness increase')
const coreCount=s=>s.stars.filter(v=>Math.hypot(v.x-target.x,v.y-target.y)<85).length
assert(coreCount(cluster)>coreCount(rest)*5,'density should rise substantially around pointer')
const compactCount=s=>s.stars.filter(v=>Math.hypot(v.x-target.x,v.y-target.y)<45).length
assert(compactCount(cluster)>50,'many stars must re-pack into the compact core')
const farAttraction=rest.stars.reduce((count,s,i)=>{
  const distance=Math.hypot(s.x-target.x,s.y-target.y)
  const t=cluster.stars[i]
  return count+(distance>300&&Math.hypot(s.x-t.x,s.y-t.y)>1?1:0)
},0)
assert(farAttraction>40,'stars well outside the old radius must also flow inward')
await page.screenshot({path:`${output}/cluster-1440x900.png`})
await page.waitForTimeout(350)
assert.equal((await snapshot(page)).draws,cluster.draws,'stationary cursor must stop drawing')
assert.equal(cluster.allocations,rest.allocations,'no buffer allocation during animation')
const trailStart=await snapshot(page)
for(let i=0;i<30;i++){
  await page.mouse.move(target.x+i*14,target.y+Math.sin(i/5)*80)
  await page.waitForTimeout(17)
}
const trail=await snapshot(page)
await page.locator('#work').dispatchEvent('pointerleave',{pointerType:'mouse'})
await page.waitForTimeout(160)
const returning=await snapshot(page),partialReturn=differences(rest,returning)
assert(partialReturn.moved>0,'return should be gradual')
await page.waitForFunction(()=>window.workQA.frames.size===0)
const returned=await snapshot(page)
assert.deepEqual(returned.stars,rest.stars,'must return to exact immutable resting positions')
assert(returned.data===rest.data,'must restore identical static pixels')
await page.screenshot({path:`${output}/returned-1440x900.png`})
await page.waitForTimeout(350)
assert.equal((await snapshot(page)).draws,returned.draws,'must stop after return')
await page.mouse.move(target.x,target.y)
await page.waitForTimeout(200)
await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}))
await page.waitForTimeout(250)
const offscreen=await snapshot(page)
await page.waitForTimeout(500)
assert.equal((await snapshot(page)).draws,offscreen.draws,'must suspend outside viewport')
await enterWork(page)
assert((await snapshot(page)).data===rest.data,'re-entry should restore static field')
await page.mouse.move(target.x,target.y)
await page.waitForTimeout(180)
await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
const hidden=await snapshot(page)
await page.waitForTimeout(350)
assert.equal((await snapshot(page)).draws,hidden.draws,'hidden-tab state must suspend drawing')
await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))})
await page.waitForTimeout(220)
assert((await snapshot(page)).data===rest.data,'visibility restoration resets static field')
await page.mouse.move(target.x,target.y)
await page.waitForTimeout(250)
await page.emulateMedia({reducedMotion:'reduce'})
await page.waitForTimeout(200)
await enterWork(page)
const reduced=await snapshot(page)
assert(reduced.data===rest.data,'live reduced-motion change should reset static field on re-entry')
await page.mouse.move(target.x+100,target.y+20)
await page.waitForTimeout(450)
assert.equal((await snapshot(page)).draws,reduced.draws,'reduced motion must not animate')
const lifecycle=await page.evaluate(()=>({listeners:window.workQA.listeners.map(l=>({type:l.type,name:l.fn.name})),observers:window.workQA.observers.filter(o=>o.qaActive).length}))
assert.equal(lifecycle.listeners.filter(l=>l.name==='onPointerMove').length,1,'StrictMode must not duplicate listeners')
assert.equal(lifecycle.listeners.filter(l=>l.name==='syncInput').length,3,'exactly one listener per media query')
assert.equal(lifecycle.observers,2,'exactly one Work observer of each type')
await page.emulateMedia({reducedMotion:'no-preference'})
await enterWork(page)
const cleanup=await page.evaluate(async()=>{
  const reactModule=await import('/node_modules/.vite/deps/react.js');const React=reactModule.default||reactModule
  const domModule=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=domModule.default||domModule
  const {default:Work}=await import('/src/components/WorkStarField/WorkStarField.tsx')
  const original=document.querySelector('#work'); original.id='work-baseline'
  const startingListeners=window.workQA.listeners.length
  const startingObservers=window.workQA.observers.filter(o=>o.qaActive).length
  const cycles=[]
  for(let i=0;i<3;i++){
    const host=document.createElement('div');document.body.append(host)
    const root=createRoot(host)
    root.render(React.createElement(React.StrictMode,null,React.createElement(Work)))
    await new Promise(r=>setTimeout(r,100))
    const work=host.querySelector('#work')
    work.scrollIntoView({behavior:'instant'})
    await new Promise(r=>setTimeout(r,100))
    work.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:420,clientY:270}))
    await new Promise(r=>setTimeout(r,30))
    const pendingBefore=window.workQA.frames.size
    root.unmount();host.remove()
    await new Promise(r=>setTimeout(r,50))
    cycles.push({pendingBefore,pendingAfter:window.workQA.frames.size,listeners:window.workQA.listeners.length,observers:window.workQA.observers.filter(o=>o.qaActive).length})
  }
  original.id='work'
  return {startingListeners,startingObservers,cycles}
})
for(const cycle of cleanup.cycles){
  assert.equal(cycle.pendingAfter,0,'unmount must cancel its pending frame')
  assert.equal(cycle.listeners,cleanup.startingListeners,'unmount must remove every listener')
  assert.equal(cycle.observers,cleanup.startingObservers,'unmount must disconnect every observer')
}
const intervals=trail.times.slice(trailStart.times.length).slice(1).map((t,i,arr)=>t-trail.times[trailStart.times.length+i])
const percentile=(values,p)=>values.slice().sort((a,b)=>a-b)[Math.floor((values.length-1)*p)]
const durations=trail.durations.slice(trailStart.times.length)
const metrics={attraction,inner85px:{rest:coreCount(rest),cluster:coreCount(cluster)},inner45px:{rest:compactCount(rest),cluster:compactCount(cluster)},farAttraction,partialReturn,returnExact:returned.data===rest.data,bufferAllocationsDuringInteraction:cluster.allocations-rest.allocations,stationaryAndOffscreenIdle:true,simulatedHiddenTabIdle:true,reducedMotion:true,lifecycle,cleanup,drawDurationMs:{median:percentile(durations,.5),p95:percentile(durations,.95),max:Math.max(...durations)},movingFrameIntervalsMs:{median:percentile(intervals,.5),p95:percentile(intervals,.95),max:Math.max(...intervals)},errors}
assert.deepEqual(errors,[])
await writeFile(`${output}/interaction.json`,JSON.stringify(metrics,null,2))
console.log(JSON.stringify(metrics,null,2))
await context.close();await browser.close()
