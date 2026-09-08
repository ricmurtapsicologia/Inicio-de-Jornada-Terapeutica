from pathlib import Path

js_path=Path('assets/screening-system-v2.js')
js=js_path.read_text(encoding='utf-8')
js=js.replace("const VERSION='2.2.1-decoupled';","const VERSION='2.3.0-unified-hero-identity';")

old="function discoverHero(){const candidates=['.hero img','.hero-img','img.banner','.banner-wrap img','header img','main img'];for(const sel of candidates){const el=document.querySelector(sel);if(el?.src&&el.naturalWidth!==1)return {src:el.src,alt:el.alt||''}}return null}\n"
hero=r'''const HERO_SCENES=Object.freeze({
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
'''
if old not in js:
    raise SystemExit('discoverHero anchor missing')
js=js.replace(old,hero,1)
js=js.replace("function insertShell(c){if(document.querySelector('.rm-screening-shell'))return;const hero=discoverHero();","function insertShell(c){if(document.querySelector('.rm-screening-shell'))return;const hero=heroForInstrument(instrumentId);",1)

old_identity="  const monitoring=adapter.identityProfile==='monitoring_longitudinal';\n  const nameSource=first(a.name),appSource=first(a.application),birthSource=first(a.birth);\n  const showBirth=!monitoring;\n  const showApplication=!monitoring||Boolean(appSource);"
new_identity="  const monitoring=adapter.identityProfile==='monitoring_longitudinal';\n  const nameSource=first(a.name),appSource=first(a.application),birthSource=first(a.birth);\n  const showBirth=true;\n  const showApplication=true;"
if old_identity not in js:
    raise SystemExit('identity profile anchor missing')
js=js.replace(old_identity,new_identity,1)

old_hide="function hideDuplicateSource(source){if(!source)return;const box=source.closest('.field,label,.form-group,.patient-info>*,.idgrid>*');if(box&&!box.closest('.rm-identity'))box.style.display='none'}"
new_hide=r'''function legacyIdentityKind(el){
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
}'''
if old_hide not in js:
    raise SystemExit('hide duplicate anchor missing')
js=js.replace(old_hide,new_hide,1)

js=js.replace("    setSource(nameSource,n.value);if(b)setSource(birthSource,b.value);if(d)setSource(appSource,d.value);\n    if(!monitoring&&mount.form){ensureHidden(mount.form,'rm_full_name',n.value);ensureHidden(mount.form,'rm_birth_date',b?.value||'');ensureHidden(mount.form,'rm_application_date',d?.value||'')}","    setSource(nameSource,n.value);if(b)setSource(birthSource,b.value);if(d)setSource(appSource,d.value);cleanupLegacyIdentity(b?.value||'');\n    if(mount.form){ensureHidden(mount.form,'rm_full_name',n.value);ensureHidden(mount.form,'rm_birth_date',b?.value||'');ensureHidden(mount.form,'rm_application_date',d?.value||'')}",1)
js=js.replace("  hideDuplicateSource(nameSource);if(b)hideDuplicateSource(birthSource);if(d)hideDuplicateSource(appSource);","  hideDuplicateSource(nameSource);if(b)hideDuplicateSource(birthSource);if(d)hideDuplicateSource(appSource);cleanupLegacyIdentity(b?.value||'');",1)
js=js.replace("  new MutationObserver(()=>{removeWhatsApp();hideLegacyResults()}).observe(document.body,{childList:true,subtree:true});","  new MutationObserver(()=>{removeWhatsApp();hideLegacyResults();cleanupLegacyIdentity(identityState.birthDate||'')}).observe(document.body,{childList:true,subtree:true});",1)
js_path.write_text(js,encoding='utf-8')

css_path=Path('assets/screening-system-v2.css')
css=css_path.read_text(encoding='utf-8')
css=css.replace('.rm-screening-hero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(280px,.85fr);min-height:330px;','.rm-screening-hero{display:grid;grid-template-columns:minmax(0,1.13fr) minmax(300px,.87fr);min-height:360px;',1)
css=css.replace('.rm-screening-visual img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.82) contrast(.98)}','.rm-screening-visual img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(1) contrast(1.03)}',1)
css+='\n/* v2.3 — um banner e uma identificação visível por rastreio. */\n[data-rm-legacy-identity="hidden"]{display:none!important;visibility:hidden!important}\n.rm-identity{margin-top:28px}\n@media(max-width:800px){.rm-screening-hero{min-height:0}.rm-screening-visual{min-height:240px}}\n'
css_path.write_text(css,encoding='utf-8')

loader=Path('assets/screening-uniformity-v1.js')
s=loader.read_text(encoding='utf-8').replace('screening-system-v2.js?v=2.2.1-decoupled','screening-system-v2.js?v=2.3.0').replace("version:'2.2.1-decoupled-loading'","version:'2.3.0-loading'")
loader.write_text(s,encoding='utf-8')
imp=Path('assets/screening-uniformity-v1.css')
s=imp.read_text(encoding='utf-8').replace('screening-system-v2.css?v=2.2.1','screening-system-v2.css?v=2.3.0')
imp.write_text(s,encoding='utf-8')
print('PATCH_OK')
