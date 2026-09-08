(()=>{
'use strict';
if(window.RM_SCREENING_V3_CLIENT===true)return;

const sink=document.querySelector('.collection-sink');
const instrumentId=new URLSearchParams(location.search).get('instrument')||'';
const bridgeUrl=String(window.RM_MONITORING_BRIDGE_URL||'').trim();
const bridgeVersion=String(window.RM_MONITORING_BRIDGE_VERSION||'monitoring-bridge-v2');
const bridgeEligible=['humor','ansiedade','autoestima'].includes(instrumentId);
const bridgeEnabled=bridgeEligible&&/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(bridgeUrl);
const startedAt=Date.now();
let legacySubmitted=false;
let pendingSubmissionId='';
let pendingButton=null;
let pendingTimer=null;

function uuid(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  return 'rm-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
}

function titleForCard(card){
  const strong=card.querySelector('label strong');
  if(strong)return String(strong.textContent||'').trim();
  const legend=card.querySelector('legend');
  if(!legend)return '';
  return String(legend.firstChild?.textContent||legend.textContent||'').replace(/\s*\*\s*$/,'').trim();
}

function valueForCard(card){
  const checked=[...card.querySelectorAll('input[type="radio"]:checked,input[type="checkbox"]:checked')];
  if(checked.length>1)return checked.map(el=>el.value);
  if(checked.length===1)return checked[0].value;
  const control=card.querySelector('input:not([type="hidden"]),select,textarea');
  return control?control.value:'';
}

function collectAnswers(form){
  const answers={};
  [...form.querySelectorAll('.field-card')].forEach(card=>{
    const title=titleForCard(card);
    if(!title)return;
    answers[title]=valueForCard(card);
  });
  return answers;
}

function setButtonState(button,busy){
  if(!button)return;
  button.disabled=busy;
  button.textContent=busy?'Confirmando registro…':'Enviar respostas';
}

function clearError(form){form.querySelector('.rm-monitoring-submit-error')?.remove();}
function showError(form,message){
  clearError(form);
  const box=document.createElement('div');
  box.className='rm-monitoring-submit-error';
  box.setAttribute('role','alert');
  box.textContent=message||'Não foi possível confirmar o registro. Tente novamente.';
  const footer=form.querySelector('.form-footer')||form;
  footer.prepend(box);
}

function sendBridge(form){
  clearError(form);
  pendingSubmissionId=uuid();
  pendingButton=form.querySelector('.submit-btn');
  setButtonState(pendingButton,true);
  const payload={version:bridgeVersion,instrumentId,submissionId:pendingSubmissionId,startedAt,submittedAt:Date.now(),answers:collectAnswers(form)};
  const transport=document.createElement('form');
  transport.method='post';transport.action=bridgeUrl;transport.target='clinical-collection-sink';transport.hidden=true;
  const input=document.createElement('input');input.type='hidden';input.name='payload';input.value=JSON.stringify(payload);transport.appendChild(input);
  document.body.appendChild(transport);transport.submit();transport.remove();
  clearTimeout(pendingTimer);
  pendingTimer=setTimeout(()=>{
    if(!pendingSubmissionId)return;
    pendingSubmissionId='';setButtonState(pendingButton,false);showError(form,'O envio não pôde ser confirmado. Verifique sua conexão e tente novamente.');
  },25000);
}

document.addEventListener('submit',event=>{
  const form=event.target;
  if(form?.id!=='clinical-form')return;
  if(!form.checkValidity())return;
  if(bridgeEnabled){event.preventDefault();event.stopImmediatePropagation();sendBridge(form);return;}
  legacySubmitted=true;
},true);

window.addEventListener('message',event=>{
  if(!bridgeEnabled||!sink||event.source!==sink.contentWindow)return;
  const data=event.data;
  if(!data||data.type!=='RM_MONITORING_SUBMIT_RESULT')return;
  if(!pendingSubmissionId||data.submissionId!==pendingSubmissionId)return;
  clearTimeout(pendingTimer);
  const form=document.getElementById('clinical-form');
  if(data.ok===true){
    const confirmedId=pendingSubmissionId;pendingSubmissionId='';
    window.RMScreeningUI?.confirmDelivery({instrumentId,submissionId:confirmedId,receipt:'apps_script_formresponse'});
    return;
  }
  pendingSubmissionId='';setButtonState(pendingButton,false);if(form)showError(form,data.message||'Não foi possível confirmar o registro. Tente novamente.');
});

sink?.addEventListener('load',()=>{
  if(bridgeEnabled||!legacySubmitted)return;
  legacySubmitted=false;
  window.RMScreeningUI?.confirmDelivery({instrumentId,receipt:'legacy_iframe_load'});
});
})();
