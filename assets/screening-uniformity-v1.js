(()=>{
'use strict';
window.RM_SCREENING_V3_CLIENT=true;
const SRC='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-system-v2.js?v=2.3.0';
const SUBMIT='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-submit-v3.js?v=3.1.0';
const VISUAL='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-visual-v3.js?v=3.1.0-specific-heroes';
window.__RM_PENDING_DELIVERY=window.__RM_PENDING_DELIVERY||[];
window.__RM_CLINICAL_SPLASH_STARTED=Date.now();

function mountClinicalSplash(){
  if(document.getElementById('rmClinicalSplash')||!document.body)return;
  document.querySelectorAll('#splash,.splash,[class*="splash-screen" i],[id*="splash-screen" i]').forEach(n=>n.remove());
  const splash=document.createElement('div');
  splash.id='rmClinicalSplash';
  splash.setAttribute('role','status');
  splash.setAttribute('aria-live','polite');
  splash.setAttribute('aria-label','Abrindo rastreio clínico');
  splash.innerHTML='<div class="rm-clinical-opening-card"><div class="rm-clinical-mark" aria-hidden="true">RM</div><p class="rm-clinical-opening-kicker">Richelmy Murta · Psicologia Clínica</p><h1>Rastreio clínico</h1><p data-rm-splash-instrument hidden></p><p>Organizando sinais para uma conversa clínica mais clara.</p><div class="rm-clinical-opening-loader" aria-hidden="true"></div></div>';
  document.body.appendChild(splash);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountClinicalSplash,{once:true});else mountClinicalSplash();

if(!window.RMScreeningUI){
  window.RMScreeningUI={
    version:'2.3.0-loading',
    confirmDelivery(detail={}){window.__RM_PENDING_DELIVERY.push(detail)},
    getIdentity(){return {}}
  };
}
function addScript(src,marker){
  if(document.querySelector(`script[${marker}]`))return;
  const s=document.createElement('script');
  s.src=src;
  s.defer=true;
  s.setAttribute(marker,'true');
  document.head.appendChild(s);
}
addScript(SRC,'data-rm-screening-v2');
addScript(SUBMIT,'data-rm-submit-v3');
addScript(VISUAL,'data-rm-visual-v3');
})();
