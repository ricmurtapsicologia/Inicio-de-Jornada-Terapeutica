(()=>{
'use strict';
const VERSION='2.3.0-unified-hero-identity';
const CONFIG='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-public-experience-v2.json';
const ADAPTER_CONFIG='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-adapters-v2.json';
const REPOS={
  'Rastreioclinico':'geral','rastreioTDAH':'tdah','tab-bateria-integrada':'bipolar',
  'Inventario-de-Tracos-Borderline':'borderline','bateria.narcisismo':'narcisismo',
  'Rastreio-de-Impulsividade':'impulsividade','rastreio.de.esquemas':'esquemas',
  'rastreiomodosesquematicos':'modos','Escala-de-Necessidades-Emocionais':'necessidades',
  'Escala-de-Co-Depenpencia-Emocional':'codependencia','ICAPS':'icaps','TriagemRiscoSuicidio':'risco'
};
const BLOCK_ACTION=/corrigir|calcular|resultado|relat[oó]rio|processar|concluir|finalizar|enviar|submit|download|baixar/i;
const TECH_LABEL=/\b(?:TDAH|TAB|bipolar|borderline|narcis|suic[ií]d|transtorno|RAC-?5TR|EIR-|ICAPS|SMI\s*1\.1|NPI-?16|BIS-?11|MDQ|HCL-?32|BSDS)\b/i;
const WHATS=/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i;
let instrumentId='';
let cfg=null;
let adapter=null;
let identityState={};
let identityObserver=null;
const originalOpen=window.open.bind(window);
window.open=function(url,...args){if(WHATS.test(String(url||''))){console.warn('Canal WhatsApp desabilitado para rastreios clínicos.');return null}return originalOpen(url,...args)};
function idFromLocation(){const seg=location.pathname.split('/').filter(Boolean)[0]||'';if(seg==='Inicio-de-Jornada-Terapeutica')return new URLSearchParams(location.search).get('instrument')||'';return REPOS[seg]||''}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function today(){const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function removeSplash(){document.querySelectorAll('#splash,.splash,[class*="splash-screen" i],[id*="splash-screen" i]').forEach(n=>n.remove());document.querySelectorAll('#mainContent,main,.container').forEach(n=>{n.classList.add('show');n.hidden=false})}
function removeWhatsApp(){document.querySelectorAll('a[href*="wa.me"],a[href*="whatsapp" i],[id*="whats" i],[class*="whats" i]').forEach(n=>n.remove())}
const HERO_SCENES=Object.freeze({
  geral:{alt:'Visão ampla do momento emocional.',art:'<circle cx="350" cy="205" r="118"/><circle cx="350" cy="205" r="62"/><path d="M75 300 C190 105 510 105 625 300"/>'},
  tdah:{alt:'Atenção, organização e foco.',art:'<circle cx="350" cy="205" r="48"/><path d="M90 90 L350 205 M130 300 L350 205 M260 70 L350 205 M575 105 L350 205 M590 300 L350 205"/>'},
  bipolar:{alt:'Oscilações de humor, energia e ritmo.',art:'<path d="M55 150 C125 55 195 55 265 150 S405 245 475 150 S585 55 645 150"/><path d="M55 285 C125 220 195 220 265 285 S405 350 475 285 S585 220 645 285"/>'},
  borderline:{alt:'Emoções, identidade e relações.',art:'<ellipse cx="285" cy="205" rx="135" ry="155"/><ellipse cx="430" cy="205" rx="135" ry="155"/><path d="M357 50 C325 150 325 260 357 360"/>'},
  narcisismo:{alt:'Autoimagem, reconhecimento e reflexo.',art:'<path d="M155 78 Q292 108 325 205 Q292 302 155 332"/><path d="M545 78 Q408 108 375 205 Q408 302 545 332"/><path d="M350 48 L350 362"/>'},
  impulsividade:{alt:'Decisão, planejamento e controle de impulsos.',art:'<path d="M80 300 L250 120 L310 208 L420 85 L402 220 L620 145"/><path d="M85 338 L270 250 L360 305 L600 255"/>'},
  esquemas:{alt:'Padrões emocionais em camadas.',art:'<path d="M95 305 C205 222 490 222 605 305"/><path d="M125 250 C230 178 465 178 575 250"/><path d="M165 195 C265 138 425 138 535 195"/>'},
  modos:{alt:'Diferentes estados emocionais e modos de enfrentamento.',art:'<path d="M130 292 L205 105 L350 62 L505 118 L580 300 L410 350 L240 340 Z"/><path d="M205 105 L350 215 L505 118 M130 292 L350 215 L580 300 M240 340 L350 215 L410 350"/>'},
  necessidades:{alt:'Necessidades emocionais, raízes e sustentação.',art:'<path d="M350 62 L350 205"/><path d="M350 205 C290 245 248 290 210 352 M350 205 C320 270 320 315 315 360 M350 205 C410 245 455 295 492 350"/><path d="M350 205 C280 170 230 140 170 112 M350 205 C422 168 475 138 542 110"/>'},
  codependencia:{alt:'Autonomia, limites e cuidado nas relações.',art:'<ellipse cx="258" cy="210" rx="112" ry="145"/><ellipse cx="458" cy="210" rx="112" ry="145"/><path d="M315 212 C350 193 367 193 400 212"/>'},
  icaps:{alt:'Clareza para decisões importantes no relacionamento.',art:'<path d="M115 344 C130 240 210 130 330 78"/><path d="M585 344 C570 240 490 130 370 78"/><path d="M350 65 L350 345"/>'},
  risco:{alt:'Segurança emocional e proteção no momento atual.',art:'<path d="M350 88 L290 330 L410 330 Z"/><path d="M350 115 L350 300"/><path d="M350 95 L180 55 M350 95 L520 55"/>'},
  humor:{alt:'Acompanhamento do humor ao longo do tempo.',art:'<path d="M60 260 C155 232 245 286 340 260 S535 232 640 260"/><path d="M60 185 C155 157 245 211 340 185 S535 157 640 185"/><circle cx="500" cy="105" r="48"/>'},
  ansiedade:{alt:'Sinais de ansiedade e tensão.',art:'<path d="M80 118 C160 58 220 330 300 270 S440 70 620 135"/><path d="M80 285 C160 345 225 82 305 145 S445 332 620 270"/><path d="M350 52 L350 358"/>'},
  autoestima:{alt:'Autopercepção, forma e reflexo.',art:'<path d="M210 85 C126 144 132 292 230 338 C315 377 405 320 414 228 C422 144 341 74 260 96"/><path d="M490 118 C561 170 555 279 482 323 C423 358 365 327 344 278"/><path d="M350 65 L350 350"/>'}
});
function heroForInstrument(id){
  const scene=HERO_SCENES[id]||HERO_SCENES.geral;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 410"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f2f3f3"/><stop offset="1" stop-color="#d7dcdd"/></linearGradient><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2"/><feComponentTransfer><feFuncA type="table" tableValues="0 .05"/></feComponentTransfer></filter></defs><rect width="700" height="410" fill="url(#g)"/><rect width="700" height="410" filter="url(#n)" opacity=".6"/><g fill="none" stroke="#3d4346" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".78">${scene.art}</g><path d="M350 46 L350 364" fill="none" stroke="#8b6d4b" stroke-width="2.5" opacity=".75"/></svg>`;
  return {src:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),alt:scene.alt};
}
function hideLegacyPresentation(){
  ['header.hero','.banner-wrap','section.intro','.instrument-hero'].forEach(sel=>document.querySelectorAll(sel).forEach(n=>{if(!n.closest('.rm-screening-shell'))n.hidden=true}));
  document.querySelectorAll('h1,h2,.technical-label,.instrument-name').forEach(h=>{
    if(!h.closest('.rm-screening-shell')&&!h.closest('form')&&TECH_LABEL.test(h.textContent||'')){h.hidden=true;h.setAttribute('aria-hidden','true')}
  });
}
function shellMarkup(c,hero){const steps=(c.onboarding||[]).slice(0,3);return `<section class="rm-screening-shell" aria-labelledby="rm-screening-title"><div class="rm-screening-hero" data-rm-variant="${esc(instrumentId)}"><div class="rm-screening-copy"><p class="rm-eyebrow">${esc(c.eyebrow||'Rastreio clínico')}</p><h1 id="rm-screening-title">${esc(c.publicName)}</h1><p class="rm-story">${esc(c.story||'')}</p></div><div class="rm-screening-visual" ${hero?'':'aria-hidden="true"'}>${hero?`<img src="${esc(hero.src)}" alt="${esc(hero.alt||'Imagem de apoio ao rastreio clínico')}">`:''}</div></div><div class="rm-screening-body"><div class="rm-screening-intro"><div><h2>Antes de começar</h2><p>${esc(c.intro||'')}</p><div class="rm-clinical-note">Não existem respostas certas ou erradas. Responda pela sua experiência real. Este rastreio organiza informações para análise clínica e não estabelece diagnóstico isoladamente.</div></div><aside class="rm-onboarding" aria-label="Como responder"><h2>Como responder</h2><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></aside></div></div></section>`}
function insertShell(c){if(document.querySelector('.rm-screening-shell'))return;const hero=heroForInstrument(instrumentId);const wrap=document.createElement('div');wrap.innerHTML=shellMarkup(c,hero);const node=wrap.firstElementChild;const target=document.querySelector('main,.container,.wrap,.wrapper,.page')||document.body.firstElementChild;document.body.insertBefore(node,target||null)}
function first(selector){if(!selector)return null;try{return document.querySelector(selector)}catch{return null}}
function resolveTarget(){if(!adapter)return null;if(adapter.mode==='form')return first(adapter.formSelector);if(adapter.mode==='legacyContainer')return first(adapter.containerSelector);return null}
function resolveIdentityMount(){
  const target=resolveTarget();
  if(!target)return null;
  if(adapter.mode==='form')return {host:target,before:target.firstChild,form:target};
  const anchor=first(adapter.identityAnchorSelector)||first(adapter.identity?.name);
  let block=null;
  if(anchor&&adapter.identityBlockSelector){try{block=anchor.closest(adapter.identityBlockSelector)}catch{block=null}}
  if(block?.parentElement)return {host:block.parentElement,before:block,form:null};
  return {host:target,before:target.firstChild,form:null};
}
function setSource(source,value){if(!source)return;source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}))}
function legacyIdentityKind(el){
  if(!el||el.closest('.rm-identity'))return '';
  const label=el.id?document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent||'':'';
  const text=[label,el.getAttribute('aria-label'),el.getAttribute('placeholder'),el.name,el.id,el.closest('label')?.textContent].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/nome\s+completo|full\s*name|patient\s*name|paciente/.test(text))return 'name';
  if(/data\s+de\s+nascimento|birth\s*date|nascimento/.test(text))return 'birth';
  if(/data\s+de\s+aplicacao|application\s*date|response\s*date/.test(text))return 'application';
  if(/(^|\b)idade(\b|$)|(^|\b)age(\b|$)/.test(text))return 'age';
  return '';
}
function legacyFieldBox(source){return source?.closest('.field,.form-group,.input-group,.input-field,.form-field,.patient-info>*,.idgrid>*,.form-row>*,.identity-grid>*,label')||source||null}
function hideDuplicateSource(source){if(!source||source.closest('.rm-identity'))return;const box=legacyFieldBox(source);if(box){box.dataset.rmLegacyIdentity='hidden';box.hidden=true;box.style.setProperty('display','none','important');box.setAttribute('aria-hidden','true')}}
function ageFromBirth(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';const b=new Date(value+'T12:00:00');if(Number.isNaN(b.getTime()))return '';const now=new Date();let age=now.getFullYear()-b.getFullYear();const m=now.getMonth()-b.getMonth();if(m<0||(m===0&&now.getDate()<b.getDate()))age--;return age>=0&&age<130?String(age):''}
function cleanupLegacyIdentity(birthValue=''){
  const target=resolveTarget()||document;
  [...target.querySelectorAll('input,select,textarea')].filter(el=>!el.closest('.rm-identity')).forEach(el=>{const kind=legacyIdentityKind(el);if(!kind)return;if(kind==='age'&&birthValue)setSource(el,ageFromBirth(birthValue));hideDuplicateSource(el)});
  [...target.querySelectorAll('h1,h2,h3,h4,legend')].forEach(h=>{if(h.closest('.rm-identity')||!/^\s*identifica[cç][aã]o\s*$/i.test(h.textContent||''))return;const block=h.closest('section,fieldset,.card,.panel,.form-section,.patient-info,.identity-section')||h.parentElement;if(!block||block.closest('.rm-identity'))return;const controls=[...block.querySelectorAll('input,select,textarea')];if(controls.length&&controls.every(el=>Boolean(legacyIdentityKind(el)))){block.dataset.rmLegacyIdentity='hidden';block.hidden=true;block.style.setProperty('display','none','important');block.setAttribute('aria-hidden','true')}else if(!controls.length){h.hidden=true;h.style.setProperty('display','none','important')}});
}
function ensureHidden(form,name,value){if(!form)return;let h=form.querySelector(`input[type="hidden"][name="${name}"]`);if(!h){h=document.createElement('input');h.type='hidden';h.name=name;form.appendChild(h)}h.value=value}
function injectIdentity(){
  if(document.querySelector('.rm-identity'))return true;
  const mount=resolveIdentityMount();
  if(!mount)return false;
  const a=adapter.identity||{};
  const monitoring=adapter.identityProfile==='monitoring_longitudinal';
  const nameSource=first(a.name),appSource=first(a.application),birthSource=first(a.birth);
  const showBirth=true;
  const showApplication=true;
  const sec=document.createElement('section');sec.className='rm-identity';
  const fields=[`<label class="rm-field"><span>Nome completo</span><input data-rm="name" type="text" autocomplete="name" maxlength="120" required></label>`];
  if(showBirth)fields.push(`<label class="rm-field"><span>Data de nascimento</span><input data-rm="birth" type="date" required></label>`);
  if(showApplication)fields.push(`<label class="rm-field"><span>Data de aplicação do rastreio</span><input data-rm="application" type="date" required></label>`);
  sec.innerHTML=`<h2>Identificação</h2><div class="rm-identity-grid">${fields.join('')}</div>`;
  mount.host.insertBefore(sec,mount.before||null);
  const n=sec.querySelector('[data-rm="name"]'),b=sec.querySelector('[data-rm="birth"]'),d=sec.querySelector('[data-rm="application"]');
  n.value=nameSource?.value||'';
  if(b)b.value=birthSource?.value||'';
  if(d)d.value=appSource?.value||today();
  const sync=()=>{
    identityState={name:n.value.trim(),birthDate:b?.value||'',applicationDate:d?.value||'',profile:adapter.identityProfile||'screening_canonical'};
    setSource(nameSource,n.value);if(b)setSource(birthSource,b.value);if(d)setSource(appSource,d.value);cleanupLegacyIdentity(b?.value||'');
    if(mount.form){ensureHidden(mount.form,'rm_full_name',n.value);ensureHidden(mount.form,'rm_birth_date',b?.value||'');ensureHidden(mount.form,'rm_application_date',d?.value||'')}
  };
  [n,b,d].filter(Boolean).forEach(x=>x.addEventListener('input',sync));sync();
  hideDuplicateSource(nameSource);if(b)hideDuplicateSource(birthSource);if(d)hideDuplicateSource(appSource);cleanupLegacyIdentity(b?.value||'');
  if(mount.form){mount.form.addEventListener('submit',e=>{const missing=!n.value.trim()||(b&&!b.value)||(d&&!d.value);if(missing){e.preventDefault();e.stopImmediatePropagation();sec.scrollIntoView({behavior:'smooth',block:'center'});(!n.value.trim()?n:(b&&!b.value?b:d))?.focus()}else sync()},true)}
  return true;
}
function mountIdentityWhenReady(){
  if(injectIdentity())return;
  identityObserver?.disconnect();
  identityObserver=new MutationObserver(()=>{if(injectIdentity()){identityObserver.disconnect();identityObserver=null}});
  identityObserver.observe(document.body,{childList:true,subtree:true});
  window.setTimeout(()=>{identityObserver?.disconnect();identityObserver=null},15000);
}
function hideLegacyResults(){document.body.classList.add('rm-hide-legacy-results');['#results','#resultsSection','#resultsPanel','.results-panel','.results','#reportBox','#report','.out[id*="out"]','.gauge-container','#actionsSection','.result-actions','.result-section'].forEach(sel=>document.querySelectorAll(sel).forEach(n=>{if(!n.closest('.rm-completion')){n.hidden=true;n.style.setProperty('display','none','important');n.setAttribute('aria-hidden','true')}}))}
function showHold(){let box=document.querySelector('.rm-unavailable');if(!box){box=document.createElement('section');box.className='rm-unavailable';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.innerHTML='<h2>Envio temporariamente indisponível</h2><p>Este rastreio está passando por validação clínica e técnica antes da liberação do envio. Suas respostas não foram encaminhadas.</p>';const target=resolveTarget();(target?.parentElement||target||document.body).appendChild(box)}box.scrollIntoView({behavior:'smooth',block:'center'})}
function blockUnvalidatedActions(){
  if(cfg?.productionReady===true&&adapter?.submissionSupported!==false)return;
  document.addEventListener('submit',e=>{e.preventDefault();e.stopImmediatePropagation();showHold()},true);
  document.addEventListener('click',e=>{const btn=e.target.closest('button,a,input[type="button"],input[type="submit"]');if(!btn)return;const type=String(btn.getAttribute('type')||'').toLowerCase();const text=[btn.textContent,btn.value,btn.id,btn.className].join(' ');if(type==='submit'||BLOCK_ACTION.test(text)){e.preventDefault();e.stopImmediatePropagation();showHold()}},true);
}
function completion(){let box=document.querySelector('.rm-completion');if(!box){box=document.createElement('section');box.className='rm-completion';box.hidden=true;box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.innerHTML='<h2>Rastreio concluído com sucesso.</h2><p>Suas respostas foram registradas e encaminhadas para análise clínica do psicólogo responsável.</p>';document.body.appendChild(box)}return box}
function confirmDelivery(detail={}){if(cfg?.productionReady!==true||adapter?.submissionSupported===false)return;const box=completion();box.hidden=false;const target=resolveTarget();if(adapter?.mode==='form'&&target)target.hidden=true;hideLegacyResults();box.scrollIntoView({behavior:'smooth',block:'start'});window.dispatchEvent(new CustomEvent('rm:screening-completed',{detail:{instrumentId,...detail}}))}
function installApi(){window.RMScreeningUI={confirmDelivery,getIdentity:()=>({...identityState}),instrumentId,version:VERSION}}
function drainPending(){const q=Array.isArray(window.__RM_PENDING_DELIVERY)?window.__RM_PENDING_DELIVERY.splice(0):[];q.forEach(detail=>confirmDelivery(detail||{}))}
async function init(){
  instrumentId=idFromLocation();if(!instrumentId)return;
  document.body.classList.add('rm-screening-v2');removeSplash();removeWhatsApp();hideLegacyResults();
  const [rConfig,rAdapters]=await Promise.all([fetch(CONFIG,{cache:'no-store'}),fetch(ADAPTER_CONFIG,{cache:'no-store'})]);
  if(!rConfig.ok)throw new Error(`PUBLIC_EXPERIENCE_V2_${rConfig.status}`);
  if(!rAdapters.ok)throw new Error(`SCREENING_ADAPTERS_V2_${rAdapters.status}`);
  const [root,adapterRoot]=await Promise.all([rConfig.json(),rAdapters.json()]);
  cfg=root.instruments?.[instrumentId];adapter=adapterRoot.instruments?.[instrumentId];
  if(!cfg)throw new Error('INSTRUMENT_CONFIG_MISSING');
  if(!adapter)throw new Error('INSTRUMENT_ADAPTER_MISSING');
  document.title=cfg.publicName;insertShell(cfg);hideLegacyPresentation();mountIdentityWhenReady();removeWhatsApp();blockUnvalidatedActions();completion();installApi();drainPending();
  new MutationObserver(()=>{removeWhatsApp();hideLegacyResults();cleanupLegacyIdentity(identityState.birthDate||'')}).observe(document.body,{childList:true,subtree:true});
}
window.addEventListener('rm:screening-delivery-confirmed',e=>confirmDelivery(e.detail||{}));
installApi();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(fail),{once:true});else init().catch(fail);
function fail(error){console.error(error);document.body?.classList.add('rm-screening-v2');removeSplash();removeWhatsApp();const box=document.createElement('section');box.className='rm-unavailable';box.innerHTML='<h2>Não foi possível carregar o rastreio com segurança.</h2><p>Recarregue a página. Nenhuma resposta foi enviada.</p>';document.body?.prepend(box)}
})();
