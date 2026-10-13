const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/home/codespace/.npm/_npx/420ff84f11983ee5/node_modules/playwright/index.mjs')
export const launch = () => chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/home/codespace/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',args:['--no-sandbox']})
export async function makePage(browser,viewport,options={}){
  const context=await browser.newContext({viewport,...options})
  const page=await context.newPage()
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&!m.location().url.endsWith('/favicon.ico'))errors.push(`${m.text()} (${m.location().url})`)})
  await page.addInitScript(()=>{
    window.workQA={draws:0,arcs:[],times:[],stacks:[],durations:[],duration:0,allocations:0,frames:new Set(),listeners:[],observers:[]}
    const q=window.workQA
    const raf=window.requestAnimationFrame,cancel=window.cancelAnimationFrame
    window.requestAnimationFrame=function(fn){
      if(fn.name!=='animate'||!fn.toString().includes('movingStars'))return raf.call(window,fn)
      let id=raf.call(window,time=>{q.frames.delete(id);fn(time)})
      q.frames.add(id);return id
    }
    window.cancelAnimationFrame=function(id){q.frames.delete(id);return cancel.call(window,id)}
    const fillRect=CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.fillRect=function(...args){
      if(this.canvas.closest('#work')){q.draws++;q.stacks.push({time:performance.now(),stack:new Error().stack.split('\n').slice(1,5),bounds:this.canvas.parentElement.getBoundingClientRect().toJSON()});q.arcs=[];q.times.push(performance.now());q.duration=0}
      return fillRect.apply(this,args)
    }
    const arc=CanvasRenderingContext2D.prototype.arc
    CanvasRenderingContext2D.prototype.arc=function(x,y,r,...args){
      if(this.canvas.closest('#work'))q.arcs.push({x,y,r,alpha:this.globalAlpha,color:this.fillStyle})
      return arc.call(this,x,y,r,...args)
    }
    const fill=CanvasRenderingContext2D.prototype.fill
    CanvasRenderingContext2D.prototype.fill=function(...args){
      const result=fill.apply(this,args)
      if(this.canvas.closest('#work')){q.duration=Math.max(q.duration,performance.now()-q.times.at(-1));q.durations[q.times.length-1]=q.duration}
      return result
    }
    for(const name of ['width','height']){
      const descriptor=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,name)
      Object.defineProperty(HTMLCanvasElement.prototype,name,{...descriptor,set(value){
        if(this.closest('#work'))q.allocations++
        descriptor.set.call(this,value)
      }})
    }
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener
    EventTarget.prototype.addEventListener=function(type,fn,options){
      if(['onPointerMove','releasePointer','resize','syncVisibility','syncInput'].includes(fn?.name) && ['canInteract','pointer.active','movingStars','resetStars'].some(token=>fn.toString().includes(token)))q.listeners.push({target:this,type,fn})
      return add.call(this,type,fn,options)
    }
    EventTarget.prototype.removeEventListener=function(type,fn,options){
      q.listeners=q.listeners.filter(l=>!(l.target===this&&l.type===type&&l.fn===fn))
      return remove.call(this,type,fn,options)
    }
    for(const name of ['ResizeObserver','IntersectionObserver']){
      const Native=window[name]
      window[name]=class extends Native {
        constructor(callback){super(callback);this.qaActive=false;q.observers.push(this)}
        observe(target,...args){if(target.id==='work')this.qaActive=true;return super.observe(target,...args)}
        unobserve(target){if(target.id==='work')this.qaActive=false;return super.unobserve(target)}
        disconnect(){this.qaActive=false;return super.disconnect()}
      }
    }
  })
  await page.goto(process.env.QA_URL || 'http://127.0.0.1:5173',{waitUntil:'networkidle'})
  await page.evaluate(()=>document.fonts.ready)
  return {context,page,errors}
}
export async function enterWork(page){
  await page.mouse.move(-20,-20)
  await page.evaluate(()=>document.querySelector('#work').scrollIntoView({behavior:'instant'}))
  await page.waitForTimeout(250)
  await page.waitForFunction(()=>{
    const work=document.querySelector('#work'),canvas=work.querySelector('canvas'),r=work.getBoundingClientRect()
    const scale=Math.min(devicePixelRatio,1.5,Math.sqrt(3_000_000/(r.width*r.height)))
    return window.workQA.frames.size===0 && performance.now()-window.workQA.times.at(-1)>180
      && r.width===innerWidth && r.height===innerHeight
      && canvas.width===Math.round(r.width*scale) && canvas.height===Math.round(r.height*scale)
  })
}
export async function snapshot(page){return page.evaluate(()=>({
  draws:window.workQA.draws,
  stars:window.workQA.arcs.filter((_,i)=>i%2===1),
  times:window.workQA.times.slice(),durations:window.workQA.durations.slice(),duration:window.workQA.duration,allocations:window.workQA.allocations,
  data:document.querySelector('#work canvas').toDataURL(),
}))}
export function differences(a,b){
  let moved=0,maxDisplacement=0,maxRadiusGrowth=0,maxAlphaGrowth=0
  a.stars.forEach((s,i)=>{const t=b.stars[i],d=Math.hypot(t.x-s.x,t.y-s.y);if(d>.02)moved++;maxDisplacement=Math.max(maxDisplacement,d);maxRadiusGrowth=Math.max(maxRadiusGrowth,t.r/s.r-1);maxAlphaGrowth=Math.max(maxAlphaGrowth,t.alpha-s.alpha)})
  return {moved,maxDisplacement,maxRadiusGrowth,maxAlphaGrowth,pixelsEqual:a.data===b.data}
}
