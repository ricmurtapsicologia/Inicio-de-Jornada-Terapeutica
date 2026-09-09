(()=>{
'use strict';
const VERSION='3.1.2-specific-heroes';
const REPOS={
  'Rastreioclinico':'geral','rastreioTDAH':'tdah','tab-bateria-integrada':'bipolar',
  'Inventario-de-Tracos-Borderline':'borderline','bateria.narcisismo':'narcisismo',
  'Rastreio-de-Impulsividade':'impulsividade','rastreio.de.esquemas':'esquemas',
  'rastreiomodosesquematicos':'modos','Escala-de-Necessidades-Emocionais':'necessidades',
  'Escala-de-Co-Depenpencia-Emocional':'codependencia','ICAPS':'icaps','TriagemRiscoSuicidio':'risco'
};
const SHARED_BASE='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/heroes/';
const UNSPLASH_BASE='https://images.unsplash.com/';
const UNSPLASH_ARGS='?auto=format&fit=crop&w=1800&q=88';
const HEROES=Object.freeze({
  geral:{src:`${UNSPLASH_BASE}photo-1456324504439-367cee3b3c32${UNSPLASH_ARGS}`,alt:'Mesa de reflexão com caderno e organização de sinais do momento emocional.',credit:true},
  tdah:{src:`${UNSPLASH_BASE}photo-1455390582262-044cdead277a${UNSPLASH_ARGS}`,alt:'Organização de tarefas e rotina em mesa de trabalho.',credit:true},
  bipolar:{src:`${UNSPLASH_BASE}photo-1500534314209-a25ddb2bd429${UNSPLASH_ARGS}`,alt:'Acompanhamento de ritmo e variação ao longo do tempo.',credit:true},
  borderline:{src:SHARED_BASE+'borderline.webp',alt:'Composição terapêutica sobre identidade, intensidade emocional e padrões relacionais, com espelho segmentado e símbolos de vínculo.',credit:false},
  narcisismo:{src:`${UNSPLASH_BASE}photo-1517841905240-472988babdf9${UNSPLASH_ARGS}`,alt:'Reflexão sobre autoimagem e percepção de si.',credit:true},
  impulsividade:{src:`${UNSPLASH_BASE}photo-1506784983877-45594efa4cbe${UNSPLASH_ARGS}`,alt:'Planejamento, tempo de resposta e escolha.',credit:true},
  esquemas:{src:`${UNSPLASH_BASE}photo-1456324504439-367cee3b3c32${UNSPLASH_ARGS}`,alt:'Organização visual de padrões e temas centrais.',credit:true},
  modos:{src:`${UNSPLASH_BASE}photo-1484480974693-6ca0a78fb36b${UNSPLASH_ARGS}`,alt:'Organização de estados e respostas em um material de reflexão.',credit:true},
  necessidades:{src:`${UNSPLASH_BASE}photo-1494438639946-1ebd1d20bf85${UNSPLASH_ARGS}`,alt:'Ambiente de segurança, cuidado e organização de necessidades emocionais.',credit:true},
  rac5tr:{src:`${UNSPLASH_BASE}photo-1434030216411-0b793f4b4173${UNSPLASH_ARGS}`,alt:'Instrumento clínico estruturado para rastreio multidimensional.',credit:true},
  codependencia:{src:`${UNSPLASH_BASE}photo-1529156069898-49953e39b3ac${UNSPLASH_ARGS}`,alt:'Vínculos, limites e autonomia nas relações.',credit:true},
  icaps:{src:`${UNSPLASH_BASE}photo-1521737604893-d14cc237f11d${UNSPLASH_ARGS}`,alt:'Ponderação de decisões importantes.',credit:true},
  risco:{src:`${UNSPLASH_BASE}photo-1500534314209-a25ddb2bd429${UNSPLASH_ARGS}`,alt:'Proteção, continuidade e possibilidade de cuidado.',credit:true},
  humor:{src:`${UNSPLASH_BASE}photo-1500534314209-a25ddb2bd429${UNSPLASH_ARGS}`,alt:'Acompanhamento de humor e estado emocional.',credit:true},
  ansiedade:{src:`${UNSPLASH_BASE}photo-1499209974431-9dddcece7f88${UNSPLASH_ARGS}`,alt:'Pausa e observação de sinais de ansiedade.',credit:true},
  autoestima:{src:`${UNSPLASH_BASE}photo-1517841905240-472988babdf9${UNSPLASH_ARGS}`,alt:'Autopercepção e autoestima.',credit:true}
});
function instrument(){const seg=location.pathname.split('/').filter(Boolean)[0]||'';if(seg==='Inicio-de-Jornada-Terapeutica')return new URLSearchParams(location.search).get('instrument')||'geral';return REPOS[seg]||'geral'}
function resolveInstrument(){const id=instrument();if(id==='geral'&&/RAC-5TR|Rastreio Autoaplicável Clínico/i.test(document.body.innerText||''))return'rac5tr';return id}
function splash(){return document.getElementById('rmClinicalSplash')}
function heroFor(id){return HEROES[id]||HEROES.geral}
function updateSplashTitle(){const s=splash();if(!s)return;const h=document.querySelector('.rm-screening-shell h1');const t=s.querySelector('[data-rm-splash-instrument]');if(h&&t){t.textContent=h.textContent.trim();t.hidden=false}}
function closeSplash(){const s=splash();if(!s)return;const started=Number(window.__RM_CLINICAL_SPLASH_STARTED||Date.now());const wait=Math.max(0,3000-(Date.now()-started));window.setTimeout(()=>{s.classList.add('rm-splash-leaving');window.setTimeout(()=>s.remove(),380)},wait)}
function removeLegacyImageNodes(){const shell=document.querySelector('.rm-screening-shell');document.querySelectorAll('main>.hero,.container>.hero,.wrapper>.hero,.hero-banner,.legacy-hero,.instrument-hero,.hero-image,.banner-image').forEach(el=>{if(shell&&shell.contains(el))return;if(el.classList.contains('rm-screening-hero')||el.classList.contains('rm-screening-visual'))return;el.hidden=true;el.setAttribute('aria-hidden','true');el.dataset.rmLegacyVisual='hidden'});document.querySelectorAll('img[src*="i.pinimg.com"],img[src*="pinimg.com"]').forEach(img=>{if(shell&&shell.contains(img))return;const holder=img.closest('.hero,.banner,.cover,.hero-banner,.banner-wrap,.instrument-hero,.hero-image,.banner-image');if(holder){holder.hidden=true;holder.setAttribute('aria-hidden','true');holder.dataset.rmLegacyVisual='hidden'}else if(img.getBoundingClientRect().height>160||img.naturalHeight>500){img.dataset.rmLegacyImage='hidden';img.hidden=true;img.setAttribute('aria-hidden','true')}})}
function stripLegacyBackgrounds(){const shell=document.querySelector('.rm-screening-shell');document.querySelectorAll('header,section,div').forEach(el=>{if(shell&&shell.contains(el))return;const bg=getComputedStyle(el).backgroundImage||'';if(!/pinimg\.com|i\.pinimg\.com/i.test(bg))return;el.dataset.rmLegacyVisual='hidden';el.style.setProperty('background-image','none','important')})}
function setCredit(visual,hero){if(!visual)return;const old=visual.querySelector('.rm-photo-credit');if(old)old.remove();if(!hero.credit)return;const a=document.createElement('a');a.className='rm-photo-credit';a.href='https://unsplash.com/license';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Foto · Unsplash';a.setAttribute('aria-label','Fotografia do hero: Unsplash, consultar licença');visual.appendChild(a)}
function applyPhotoHero(){const shell=document.querySelector('.rm-screening-shell');if(!shell)return false;document.body.classList.add('rm-photo-heroes');const id=resolveInstrument();const hero=heroFor(id);const visual=shell.querySelector('.rm-screening-visual');const img=visual?.querySelector('img');if(img){if(img.src!==hero.src)img.src=hero.src;img.alt=hero.alt;img.loading='eager';img.decoding='async';img.referrerPolicy='strict-origin-when-cross-origin';img.title='Imagem temática do rastreio'}setCredit(visual,hero);updateSplashTitle();removeLegacyImageNodes();stripLegacyBackgrounds();return true}
function boot(){if(applyPhotoHero()){closeSplash();return}const obs=new MutationObserver(()=>{if(applyPhotoHero()){obs.disconnect();closeSplash()}});obs.observe(document.documentElement,{childList:true,subtree:true,attributes:false});window.setTimeout(()=>{obs.disconnect();applyPhotoHero();closeSplash()},5500)}
window.RM_SCREENING_VISUAL_V3={version:VERSION,refresh:applyPhotoHero};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
