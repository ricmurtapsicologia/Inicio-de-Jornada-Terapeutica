(()=>{
'use strict';
const VERSION='3.1.0-specific-heroes';
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
  geral:{src:SHARED_BASE+'geral.webp',alt:'Painel simbólico de rastreio emocional com sono, energia, atenção, emoções e relações.',credit:false},
  tdah:{src:SHARED_BASE+'tdah.webp',alt:'Mesa de organização e foco com planner, timer, tarefas e elementos de manejo atencional.',credit:false},
  bipolar:{src:SHARED_BASE+'bipolar.webp',alt:'Diário de acompanhamento do humor com ritmos de sono, energia, relações e autocuidado.',credit:false},
  borderline:{src:SHARED_BASE+'borderline.webp',alt:'Composição terapêutica sobre identidade, intensidade emocional e padrões relacionais, com espelho segmentado e símbolos de vínculo.',credit:false},
  narcisismo:{src:SHARED_BASE+'narcisismo.webp',alt:'Composição sobre autoimagem, percepção de si e relação entre o eu e os outros.',credit:false},
  impulsividade:{src:SHARED_BASE+'impulsividade.webp',alt:'Composição sobre pausa, escolha, tempo de resposta e autorregulação.',credit:false},
  esquemas:{src:SHARED_BASE+'esquemas.webp',alt:'Mapa visual de esquemas centrais ligados a proteção, vulnerabilidade, autonomia, desempenho e pertencimento.',credit:false},
  modos:{src:SHARED_BASE+'modos.webp',alt:'Cartões terapêuticos representando modos vulnerável, impulsivo, crítico, protetor e adulto saudável.',credit:false},
  necessidades:{src:SHARED_BASE+'necessidades.webp',alt:'Cartões de necessidades emocionais: segurança, autonomia, conexão, espontaneidade, limites e autocuidado.',credit:false},
  rac5tr:{src:SHARED_BASE+'rac5tr.webp',alt:'Instrumento clínico multidimensional com domínios de humor, sono, cognição, relações e funcionamento.',credit:false},
  codependencia:{src:`${UNSPLASH_BASE}photo-1529156069898-49953e39b3ac${UNSPLASH_ARGS}`,alt:'Pessoas em interação, representando vínculos, limites e autonomia nas relações.',credit:true},
  icaps:{src:`${UNSPLASH_BASE}photo-1521737604893-d14cc237f11d${UNSPLASH_ARGS}`,alt:'Pessoas conversando e ponderando decisões importantes.',credit:true},
  risco:{src:`${UNSPLASH_BASE}photo-1500534314209-a25ddb2bd429${UNSPLASH_ARGS}`,alt:'Caminho aberto em ambiente natural, associado a proteção, continuidade e possibilidade de cuidado.',credit:true},
  humor:{src:`${UNSPLASH_BASE}photo-1500648767791-00dcc994a43e${UNSPLASH_ARGS}`,alt:'Acompanhamento do humor e do estado emocional.',credit:true},
  ansiedade:{src:`${UNSPLASH_BASE}photo-1527980965255-d3b416303d12${UNSPLASH_ARGS}`,alt:'Pausa e reflexão associadas à observação de sinais de ansiedade.',credit:true},
  autoestima:{src:`${UNSPLASH_BASE}photo-1534528741775-53994a69daeb${UNSPLASH_ARGS}`,alt:'Autopercepção e autoestima.',credit:true}
});
function instrument(){
  const seg=location.pathname.split('/').filter(Boolean)[0]||'';
  if(seg==='Inicio-de-Jornada-Terapeutica')return new URLSearchParams(location.search).get('instrument')||'geral';
  return REPOS[seg]||'geral';
}
function resolveInstrument(){
  const id=instrument();
  if(id==='geral' && /RAC-5TR|Rastreio Autoaplicável Clínico/i.test(document.body.innerText||'')) return 'rac5tr';
  return id;
}
function splash(){return document.getElementById('rmClinicalSplash')}
function heroFor(id){return HEROES[id]||HEROES.geral}
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
function setCredit(visual,hero){
  if(!visual)return;
  const old=visual.querySelector('.rm-photo-credit');
  if(old)old.remove();
  if(!hero.credit)return;
  const a=document.createElement('a');
  a.className='rm-photo-credit';
  a.href='https://unsplash.com/license';
  a.target='_blank';
  a.rel='noopener noreferrer';
  a.textContent='Foto · Unsplash';
  a.setAttribute('aria-label','Fotografia do hero: Unsplash, consultar licença');
  visual.appendChild(a);
}
function applyPhotoHero(){
  const shell=document.querySelector('.rm-screening-shell');
  if(!shell)return false;
  document.body.classList.add('rm-photo-heroes');
  const id=resolveInstrument();
  const hero=heroFor(id);
  const visual=shell.querySelector('.rm-screening-visual');
  const img=visual?.querySelector('img');
  if(img){
    if(img.src!==hero.src)img.src=hero.src;
    img.alt=hero.alt;
    img.loading='eager';
    img.decoding='async';
    img.referrerPolicy='strict-origin-when-cross-origin';
    img.title='Imagem temática do rastreio';
    img.dataset.photoSource=hero.credit?'Unsplash':'Richelmy Murta · Psicologia Clínica';
    img.dataset.photoLicense=hero.credit?'Unsplash License':'Asset próprio do projeto';
  }
  setCredit(visual,hero);
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
