import fs from 'node:fs';
import { chromium } from 'playwright';
const adapters=JSON.parse(fs.readFileSync('assets/screening-adapters-v2.json','utf8')).instruments;
const urls={
  geral:'https://ricmurtapsicologia.github.io/Rastreioclinico/',
  tdah:'https://ricmurtapsicologia.github.io/rastreioTDAH/',
  bipolar:'https://ricmurtapsicologia.github.io/tab-bateria-integrada/',
  borderline:'https://ricmurtapsicologia.github.io/Inventario-de-Tracos-Borderline/',
  narcisismo:'https://ricmurtapsicologia.github.io/bateria.narcisismo/',
  impulsividade:'https://ricmurtapsicologia.github.io/Rastreio-de-Impulsividade/',
  esquemas:'https://ricmurtapsicologia.github.io/rastreio.de.esquemas/',
  modos:'https://ricmurtapsicologia.github.io/rastreiomodosesquematicos/',
  necessidades:'https://ricmurtapsicologia.github.io/Escala-de-Necessidades-Emocionais/',
  codependencia:'https://ricmurtapsicologia.github.io/Escala-de-Co-Depenpencia-Emocional/',
  icaps:'https://ricmurtapsicologia.github.io/ICAPS/',
  risco:'https://ricmurtapsicologia.github.io/TriagemRiscoSuicidio/'
};
const browser=await chromium.launch({headless:true});
const summary=[];
for(const [id,url] of Object.entries(urls)){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const consoleErrors=[]; page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  await page.waitForTimeout(1200);
  const a=adapters[id];
  const result=await page.evaluate(({id,url,adapter})=>{
    const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
    const form=document.querySelector(adapter.formSelector);
    if(!form) return {id,url,error:'FORM_NOT_FOUND',selector:adapter.formSelector};
    const identitySelectors=Object.values(adapter.identity||{}).filter(Boolean);
    const isIdentity=el=>identitySelectors.some(sel=>{try{return el.matches(sel)}catch{return false}})||Boolean(el.closest('.rm-identity'));
    const controlList=[...form.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]),select,textarea')].filter(el=>!isIdentity(el)&&!el.disabled);
    const labelFor=el=>{
      if(el.id){const l=form.querySelector(`label[for="${CSS.escape(el.id)}"]`);if(l)return norm(l.textContent)}
      const l=el.closest('label'); return l?norm(l.textContent):'';
    };
    const titleFor=el=>{
      const fs=el.closest('fieldset'); const leg=fs?.querySelector(':scope > legend'); if(leg&&norm(leg.textContent))return norm(leg.textContent);
      const c=el.closest('.question,.question-card,.question-item,.pergunta,.item,.field,.form-group,.q,li,article,section')||el.parentElement;
      if(!c)return labelFor(el)||el.name||el.id;
      for(const sel of ['.question-text','.question-title','.prompt','.statement','.item-text','.enunciado','h3','h4','p']){
        const n=c.querySelector(sel); if(n&&norm(n.textContent))return norm(n.textContent);
      }
      const direct=[...c.querySelectorAll('label')].find(l=>!l.querySelector('input,select,textarea'));
      if(direct&&norm(direct.textContent))return norm(direct.textContent);
      return labelFor(el)||el.getAttribute('aria-label')||el.name||el.id;
    };
    const groups=new Map(); const singles=[];
    for(const el of controlList){
      const type=(el.getAttribute('type')||el.tagName).toLowerCase();
      if((type==='radio'||type==='checkbox')&&el.name){
        if(!groups.has(el.name))groups.set(el.name,[]); groups.get(el.name).push(el);
      } else singles.push(el);
    }
    const records=[];
    for(const [name,els] of groups){
      const first=els[0];
      const options=els.map(el=>({label:labelFor(el)||norm(el.value),value:String(el.value??'')}));
      records.push({node:first,title:titleFor(first),type:first.type==='checkbox'?'CHECKBOXES':'MULTIPLE_CHOICE',required:els.some(x=>x.required),options,name});
    }
    for(const el of singles){
      const tag=el.tagName.toLowerCase(); const inputType=(el.getAttribute('type')||'').toLowerCase();
      let type='TEXT',options=[];
      if(tag==='textarea')type='PARAGRAPH';
      else if(tag==='select'){type='DROPDOWN';options=[...el.options].filter(o=>norm(o.textContent)).map(o=>({label:norm(o.textContent),value:String(o.value??'')}));}
      else if(inputType==='date')type='DATE';
      else if(inputType==='range')type='SCALE';
      records.push({node:el,title:titleFor(el),type,required:Boolean(el.required),options,name:el.name||el.id||''});
    }
    records.sort((a,b)=>a.node===b.node?0:(a.node.compareDocumentPosition(b.node)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1));
    const questions=records.map((r,i)=>({order:i+1,title:norm(r.title),type:r.type,required:r.required,options:r.options,name:r.name})).filter(q=>q.title);
    return {id,url,selector:adapter.formSelector,identityProfile:adapter.identityProfile,questionCount:questions.length,questions};
  },{id,url,adapter:a});
  result.consoleErrors=consoleErrors.slice(0,10);
  fs.writeFileSync(`audits/mirror-specs/${id}.json`,JSON.stringify(result,null,2)+'\n');
  summary.push({id,url,questionCount:result.questionCount||0,error:result.error||null,consoleErrorCount:consoleErrors.length});
  await page.close();
}
await browser.close();
fs.writeFileSync('audits/mirror-specs/summary.json',JSON.stringify({capturedAt:new Date().toISOString(),instruments:summary},null,2)+'\n');
const bad=summary.filter(x=>x.error||x.questionCount<1);
if(bad.length){console.error(JSON.stringify(bad,null,2));process.exit(1)}
console.log(JSON.stringify(summary,null,2));
