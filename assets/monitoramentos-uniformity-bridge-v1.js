(()=>{
'use strict';
const sink=document.querySelector('.collection-sink');
let submitted=false;

document.addEventListener('submit',event=>{
  if(event.target?.id==='clinical-form' && event.target.checkValidity()) submitted=true;
},true);

sink?.addEventListener('load',()=>{
  if(!submitted)return;
  submitted=false;
  const instrumentId=new URLSearchParams(location.search).get('instrument')||'';
  window.RMScreeningUI?.confirmDelivery({instrumentId});
  setTimeout(()=>{
    const card=document.querySelector('.success-card');
    if(!card)return;
    const title=card.querySelector('h2');
    const paragraph=card.querySelector('p:not(.eyebrow)');
    if(title)title.textContent='Rastreio concluído com sucesso';
    if(paragraph)paragraph.textContent='Suas respostas foram registradas e enviadas ao psicólogo responsável para análise e parecer clínico.';
  },180);
});
})();
