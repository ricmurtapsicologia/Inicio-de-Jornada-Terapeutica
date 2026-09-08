(()=>{
'use strict';
const VERSION='3.0.0-photo-heroes';
const REPOS={
  'Rastreioclinico':'geral','rastreioTDAH':'tdah','tab-bateria-integrada':'bipolar',
  'Inventario-de-Tracos-Borderline':'borderline','bateria.narcisismo':'narcisismo',
  'Rastreio-de-Impulsividade':'impulsividade','rastreio.de.esquemas':'esquemas',
  'rastreiomodosesquematicos':'modos','Escala-de-Necessidades-Emocionais':'necessidades',
  'Escala-de-Co-Depenpencia-Emocional':'codependencia','ICAPS':'icaps','TriagemRiscoSuicidio':'risco'
};
const PHOTO_BASE='https://images.unsplash.com/';
const PHOTO_ARGS='?auto=format&fit=crop&w=1800&q=88';
const PHOTOS=Object.freeze({
  geral:{id:'photo-1494790108377-be9c29b29330',alt:'Pessoa em momento de reflexão e autocuidado.'},
  tdah:{id:'photo-1455390582262-044cdead277a',alt:'Pessoa organizando tarefas e escrevendo em um caderno.'},
  bipolar:{id:'photo-1506126613408-eca07ce68773',alt:'Pessoa em ambiente calmo, voltada ao equilíbrio e à autorregulação.'},
  borderline:{id:'photo-1544005313-94ddf0286df2',alt:'Pessoa em retrato sereno e contemplativo.'},
  narcisismo:{id:'photo-1524504388940-b1c1722653e1',alt:'Pessoa em retrato natural relacionado à autoimagem e percepção de si.'},
  impulsividade:{id:'photo-1507003211169-0a1dd7228f2d',alt:'Pessoa em pausa reflexiva antes de tomar decisões.'},
  esquemas:{id:'photo-1516321318423-f06f85e504b3',alt:'Pessoa registrando e organizando pensamentos em contexto cotidiano.'},
  modos:{id:'photo-1487412720507-e7ab37603c6f',alt:'Pessoa em ambiente acolhedor de reflexão psicológica.'},
  necessidades:{id:'photo-1508214751196-bcfd4ca60f91',alt:'Pessoa em contexto acolhedor relacionado a necessidades emocionais e autocuidado.'},
  codependencia:{id:'photo-1529156069898-49953e39b3ac',alt:'Pessoas em interação, representando vínculos, limites e autonomia nas relações.'},
  icaps:{id:'photo-1521737604893-d14cc237f11d',alt:'Pessoas conversando e ponderando decisões importantes.'},
  risco:{id:'photo-1499209974431-9dddcece7f88',alt:'Pessoa em ambiente de calma e proteção, associado a segurança emocional.'}
});
function instrument(){
  const seg=location.pathname.split('/').filter(Boolean)[0]||'';
  if(seg==='Inicio-de-Jornada-Terapeutica')return new URLSearchParams(location.search).get('instrument')||'geral';
  return REPOS[seg]||'geral';
}
function splash(){return document.getElementById('rmClinicalSplash')}
function photoFor(id){const p=PHOTOS[id]||PHOTOS.geral;return {src:`${PHOTO_BASE}${p.id}${PHOTO_ARGS}`,alt:p.alt}}
function updateSplashTitle(){
  const s=splash();if(!s)return;
  const h=document.querySelector('.rm-screening-shell h1');
  const t=s.querySelector('[data-rm-splash-instrument]');
  if(h&&t){t.textContent=h.textContent.trim();t.hidden=false}
}
function closeSplash(){
  const s=splash();if(!s)return;
  const started=Number(window.__RM_CLINICAL_SPLASH_STARTED||Date.now());
  const wait=Math.max(0,3000-(Date.now()-started));
  window.setTimeout(()=>{
    s.classList.add('rm-splash-leaving');
    window.setTimeout(()=>s.remove(),380);
  },wait);
}
function removeLegacyImageNodes(){
  const shell=document.querySelector('.rm-screening-shell');
  document.querySelectorAll('main>.hero,.container>.hero,.wrapper>.hero,.hero-banner,.legacy-hero,.instrument-hero,.hero-image,.banner-image').forEach(el=>{
    if(shell&&shell.contains(el))return;
    if(el.classList.contains('rm-screening-hero')||el.classList.contains('rm-screening-visual'))return;
    el.hidden=true;
    el.setAttribute('aria-hidden','true');
    el.dataset.rmLegacyVisual='hidden';
  });
  document.querySelectorAll('img[src*="i.pinimg.com"],img[src*="pinimg.com"]').forEach(img=>{
    if(shell&&shell.contains(img))return;
    const holder=img.closest('.hero,.banner,.cover,.hero-banner,.banner-wrap,.instrument-hero,.hero-image,.banner-image');
    if(holder){holder.hidden=true;holder.setAttribute('aria-hidden','true');holder.dataset.rmLegacyVisual='hidden'}
    else if(img.getBoundingClientRect().height>160||img.naturalHeight>500){img.dataset.rmLegacyImage='hidden';img.hidden=true;img.setAttribute('aria-hidden','true')}
  });
}
function stripLegacyBackgrounds(){
  const shell=document.querySelector('.rm-screening-shell');
  document.querySelectorAll('header,section,div').forEach(el=>{
    if(shell&&shell.contains(el))return;
    const bg=getComputedStyle(el).backgroundImage||'';
    if(!/pinimg\.com|i\.pinimg\.com/i.test(bg))return;
    el.dataset.rmLegacyVisual='hidden';
    el.style.setProperty('background-image','none','important');
  });
}
function applyPhotoHero(){
  const shell=document.querySelector('.rm-screening-shell');
  if(!shell)return false;
  document.body.classList.add('rm-photo-heroes');
  const id=instrument();
  const hero=photoFor(id);
  const img=shell.querySelector('.rm-screening-visual img');
  if(img){
    if(img.src!==hero.src)img.src=hero.src;
    img.alt=hero.alt;
    img.loading='eager';
    img.decoding='async';
    img.referrerPolicy='no-referrer';
    img.title='Fotografia: Unsplash · licença Unsplash';
    img.dataset.photoSource='Unsplash';
    img.dataset.photoLicense='Unsplash License';
  }
  updateSplashTitle();
  removeLegacyImageNodes();
  stripLegacyBackgrounds();
  return true;
}
function boot(){
  if(applyPhotoHero()){closeSplash();return}
  const obs=new MutationObserver(()=>{if(applyPhotoHero()){obs.disconnect();closeSplash()}});
  obs.observe(document.documentElement,{childList:true,subtree:true,attributes:false});
  window.setTimeout(()=>{obs.disconnect();applyPhotoHero();closeSplash()},5500);
}
window.RM_SCREENING_VISUAL_V3={version:VERSION,refresh:applyPhotoHero};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
