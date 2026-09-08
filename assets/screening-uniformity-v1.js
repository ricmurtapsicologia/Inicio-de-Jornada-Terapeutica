(()=>{
'use strict';
window.RM_SCREENING_V3_CLIENT=true;
const SRC='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-system-v2.js?v=2.3.0';
const SUBMIT='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-submit-v3.js?v=3.1.0';
window.__RM_PENDING_DELIVERY=window.__RM_PENDING_DELIVERY||[];
if(!window.RMScreeningUI){
  window.RMScreeningUI={
    version:'2.3.0-loading',
    confirmDelivery(detail={}){window.__RM_PENDING_DELIVERY.push(detail)},
    getIdentity(){return {}}
  };
}
if(!document.querySelector('script[data-rm-screening-v2]')){
  const s=document.createElement('script');
  s.src=SRC;
  s.defer=true;
  s.dataset.rmScreeningV2='true';
  document.head.appendChild(s);
}
if(!document.querySelector('script[data-rm-submit-v3]')){
  const t=document.createElement('script');
  t.src=SUBMIT;
  t.defer=true;
  t.dataset.rmSubmitV3='true';
  document.head.appendChild(t);
}
})();
