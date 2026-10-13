import assert from 'node:assert/strict'
import { mkdir,readFile,writeFile } from 'node:fs/promises'
import { launch,makePage,enterWork,snapshot,differences } from '../work-star-field/browser.mjs'
const pass=process.env.QA_PASS || '1',root=`qa/work-saturn/pass-${pass}`
await mkdir(root,{recursive:true})
const browser=await launch(),results=[]
const baselines=JSON.parse(await readFile(new URL('./resting-baselines.json',import.meta.url),'utf8'))
const enter=async page=>{
 try {await enterWork(page)} catch(error) {
  console.log('entry timeout state',await page.evaluate(()=>{const c=document.querySelector('#work canvas');return {bounds:c.parentElement.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,canvasWidth:c.width,canvasHeight:c.height,frames:window.workQA.frames.size,lastDrawAge:performance.now()-window.workQA.times.at(-1),lastBounds:window.workQA.stacks.slice(-3).map(s=>s.bounds)}}))
  throw error
 }
}
const cases=[
  {width:1440,height:900},
  {width:1366,height:640},
  {width:1280,height:720},
  {width:390,height:844,touch:true,dpr:3},
  {width:360,height:800,touch:true,dpr:2},
  {width:320,height:568,touch:true,dpr:2},
  {width:768,height:800,touch:true,dpr:2},
  {width:844,height:390,touch:true,dpr:2},
  {width:1440,height:900,reduced:true},
  {width:2560,height:1440,dpr:2},
]
for(const item of cases.filter(item=>!process.env.QA_CASE||`${item.width}x${item.height}`===process.env.QA_CASE)){
  const {width,height,touch=false,dpr=1,reduced=false}=item
  const name=`${width}x${height}${touch?'-touch':''}${reduced?'-reduced':''}`
  const {page,context,errors}=await makePage(browser,{width,height},{hasTouch:touch,isMobile:touch&&width<900,deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference'})
  await enter(page)
  const rest=await snapshot(page)
  if(baselines[`${width}x${height}`])assert.deepEqual(rest.stars,baselines[`${width}x${height}`].stars,'original resting stars retained')
  const layout=await page.locator('#work').evaluate(el=>{
    const r=el.getBoundingClientRect(),next=el.nextElementSibling.getBoundingClientRect(),canvas=el.querySelector('canvas')
    return {top:r.top,height:r.height,width:r.width,background:getComputedStyle(el).backgroundColor,nextGap:next.top-r.bottom,children:el.childElementCount,text:el.textContent,controls:el.querySelectorAll('h1,h2,h3,a,button,nav').length,documentWidth:document.documentElement.scrollWidth,canvasPixels:canvas.width*canvas.height,canvasScale:canvas.width/r.width,finePointer:matchMedia('(hover: hover) and (pointer: fine)').matches,coarsePointer:matchMedia('(any-pointer: coarse)').matches}
  })
  assert.equal(layout.background,'rgb(3, 4, 5)')
  assert.equal(layout.height,height,'one viewport retained')
  assert.equal(layout.width,width)
  assert.equal(layout.nextGap,0,'normal-flow boundary retained')
  assert.equal(layout.controls,0,'no old Work content restored')
  assert.equal(layout.text,'')
  assert.equal(layout.children,1)
  assert.equal(layout.documentWidth,width,'no horizontal overflow')
  assert(layout.canvasScale<=1.501,'DPR is capped')
  assert(layout.canvasPixels<=3_005_000,'pixel allocation is capped')
  await page.screenshot({path:`${root}/static-${name}.png`})
  await page.waitForTimeout(280)
  if((await snapshot(page)).draws!==rest.draws)console.log('extra draw diagnostic',await page.evaluate(()=>window.workQA.stacks))
  assert.equal((await snapshot(page)).draws,rest.draws,'no autonomous draw loop')
  await page.mouse.move(width*.29,height*.31)
  if(touch)await page.locator('#work').dispatchEvent('pointermove',{pointerType:'touch',clientX:width*.29,clientY:height*.31})
  await page.waitForFunction(()=>window.workQA.frames.size===0)
  const reacted=await snapshot(page),reaction=differences(rest,reacted)
  if(touch||reduced){
    assert.equal(reacted.draws,rest.draws,'touch/reduced motion remains static')
    assert(reaction.pixelsEqual)
  }else{
    assert(reaction.moved>5&&reaction.maxDisplacement>10,'desktop responds')
    assert(reaction.maxDisplacement<670,'gathering remains bounded')
    await page.screenshot({path:`${root}/cluster-${name}.png`})
    await page.locator('#work').dispatchEvent('pointerleave',{pointerType:'mouse'})
    await page.waitForFunction(()=>window.workQA.frames.size===0)
    assert((await snapshot(page)).data===rest.data,'desktop returns to exact static field')
  }
  if(!touch&&!reduced){
    await page.setViewportSize({width:1024,height:700})
    await enter(page)
    await page.setViewportSize({width,height})
    await enter(page)
    const resized=await snapshot(page)
    if(resized.data!==rest.data){
      console.log('resize diagnostic',{before:rest.stars.length,after:resized.stars.length,beforeLayout:layout,delta:rest.stars.length===resized.stars.length?differences(rest,resized):null},await page.locator('#work canvas').evaluate(c=>({width:c.width,height:c.height,bounds:c.parentElement.getBoundingClientRect().toJSON(),dpr:devicePixelRatio})))
      const pixels=await page.evaluate(async([a,b])=>{
        const read=async url=>{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data}
        const x=await read(a),y=await read(b);let max=0,count=0;for(let i=0;i<x.length;i++){const diff=Math.abs(x[i]-y[i]);max=Math.max(max,diff);if(diff)count++}
        return {maxChannelDifference:max,changedChannels:count,totalChannels:x.length}
      },[rest.data,resized.data])
      console.log('resize pixels',pixels)
    }
    assert(resized.data===rest.data,'resize round trip retains seeded field')
  }
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}))
  await page.waitForTimeout(350)
  await page.getByRole('link',{name:'Work',exact:true}).click()
  await page.waitForTimeout(1600)
  const navigation=await page.locator('#work').evaluate(el=>({hash:location.hash,top:el.getBoundingClientRect().top}))
  assert.equal(navigation.hash,'#work')
  assert(Math.abs(navigation.top)<1,'existing Work navigation reaches field')
  const reentry=await snapshot(page)
  await page.mouse.move(1,1)
  await page.locator('#work').dispatchEvent('pointerleave',{pointerType:'mouse'})
  await page.waitForFunction(()=>window.workQA.frames.size===0)
  assert((await snapshot(page)).data===rest.data,'navigation restores original field')
  assert.deepEqual(errors,[],'no runtime errors beyond existing missing favicon')
  results.push({name,layout,stars:rest.stars.length,reaction,navigation,errors})
  await writeFile(`${root}/results.json`,JSON.stringify(results,null,2))
  console.log(`${name}: passed`)
  await context.close()
}
await writeFile(`${root}/results.json`,JSON.stringify(results,null,2))
await browser.close()
