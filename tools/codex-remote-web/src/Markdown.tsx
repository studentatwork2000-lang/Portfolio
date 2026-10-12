import {memo,useEffect,useRef} from 'react';
import {marked} from 'marked';
import DOMPurify from 'dompurify';
import {Icon} from './icons';
marked.setOptions({gfm:true,breaks:false});
DOMPurify.addHook('afterSanitizeAttributes',node=>{
  if(node.tagName==='A') {node.setAttribute('rel','noopener noreferrer');node.setAttribute('target','_blank');}
});
export const Markdown=memo(function Markdown({text,streaming=false}:{text:string;streaming?:boolean}) {
  const ref=useRef<HTMLDivElement>(null);
  const html=DOMPurify.sanitize(marked.parse(text,{async:false}) as string,{FORBID_TAGS:['img','iframe','style','input','form','video','audio'],FORBID_ATTR:['style']});
  useEffect(()=>{
    const root=ref.current;if(!root)return;
    for(const pre of root.querySelectorAll('pre')) {
      const code=pre.querySelector('code');if(!code)continue;
      pre.querySelector('.code-bar')?.remove();
      const language=code.className.replace('language-','') || 'text';
      const bar=document.createElement('div');bar.className='code-bar';
      const label=document.createElement('span');label.textContent=language;
      const button=document.createElement('button');button.type='button';button.textContent='Copy code';button.setAttribute('aria-label','Copy code');
      button.onclick=()=>{void navigator.clipboard.writeText(code.textContent || '').then(()=>{button.textContent='Copied';}).catch(()=>{button.textContent='Copy unavailable';});};
      bar.append(label,button);pre.prepend(bar);
    }
    if(streaming)return;
    let cancelled=false;
    if(root.querySelector('pre code[class*="language-"]')) void import('./highlight').then(({highlight})=>{if(!cancelled)highlight(root);});
    return()=>{cancelled=true;};
  },[html,streaming]);
  return <div ref={ref} className="markdown" dangerouslySetInnerHTML={{__html:html}}/>;
});
export function Copy({text}:{text:string}) {return <button className="icon-button message-copy" aria-label="Copy message" title="Copy message" onClick={e=>{const b=e.currentTarget;void navigator.clipboard.writeText(text).then(()=>{b.dataset.copied='true';setTimeout(()=>delete b.dataset.copied,1500);}).catch(()=>{b.title='Copy unavailable in this browser context';});}}><Icon name="copy" size={16}/></button>;}
