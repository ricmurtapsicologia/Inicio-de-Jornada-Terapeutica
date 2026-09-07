(()=>{
'use strict';
const VERSION='screening-bridge-v3.1';
const TRANSPORT_URL='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/assets/screening-transport-v3.json';
const HUB='https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/';
const REPOS={
  'Rastreioclinico':'geral','rastreioTDAH':'tdah','tab-bateria-integrada':'bipolar','Inventario-de-Tracos-Borderline':'borderline','bateria.narcisismo':'narcisismo','Rastreio-de-Impulsividade':'impulsividade','rastreio.de.esquemas':'esquemas','rastreiomodosesquematicos':'modos','Escala-de-Necessidades-Emocionais':'necessidades','Escala-de-Co-Depenpencia-Emocional':'codependencia','ICAPS':'icaps','TriagemRiscoSuicidio':'risco'
};
const MONITOR_COUNTS={humor:21,ansiedade:14,autoestima:10};
const startedAt=Date.now();
let pendingId='',pendingButton=null,pendingTimer=null,transportConfig=null,specCache={};

function instrumentId(){
  const seg=location.pathname.split('/').filter(Boolean)[0]||'';
  if(seg==='Inicio-de-Jornada-Terapeutica') return new URLSearchParams(location.search).get('instrument')||'';
  return REPOS[seg]||'';
}
function today(){const d=new Date();const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,10);}
function uuid(){return globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():'rm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);}
function blank(v){return v==null||(Array.isArray(v)?v.length===0:String(v).trim()==='');}

async function loadSpec(id){
  if(specCache[id]) return specCache[id];
  if(Object.prototype.hasOwnProperty.call(MONITOR_COUNTS,id)) {
    return specCache[id]={mode:'field_card_order',formSelector:'#clinical-form',expectedCount:MONITOR_COUNTS[id]};
  }
  if(id==='icaps') {
    const r=await fetch('https://ricmurtapsicologia.github.io/ICAPS/data/icaps-v2.json',{cache:'no-store'});
    if(!r.ok) throw new Error('ICAPS_SPEC_'+r.status);
    const d=await r.json();
    const keys=(d.dimensions||[]).flatMap(x=>(x.items||[]).map(i=>i.id));
    if(keys.length!==60) throw new Error('ICAPS_SPEC_COUNT');
    return specCache[id]={mode:'named_controls',formSelector:'#icaps-form',expectedCount:60,keys};
  }
  const r=await fetch(HUB+'audits/mirror-specs/'+encodeURIComponent(id)+'.json',{cache:'no-store'});
  if(!r.ok) throw new Error('SPEC_'+id+'_'+r.status);
  const d=await r.json();
  const keys=(d.questions||[]).map(q=>String(q.name||'').trim());
  if(!keys.length||keys.some(k=>!k)||new Set(keys).size!==keys.length||keys.length!==d.questionCount) throw new Error('SPEC_CONTRACT_'+id);
  return specCache[id]={mode:'named_controls',formSelector:d.selector,expectedCount:d.questionCount,keys};
}

function valueForControlSet(form,key){
  const els=[...form.elements].filter(el=>el&&el.name===key);
  if(!els.length){const byId=document.getElementById(key);if(byId&&form.contains(byId))els.push(byId);}
  if(!els.length) throw new Error('CONTROL_NOT_FOUND:'+key);
  const type=String(els[0].type||'').toLowerCase();
  if(type==='radio'){const x=els.find(e=>e.checked);return x?x.value:'';}
  if(type==='checkbox'){
    const checked=els.filter(e=>e.checked).map(e=>e.value);
    return els.length===1?(checked[0]||''):checked;
  }
  return els[0].value??'';
}
function valueForCard(card){
  const checked=[...card.querySelectorAll('input[type="radio"]:checked,input[type="checkbox"]:checked')];
  if(checked.length>1)return checked.map(el=>el.value);
  if(checked.length===1)return checked[0].value;
  const control=card.querySelector('input:not([type="hidden"]),select,textarea');
  return control?control.value:'';
}
function collectResponses(form,spec){
  if(spec.mode==='field_card_order'){
    const cards=[...form.querySelectorAll('.field-card')];
    if(cards.length!==spec.expectedCount) throw new Error('CARD_COUNT:'+cards.length+':'+spec.expectedCount);
    return cards.map(valueForCard);
  }
  const values=spec.keys.map(k=>valueForControlSet(form,k));
  if(values.length!==spec.expectedCount) throw new Error('RESPONSE_MAP_COUNT');
  return values;
}

function setBusy(button,busy){if(!button)return;button.disabled=busy;if(busy)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');}
function showError(form,message){
  let box=form.querySelector('.rm-v3-submit-error');
  if(!box){box=document.createElement('div');box.className='rm-v3-submit-error';box.setAttribute('role','alert');(form.querySelector('.form-footer,.actions')||form).prepend(box);}
  box.textContent=message||'Não foi possível confirmar o registro. Tente novamente.';
}
function ensureSink(){
  let sink=document.getElementById('rm-screening-v3-sink');
  if(!sink){sink=document.createElement('iframe');sink.id='rm-screening-v3-sink';sink.name='rm-screening-v3-sink';sink.hidden=true;document.body.appendChild(sink);}
  return sink;
}
function postOrdered(form,id,responses){
  pendingId=uuid();
  pendingButton=form.querySelector('button[type="submit"],input[type="submit"]');
  setBusy(pendingButton,true);
  const rawIdentity=window.RMScreeningUI?.getIdentity?.()||{};
  const identity={
    name:String(rawIdentity.name||'').trim(),
    birthDate:String(rawIdentity.birthDate||'').trim(),
    applicationDate:String(rawIdentity.applicationDate||today()).trim()
  };
  const payload={version:VERSION,instrumentId:id,submissionId:pendingId,startedAt,submittedAt:Date.now(),identity,responses};
  const sink=ensureSink();
  const transport=document.createElement('form');
  transport.method='post';transport.action=transportConfig.bridgeUrl;transport.target=sink.name;transport.hidden=true;
  const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);transport.appendChild(input);
  document.body.appendChild(transport);transport.submit();transport.remove();
  clearTimeout(pendingTimer);
  pendingTimer=setTimeout(()=>{
    if(!pendingId)return;
    pendingId='';setBusy(pendingButton,false);showError(form,'O envio não pôde ser confirmado. Verifique sua conexão e tente novamente.');
  },25000);
}

window.addEventListener('message',event=>{
  const data=event.data;
  if(!data||data.type!=='RM_SCREENING_SUBMIT_RESULT'||!pendingId||data.submissionId!==pendingId)return;
  clearTimeout(pendingTimer);
  const id=instrumentId();
  const spec=specCache[id];
  const form=spec?document.querySelector(spec.formSelector):null;
  if(data.ok===true){
    const confirmed=pendingId;pendingId='';
    window.RMScreeningUI?.confirmDelivery?.({instrumentId:id,submissionId:confirmed,receipt:'apps_script_ordered_v31',processing:data.processing||'complete'});
    return;
  }
  pendingId='';setBusy(pendingButton,false);if(form)showError(form,data.message||'Não foi possível confirmar o registro. Tente novamente.');
});

Promise.all([
  fetch(TRANSPORT_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('TRANSPORT_CONFIG_'+r.status);return r.json();}),
  Promise.resolve(instrumentId()).then(async id=>({id,spec:id?await loadSpec(id):null}))
]).then(([cfg,loaded])=>{
  transportConfig=cfg;
  if(!loaded.id||!loaded.spec)return;
  if(!cfg.enabled||cfg.version!==VERSION||!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(String(cfg.bridgeUrl||'')))return;
  const form=document.querySelector(loaded.spec.formSelector);
  if(!form)return;
  document.addEventListener('submit',event=>{
    if(event.target!==form)return;
    if(!form.checkValidity())return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const responses=collectResponses(form,loaded.spec);
      if(responses.length!==loaded.spec.expectedCount||responses.some((v,i)=>blank(v)&&form.querySelectorAll('[required]').length&&false))throw new Error('RESPONSE_COLLECTION_INVALID');
      postOrdered(form,loaded.id,responses);
    }catch(err){setBusy(pendingButton,false);showError(form,'Revise as respostas antes de concluir o rastreio.');console.error('SCREENING_V3_COLLECT:'+String(err&&err.message||err));}
  },true);
}).catch(err=>console.error('SCREENING_V3_CLIENT:'+String(err&&err.message||err)));
})();
