import { readFile, writeFile } from 'node:fs/promises';

const path = 'anamnese.html';
let html = await readFile(path, 'utf8');

const cssAnchor = '.hidden{display:none!important}.hp{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}';
const cssEnhancements = `.hidden{display:none!important}.hp{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    .topbar-context{font-size:.82rem;font-weight:700;letter-spacing:.04em;color:#567075;background:#f4f7f7;border:1px solid var(--line);padding:7px 11px;border-radius:999px}
    .hero{padding:30px 0 18px}
    .hero-shell{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(250px,.72fr);gap:24px;align-items:stretch;background:linear-gradient(145deg,#fbfdfd 0%,#f4f9f8 100%);border:1px solid rgba(27,127,121,.13);border-radius:26px;box-shadow:0 18px 44px rgba(21,64,65,.08);padding:clamp(24px,4vw,36px);position:relative;overflow:hidden}
    .hero-shell::after{content:'';position:absolute;width:220px;height:220px;border-radius:50%;right:-100px;top:-115px;background:radial-gradient(circle,rgba(27,127,121,.10),rgba(27,127,121,0) 70%);pointer-events:none}
    .hero-main{position:relative;z-index:1}.hero-main .eyebrow{margin-bottom:10px}.hero-main h1{font-size:clamp(2.35rem,5vw,3.65rem);line-height:1.03;margin:0 0 20px;letter-spacing:-.035em;color:#203035;max-width:650px}.hero-main p{max-width:680px;color:#52646a;margin:0 0 13px;font-size:1.01rem}.hero-lead{font-size:1.08rem!important;color:#344b50!important}
    .meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.meta span{display:inline-flex;align-items:center;min-height:34px;background:rgba(255,255,255,.85);border:1px solid rgba(27,127,121,.14);padding:6px 10px;border-radius:999px;font-size:.84rem;color:#3d5a5f}
    .hero-side{position:relative;z-index:1;display:flex;flex-direction:column;background:rgba(255,255,255,.76);border:1px solid rgba(27,127,121,.13);border-radius:20px;padding:20px;box-shadow:0 8px 20px rgba(21,64,65,.04)}
    .hero-side-badge{display:inline-flex;align-self:flex-start;padding:7px 10px;border-radius:999px;background:#e9f5f3;border:1px solid rgba(27,127,121,.14);font-size:.78rem;font-weight:700;color:#315e5c;margin-bottom:8px}
    .hero-side-item{display:grid;gap:3px;padding:14px 0;border-bottom:1px solid rgba(27,127,121,.10)}.hero-side-item strong{font-size:.82rem;text-transform:uppercase;letter-spacing:.06em;color:#52706f}.hero-side-item span{font-size:.94rem;line-height:1.45;color:#344d52}
    .hero-side-signature{display:grid;gap:3px;padding-top:16px;margin-top:auto}.hero-side-signature strong{font-size:1rem;color:#213b3f}.hero-side-signature span{font-size:.9rem;color:#557075}
    .progress-wrap{margin:18px 0 22px;background:rgba(255,255,255,.82);border:1px solid rgba(27,127,121,.11);border-radius:16px;padding:14px 16px;box-shadow:0 8px 22px rgba(21,64,65,.04)}.progress-row{font-size:.84rem;margin-bottom:8px}.progress{height:7px}
    .card{border-radius:22px;box-shadow:0 16px 38px rgba(21,64,65,.075)}.step-head{padding-bottom:20px;margin-bottom:26px}.step-head .eyebrow{font-size:.74rem}.step-head h2{font-size:clamp(1.55rem,3vw,2.15rem);letter-spacing:-.015em;color:#294f4b}.step-head p{max-width:760px}
    .status{border:1px solid transparent;font-weight:700;line-height:1.45}.status.pending{background:#f5f4ed;color:#6b5a34;border-color:#ebe4cf}.status.waiting{background:#edf5f4;color:#315b5d;border-color:#d6e8e5}.status.error{background:#fbefef;color:#913d3d;border-color:#f1d7d7}
    .success-panel{max-width:720px;margin:42px auto;text-align:center;padding:46px 28px}.success-mark{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;margin:0 auto 18px;background:#e7f4ef;color:#26705f;font-size:1.45rem;font-weight:700;border:1px solid #cfe7df}.success-panel h2{font-size:clamp(1.85rem,4vw,2.5rem);letter-spacing:-.02em}.success-panel .eyebrow{margin-bottom:8px}`;
if (!html.includes('.hero-shell{')) {
  if (!html.includes(cssAnchor)) throw new Error('Âncora CSS não encontrada.');
  html = html.replace(cssAnchor, cssEnhancements);
}

html = html.replace('@media(max-width:640px){.privacy-badge{display:none}.hero{padding-top:28px}.card{padding:20px 16px}.scale{grid-template-columns:repeat(6,1fr)}.actions{flex-direction:column-reverse}.btn{width:100%}.progress-row{font-size:.82rem}}', `@media(max-width:780px){.hero-shell{grid-template-columns:1fr;padding:22px 18px}.hero-side{padding:17px}.hero-main h1{font-size:clamp(2.05rem,9vw,3rem)}.hero{padding-top:22px}.topbar-context{display:none}}
    @media(max-width:640px){.card{padding:22px 16px}.scale{grid-template-columns:repeat(6,1fr)}.actions{flex-direction:column-reverse}.btn{width:100%}.progress-row{font-size:.82rem}.hero-main p{font-size:.98rem}.meta span{font-size:.8rem}.progress-wrap{padding:12px 14px}}`);

html = html.replace('<span class="privacy-badge">Preenchimento privado</span>', '<span class="topbar-context">Anamnese</span>');

const oldHero = `    <section class="hero" aria-labelledby="page-title">
      <p class="eyebrow">Anamnese · início do processo</p>
      <h1 id="page-title">Antes da nossa primeira sessão</h1>
      <p>Este é um primeiro espaço para que eu possa conhecer um pouco de você antes da nossa conversa.</p>
      <p>Você não precisa contar toda a sua história aqui. Algumas coisas fazem mais sentido quando conversadas com calma durante as sessões. Responda da maneira que se sentir confortável. Algumas perguntas são opcionais e, quando preferir, você poderá deixar alguns assuntos para conversarmos em sessão.</p>
      <p>Não existem respostas certas ou erradas. O mais importante é que suas respostas representem, tanto quanto possível, como você está vivendo este momento.</p>
      <div class="meta"><span>Tempo aproximado: 7–10 minutos</span><span>Sem interface do Google Forms</span></div>
      <div class="notice">Suas respostas serão lidas por mim antes da nossa primeira sessão e servirão como ponto de partida para nossa conversa.<br><strong>Richelmy Murta Pinto · Psicólogo Clínico — CRP 04/54.383</strong></div>
    </section>`;
const newHero = `    <section class="hero" aria-labelledby="page-title">
      <div class="hero-shell">
        <div class="hero-main">
          <p class="eyebrow">Anamnese · início do processo</p>
          <h1 id="page-title">Antes da nossa primeira sessão</h1>
          <p class="hero-lead">Este é um primeiro espaço para que eu possa conhecer um pouco de você antes da nossa conversa.</p>
          <p>Você não precisa contar toda a sua história aqui. Algumas coisas fazem mais sentido quando conversadas com calma durante as sessões. Responda da maneira que se sentir confortável. Algumas perguntas são opcionais e, quando preferir, você poderá deixar alguns assuntos para conversarmos em sessão.</p>
          <p>Não existem respostas certas ou erradas. O mais importante é que suas respostas representem, tanto quanto possível, como você está vivendo este momento.</p>
          <div class="meta"><span>7–10 minutos</span><span>Questões opcionais podem ser deixadas em branco</span></div>
        </div>
        <aside class="hero-side" aria-label="Informações da anamnese">
          <span class="hero-side-badge">Preenchimento privado</span>
          <div class="hero-side-item"><strong>Finalidade</strong><span>Organizar informações iniciais para preparar nossa primeira conversa.</span></div>
          <div class="hero-side-item"><strong>Como responder</strong><span>Do seu jeito, com o nível de detalhe que fizer sentido para você.</span></div>
          <div class="hero-side-signature"><strong>Richelmy Murta Pinto</strong><span>Psicólogo Clínico · CRP 04/54.383</span></div>
        </aside>
      </div>
    </section>`;
if (html.includes(oldHero)) html = html.replace(oldHero, newHero);
else if (!html.includes('class="hero-shell"')) throw new Error('Hero antigo não encontrado.');

html = html.replace('<section class="card success-panel hidden" id="successPanel" tabindex="-1">\n      <p class="eyebrow">Concluído</p>', '<section class="card success-panel hidden" id="successPanel" tabindex="-1">\n      <div class="success-mark" aria-hidden="true">✓</div>\n      <p class="eyebrow">Concluído</p>');

html = html.replace('  let sending = false;\n  let submitted = false;', `  let sending = false;
  let submitted = false;
  let activeSubmissionId = null;
  let warningTimer = null;
  let hardTimeoutTimer = null;`);

const statusFns = `  function scrollCard(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function setStatus(kind,msg){const el=document.getElementById('submitStatus');if(!el)return;el.className=\`status show \${kind}\`;el.textContent=msg;}`;
const enhancedStatusFns = `  function scrollCard(){document.getElementById('formCard').scrollIntoView({behavior:'smooth',block:'start'});}
  function setStatus(kind,msg){const el=document.getElementById('submitStatus');if(!el)return;el.className=\`status show \${kind}\`;el.textContent=msg;}
  function clearSubmitTimers(){
    if(warningTimer) window.clearTimeout(warningTimer);
    if(hardTimeoutTimer) window.clearTimeout(hardTimeoutTimer);
    warningTimer=null;
    hardTimeoutTimer=null;
  }`;
if (!html.includes('function clearSubmitTimers()')) {
  if (!html.includes(statusFns)) throw new Error('Funções de status não encontradas.');
  html = html.replace(statusFns, enhancedStatusFns);
}

const oldSubmit = `  function submit(){
    if(sending)return; const honeypot=document.querySelector('input[name="website"]')?.value||''; if(honeypot)return;
    if(!BRIDGE_URL){setStatus('error','O canal seguro de envio ainda não está configurado. Suas respostas permanecem nesta tela.');return;}
    sending=true; const btn=document.getElementById('nextBtn');if(btn){btn.disabled=true;btn.textContent='Enviando…';} setStatus('pending','Enviando suas respostas…');
    const submissionId=(crypto.randomUUID?crypto.randomUUID():\`${Date.now()}-\${Math.random().toString(16).slice(2)}\`);
    const payload={version:'anamnese-v2',formId:FORM_ID,submissionId,startedAt,submittedAt:Date.now(),answers};
    const tf=document.getElementById('transportForm'); document.getElementById('transportPayload').value=JSON.stringify(payload); tf.action=BRIDGE_URL; tf.submit();
    window.setTimeout(()=>{if(sending){sending=false;if(btn){btn.disabled=false;btn.textContent='Enviar anamnese';}setStatus('error','O envio demorou mais que o esperado. Suas respostas continuam nesta tela; tente novamente.');}},25000);
  }`;
const newSubmit = `  function submit(){
    if(sending)return;
    const honeypot=document.querySelector('input[name="website"]')?.value||'';
    if(honeypot)return;
    if(!BRIDGE_URL){setStatus('error','O canal seguro de envio ainda não está configurado. Suas respostas permanecem nesta tela.');return;}

    sending=true;
    clearSubmitTimers();
    const btn=document.getElementById('nextBtn');
    if(btn){btn.disabled=true;btn.textContent='Enviando…';}
    setStatus('pending','Enviando suas respostas com segurança…');

    if(!activeSubmissionId){
      activeSubmissionId=(crypto.randomUUID?crypto.randomUUID():\`${Date.now()}-\${Math.random().toString(16).slice(2)}\`);
    }
    const payload={version:'anamnese-v2',formId:FORM_ID,submissionId:activeSubmissionId,startedAt,submittedAt:Date.now(),answers};
    const tf=document.getElementById('transportForm');
    document.getElementById('transportPayload').value=JSON.stringify(payload);
    tf.action=BRIDGE_URL;
    tf.submit();

    warningTimer=window.setTimeout(()=>{
      if(sending){setStatus('waiting','O envio está levando um pouco mais que o habitual. Continue nesta página enquanto finalizamos a confirmação.');}
    },12000);

    hardTimeoutTimer=window.setTimeout(()=>{
      if(sending){
        sending=false;
        if(btn){btn.disabled=false;btn.textContent='Enviar novamente';}
        setStatus('waiting','Não foi possível confirmar automaticamente o recebimento. Suas respostas continuam nesta tela e você pode tentar novamente sem preencher tudo de novo.');
      }
    },60000);
  }`;
if (html.includes(oldSubmit)) html = html.replace(oldSubmit, newSubmit);
else if (!html.includes("setStatus('waiting','O envio está levando")) throw new Error('Função submit antiga não encontrada.');

const oldListener = `  window.addEventListener('message',(event)=>{
    const iframe=document.getElementById('anamneseTransport'); if(event.source!==iframe?.contentWindow)return; const data=event.data||{}; if(data.type!=='ANAMNESE_SUBMIT_RESULT')return; sending=false;
    if(data.ok){submitted=true;document.getElementById('anamneseForm').classList.add('hidden');document.querySelector('.progress-wrap').classList.add('hidden');const s=document.getElementById('successPanel');s.classList.remove('hidden');s.focus();}
    else{const btn=document.getElementById('nextBtn');if(btn){btn.disabled=false;btn.textContent='Enviar anamnese';}setStatus('error',data.message||'Não foi possível concluir o envio. Suas respostas permanecem nesta tela.');}
  });`;
const newListener = `  window.addEventListener('message',(event)=>{
    const data=event.data||{};
    if(data.type!=='ANAMNESE_SUBMIT_RESULT')return;
    const iframe=document.getElementById('anamneseTransport');
    const sourceMatches=event.source===iframe?.contentWindow;
    const googleOrigin=event.origin==='https://script.google.com'||event.origin==='https://script.googleusercontent.com'||event.origin.endsWith('.googleusercontent.com');
    const sandboxOrigin=event.origin==='null';
    if(!sourceMatches&&!googleOrigin&&!sandboxOrigin)return;
    if(data.ok&&data.submissionId&&activeSubmissionId&&data.submissionId!==activeSubmissionId)return;

    clearSubmitTimers();
    sending=false;
    if(data.ok){
      submitted=true;
      document.getElementById('anamneseForm').classList.add('hidden');
      document.querySelector('.progress-wrap').classList.add('hidden');
      const s=document.getElementById('successPanel');
      s.classList.remove('hidden');
      s.focus();
    }else{
      const btn=document.getElementById('nextBtn');
      if(btn){btn.disabled=false;btn.textContent='Enviar novamente';}
      setStatus('error',data.message||'Não foi possível concluir o envio. Suas respostas permanecem nesta tela.');
    }
  });

  document.getElementById('anamneseTransport').addEventListener('load',()=>{
    if(sending){setStatus('pending','Recebemos retorno do servidor. Confirmando o registro da anamnese…');}
  });`;
if (html.includes(oldListener)) html = html.replace(oldListener, newListener);
else if (!html.includes("const googleOrigin=event.origin==='https://script.google.com'")) throw new Error('Listener antigo não encontrado.');

await writeFile(path, html);
console.log('Anamnese UX patch aplicado.');
