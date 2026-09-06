(()=>{
'use strict';
const ENDPOINT='https://docs.google.com/forms/d/e/';
const choice=(entry,title,choices,extra={})=>({entry,title,choices,required:true,...extra});
const text=(entry,title,extra={})=>({entry,title,required:true,type:'text',...extra});
const intensity=['Ausente','Leve','Moderada','Frequente','Muito frequente'];
const esteem=['Concordo inteiramente.','Concordo.','Discordo.','Discordo inteiramente'];
const schemas={
  controle:{
    title:'Dados para continuidade do atendimento',eyebrow:'Jornada Terapêutica · Cadastro clínico',
    intro:'Preencha os dados necessários para organização do seu atendimento. As informações são encaminhadas diretamente ao registro clínico configurado.',
    endpoint:ENDPOINT+'1FAIpQLSfvrCtU4hn72xCYHPizP60GMIiRAm45KM-1k3z5_8VIOj6dMQ/formResponse',
    fields:[
      text('1449005772','Nome completo',{autocomplete:'name'}),text('438520104','E-mail',{type:'email',autocomplete:'email'}),text('1685270148','Idade',{type:'number',inputmode:'numeric'}),
      choice('1842912509','Gênero',['MASCULINO','FEMININO','TRANSGÊNERO','PREFIRO NÃO DIZER'],{render:'select'}),text('1693510977','Naturalidade'),
      choice('262002855','Estado civil',['CASADO(A)','SOLTEIRO(A)','DIVORCIADO(A)','UNIÃO ESTÁVEL'],{render:'select'}),text('471792467','Data de nascimento',{type:'date'}),
      choice('700339175','Grau de instrução',['ENSINO FUNDAMENTAL INCOMPLETO','ENSINO FUNDAMENTAL COMPLETO','ENSINO MÉDIO INCOMPLETO','ENSINO MÉDIO COMPLETO','ENSINO SUPERIOR INCOMPLETO','ENSINO SUPERIOR COMPLETO'],{render:'select'}),
      text('1398230606','Profissão',{autocomplete:'organization-title'}),text('1129812483','Ocupação principal'),text('1311239845','Endereço',{autocomplete:'street-address'}),
      text('20419583','Telefone de contato',{type:'tel',autocomplete:'tel'}),text('1790168993','CPF'),text('1718829325','RG'),
      text('866296128','Nome do responsável, se o paciente for menor',{required:false,autocomplete:'name'}),text('1549827773','CPF do responsável, se aplicável',{required:false}),text('912318561','Telefone do responsável, se aplicável',{required:false,type:'tel',autocomplete:'tel'})
    ]
  },
  humor:{
    title:'Avaliação de Humor',eyebrow:'Jornada Terapêutica · Monitoramento',
    intro:'Considere como você tem se sentido nas últimas duas semanas, incluindo hoje. Em cada grupo, escolha a alternativa que melhor descreve seu momento atual.',
    endpoint:ENDPOINT+'1FAIpQLSfOwfOe9OAx_XgnsEMa8FzV2QJR8-ZkHmGD2gWEOcBeK41Odw/formResponse',
    safetyEntry:'1525923391',
    fields:[
      text('1449005772','Nome',{autocomplete:'name'}),text('1685270148','E-mail',{type:'email',autocomplete:'email'}),
      choice('1842912509','Tristeza',['Não me sinto triste.','Eu me sinto triste grande parte do tempo.','Estou triste o tempo todo.','Estou tão triste e tão infeliz que não consigo suportar.']),
      choice('686914816','Pessimismo',['Não estou desanimado (a) a respeito do meu futuro.','Eu me sinto mais desanimado (a) a respeito do meu futuro do que de costume.','Não espero que as coisas dêem certo para mim.','Sinto que não há esperança quanto ao meu futuro. Acho que só vai piorar.']),
      choice('1347330580','Perda de prazer',['Continuo sentindo o mesmo prazer que sentia com as coisas de que eu gosto.','Não sinto tanto prazer com as coisas como costumava sentir.','Tenho muito pouco prazer nas coisas que eu costumava gostar.','Não tenho mais nenhum prazer nas coisas que costumava gostar.']),
      choice('1901646506','Fracasso passado',['Não me sinto um (a) fracassado (a).','Tenho fracassado mais do que deveria.','Quando penso no passado, vejo muitos fracassos.','Sinto que como pessoa sou um fracasso total.']),
      choice('530494077','Sentimentos de culpa',['Não me sinto particularmente culpado (a).','Eu me sinto culpado (a) a respeito de várias coisas que eu fiz ou que deveria ser feito.','Eu me sinto culpado (a) a maior parte do tempo.','Eu me sinto culpado (a) o tempo todo.']),
      choice('1788463195','Sentimentos de punição',['Não sinto que estou sendo punido (a).','Sinto que posso ser punido (a).','Eu acho que serei punido (a).','Sinto que estou sendo punido (a).']),
      choice('1816967051','Autoestima',['Eu me sinto como sempre me senti em relação a mim mesmo (a).','Perdi a confiança em mim mesmo (a).','Estou desapontado (a) comigo mesmo (a).','Não gosto de mim.']),
      choice('1555220334','Autocrítica',['Não me critico e não me culpo mais do que o habitual.','Estou sendo mais crítico (a) comigo (a) mesmo (a).','Eu me critico por todos os meus erros.','Eu me critico por tudo de ruim que acontece.']),
      choice('1525923391','Pensamentos ou desejos suicidas',['Não tenho nenhum pensamento de me matar.','Tenho pensamentos de me matar, mas não levaria isso adiante.','Gostaria de matar.','Eu me mataria se tivesse oportunidade.']),
      choice('1778808244','Choro',['Não choro mais do que chorava antes.','Choro mais agora do que costumava chorar.','Choro por qualquer coisinha.','Sinto vontade de chorar mas não consigo.']),
      choice('331162812','Agitação',['Não me sinto mais inquieto (a) ou agitado (a) do que me sentia antes.','Eu me sinto mais inquieto (a) ou agitado (a) do que me sentia antes.','Eu me sinto tão inquieto (a) ou agitado (a) que é difícil ficar parado (a).','Estou tão inquieto (a) ou agitado (a) que tenho que estar sempre me mexendo ou fazendo alguma coisa.']),
      choice('1459211474','Perda de interesse',['Não perdi o interesse por outras pessoas ou por minhas atividades.','Estou menos interessados pelas outras pessoas ou coisas do que costumava estar.','Perdi quase todo o interesse por outras pessoas ou coisas.','É difícil me interessar por alguma coisa.']),
      choice('611916869','Indecisão',['Tomo minhas decisões tão bem quanto antes.','Acho mais difícil tomar decisões agora do que antes.','Tenho muito mais dificuldades em tomar decisões agora do que antes.','Tenho dificuldade para tomar qualquer decisão.']),
      choice('427875798','Desvalorização',['Não me sinto sem valor.','Não me considero hoje tão útil ou não me valorizo como antes.','Eu me sinto com menos valor quando me comparo com outras pessoas.','Eu me sinto completamente sem valor.']),
      choice('1223190698','Falta de energia',['Tenho tanta energia hoje como sempre tive.','Tenho menos energia do que costumava ter.','Não tenho energia suficiente para fazer muita coisa.','Não tenho energia suficiente para nada.']),
      choice('75813543','Alterações no padrão de sono',['Não percebi nenhuma mudança no meu sono.','Durmo um pouco mais do que o habitual.','Durmo um pouco menos do que o habitual.','Durmo muito mais do que o habitual.','Durmo muito menos do que o habitual.','Durmo a maior parte do dia.','Acordo 1 ou 2 horas mais cedo e não consigo voltar a dormir.']),
      choice('606731690','Irritabilidade',['Não estou mais irritado (a) do que o habitual.','Estou mais irritado (a) do que o habitual.','Estou muito mais irritado (a) do que o habitual.','Fico irritado (a) o tempo todo.']),
      choice('1889967480','Alterações de apetite',['Não percebi nenhuma mudança no meu apetite.','Meu apetite está um pouco menor do que o habitual.','Meu apetite está um pouco maior do que o habitual.','Meu apetite está muito menor do que antes.','Meu apetite está muito maior do que antes.','Não tenho nenhum apetite.','Quero comer o tempo todo.']),
      choice('1117304430','Dificuldade de concentração',['Posso me concentrar tão bem quanto antes.','Não posso me concentrar tão bem como habitualmente.','É muito difícil manter a concentração em alguma coisa por muito tempo.','Eu acho que não consigo me concentrar em nada.']),
      choice('4332658','Cansaço ou fadiga',['Não estou mais cansado (a) ou fatigado (a) do que o habitual.','Fico cansado (a) ou fatigado (a) mais facilmente do que o habitual.','Eu me sinto cansado (a) ou fatigado (a) para fazer muitas coisas que costumava fazer.','Eu me sinto muito cansado (a) ou fatigado (a) para fazer a maioria das coisas que costumava fazer.']),
      choice('1799807966','Perda de interesse por sexo',['Não notei qualquer mudança recente no meu interesse por sexo.','Estou menos interessado (a) em sexo do que costumava estar.','Estou muito menos interessado (a) em sexo agora.','Perdi completamente o interesse por sexo.'])
    ]
  },
  ansiedade:{
    title:'Monitoramento de Ansiedade',eyebrow:'Jornada Terapêutica · Monitoramento',
    intro:'Para cada situação, indique a intensidade percebida no seu momento atual. O objetivo é acompanhar mudanças ao longo do processo terapêutico.',
    endpoint:ENDPOINT+'1FAIpQLSdCuc1WnzTjMbRSyNmS5kuyG1NsaG95zMDO0v0GMABH8zodhg/formResponse',
    fields:[
      text('1449005772','Nome completo',{autocomplete:'name'}),text('99768501','Data de preenchimento',{type:'date',autoDate:true}),text('638119847','Telefone/WhatsApp',{required:false,type:'tel',autocomplete:'tel'}),
      choice('1842912509','Humor ansioso (preocupações, previsão do pior, antecipação temerosa, irritabilidade etc.)',intensity,{compact:true}),
      choice('1395740256','Tensão (fadiga, inquietação, tremores, dificuldade para relaxar ou agitação)',intensity,{compact:true}),
      choice('1480860371','Medos (escuro, estranhos, ficar sozinho, animais, trânsito, multidões etc.)',intensity,{compact:true}),
      choice('1800257226','Insônia (dificuldade para adormecer, sono interrompido, fadiga ao despertar, pesadelos etc.)',intensity,{compact:true}),
      choice('874701391','Dificuldades intelectuais (concentração, memória etc.)',intensity,{compact:true}),
      choice('397151835','Humor depressivo (perda de interesse ou prazer, despertar precoce, oscilação do humor etc.)',intensity,{compact:true}),
      choice('1764075426','Sintomas musculares (dores, rigidez, contrações etc.)',intensity,{compact:true}),
      choice('1408004607','Sintomas sensoriais (ondas de frio/calor, fraqueza, visão turva, formigamento, dormência, zumbido etc.)',intensity,{compact:true}),
      choice('445845406','Sintomas cardiovasculares (palpitações, dor no peito, sensação de desmaio, vertigem etc.)',intensity,{compact:true}),
      choice('54940841','Sintomas respiratórios (aperto no peito, sufocamento, falta de ar, suspiros etc.)',intensity,{compact:true}),
      choice('1821318703','Sintomas gastrointestinais (desconforto, dor abdominal, azia, náusea, alteração intestinal etc.)',intensity,{compact:true}),
      choice('1431223627','Sintomas geniturinários (alterações urinárias, menstruais ou sexuais etc.)',intensity,{compact:true}),
      choice('1916995878','Sintomas do sistema nervoso autônomo (boca seca, suor, tensão, cefaleia, tontura etc.)',intensity,{compact:true}),
      choice('1210409484','Como você percebe seu comportamento enquanto responde (tensão, inquietação, agitação, desconforto etc.)',intensity,{compact:true})
    ]
  },
  autoestima:{
    title:'Monitoramento de Autoestima',eyebrow:'Jornada Terapêutica · Monitoramento',
    intro:'Leia cada afirmação e escolha a alternativa que melhor representa como você se percebe neste momento.',
    endpoint:ENDPOINT+'1FAIpQLScu5CuRbE_UB829g4GqzMJyfm6J6sEdfw_xPUPEA3yMy6-6aw/formResponse',
    fields:[
      text('1449005772','Nome',{autocomplete:'name'}),text('1685270148','E-mail',{type:'email',autocomplete:'email'}),text('444633849','Data de resposta',{type:'date',autoDate:true}),
      choice('1842912509','1. De um modo geral, estou satisfeito comigo mesmo.',esteem,{compact:true}),
      choice('255704257','2. Às vezes penso que não sou bom de jeito nenhum.',esteem,{compact:true}),
      choice('92658196','3. Sinto que tenho uma quantidade de boas qualidades.',esteem,{compact:true}),
      choice('1526412401','4. Sou capaz de fazer as coisas tão bem quanto a maioria das pessoas.',esteem,{compact:true}),
      choice('1606969195','5. Sinto que não tenho muito do que me orgulhar.',esteem,{compact:true}),
      choice('238614378','6. Sem dúvidas, às vezes, me sinto inútil.',esteem,{compact:true}),
      choice('1259461233','7. Sinto que sou uma pessoa de valor, pelo menos, no mesmo nível que as outras.',esteem,{compact:true}),
      choice('2115796732','8. Gostaria de ter mais respeito por mim mesmo.',esteem,{compact:true}),
      choice('252572044','9. Considerando todos os aspectos, sinto-me inclinado a sentir que sou um fracasso.',esteem,{compact:true}),
      choice('79792452','10. Tenho uma atitude positiva em relação a mim mesmo.',esteem,{compact:true})
    ]
  }
};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'');
const params=new URLSearchParams(location.search);const key=params.get('instrument')||'';const schema=schemas[key];const root=document.getElementById('instrument-root');const sink=document.querySelector('.collection-sink');let submitted=false;
function choiceValue(v){return typeof v==='object'?String(v.value):String(v)}function choiceLabel(v){return typeof v==='object'?String(v.label):String(v)}
function renderField(field,index){const id=`f-${slug(field.entry)}`;const req=field.required?'<span class="required-mark" aria-hidden="true">*</span>':'';const required=field.required?' required':'';const name=`entry.${field.entry}`;
  if(field.choices?.length){if(field.render==='select')return `<div class="field-card"><label for="${id}"><strong>${esc(field.title)}</strong>${req}</label><select class="select-control" id="${id}" name="${name}"${required}><option value="">Selecione…</option>${field.choices.map(v=>`<option value="${esc(choiceValue(v))}">${esc(choiceLabel(v))}</option>`).join('')}</select></div>`;
    return `<fieldset class="field-card"><legend>${esc(field.title)}${req}</legend><div class="choice-list ${field.compact?'scale-list':''}">${field.choices.map((v,i)=>`<label class="choice"><input type="radio" name="${name}" value="${esc(choiceValue(v))}"${required&&i===0?' required':''}><span>${esc(choiceLabel(v))}</span></label>`).join('')}</div></fieldset>`}
  const auto=field.autocomplete?` autocomplete="${esc(field.autocomplete)}"`:' autocomplete="off"';const mode=field.inputmode?` inputmode="${esc(field.inputmode)}"`:'';return `<div class="field-card"><label for="${id}"><strong>${esc(field.title)}</strong>${req}</label><input class="text-control" id="${id}" name="${name}" type="${esc(field.type||'text')}"${auto}${mode}${required}></div>`}
function render(){if(!schema){root.innerHTML='<section class="error-card"><h2>Questionário não encontrado</h2><p>O endereço recebido não corresponde a um instrumento disponível.</p></section>';return}
  document.title=`${schema.title} — Jornada Terapêutica`;const fields=schema.fields.map(renderField).join('');root.innerHTML=`<section class="instrument-hero"><p class="eyebrow">${esc(schema.eyebrow)}</p><h1>${esc(schema.title)}</h1><p class="instrument-intro">${esc(schema.intro)}</p><p class="purpose-note"><strong>Importante:</strong> este material organiza informações de rastreio e acompanhamento; não estabelece diagnóstico isoladamente.</p></section><div class="progress-wrap" aria-label="Progresso do questionário"><div class="progress-meta"><strong id="progress-label">0% concluído</strong><span id="progress-count"></span></div><div class="progress-track"><div class="progress-bar" id="progress-bar"></div></div></div><form class="questionnaire" id="clinical-form" action="${esc(schema.endpoint)}" method="post" target="clinical-collection-sink" novalidate><input type="hidden" name="fvv" value="1"><input type="hidden" name="draftResponse" value="[]"><input type="hidden" name="pageHistory" value="0">${fields}<aside class="safety-note" id="safety-note" role="alert"><strong>Atenção à sua segurança</strong>Se esta resposta estiver relacionada a risco atual ou intenção de se ferir, não espere pelo retorno deste questionário: procure atendimento de urgência ou uma pessoa de confiança que possa permanecer com você.</aside><div class="form-footer"><p class="privacy-note">Suas respostas seguem diretamente para o mecanismo de registro configurado para este questionário. A página não grava respostas clínicas no navegador.</p><button class="submit-btn" type="submit">Enviar respostas</button></div></form>`;
  const form=document.getElementById('clinical-form');schema.fields.forEach(f=>{if(f.autoDate){const el=form.elements[`entry.${f.entry}`];if(el&&!el.value){const now=new Date();const local=new Date(now.getTime()-now.getTimezoneOffset()*60000);el.value=local.toISOString().slice(0,10)}}});form.addEventListener('input',updateProgress);form.addEventListener('change',event=>{updateProgress();updateSafety(event)});form.addEventListener('submit',onSubmit);updateProgress()}
function answered(field,form){const el=form.elements[`entry.${field.entry}`];if(!el)return false;if(typeof el.length==='number'&&!el.tagName){return [...el].some(x=>x.checked)}return String(el.value||'').trim()!==''}
function updateProgress(){const form=document.getElementById('clinical-form');if(!form||!schema)return;const required=schema.fields.filter(f=>f.required);const done=required.filter(f=>answered(f,form)).length;const pct=required.length?Math.round(done/required.length*100):100;document.getElementById('progress-label').textContent=`${pct}% concluído`;document.getElementById('progress-count').textContent=`${done} de ${required.length} campos obrigatórios`;document.getElementById('progress-bar').style.width=`${pct}%`}
function updateSafety(event){if(!schema?.safetyEntry)return;const note=document.getElementById('safety-note');const form=document.getElementById('clinical-form');const group=form.elements[`entry.${schema.safetyEntry}`];if(!group||!note)return;const selected=[...group].find(x=>x.checked);const first=schema.fields.find(f=>f.entry===schema.safetyEntry)?.choices?.[0];note.classList.toggle('show',Boolean(selected&&selected.value!==choiceValue(first)));if(note.classList.contains('show')&&event?.target?.name===`entry.${schema.safetyEntry}`)note.scrollIntoView({block:'nearest',behavior:'smooth'})}
function onSubmit(event){const form=event.currentTarget;if(!form.checkValidity()){event.preventDefault();form.reportValidity();const invalid=form.querySelector(':invalid');invalid?.focus();invalid?.scrollIntoView({block:'center'});return}submitted=true;const btn=form.querySelector('.submit-btn');btn.disabled=true;btn.textContent='Enviando…'}
function showSuccess(){root.innerHTML=`<section class="success-card" role="status"><p class="eyebrow">Envio concluído</p><h2>Respostas registradas</h2><p>Obrigado. O material ficará disponível para integração ao acompanhamento clínico. O resultado não equivale, isoladamente, a diagnóstico.</p><div class="success-actions"><a class="action-link" href="./#forms">Voltar à Jornada Terapêutica</a><a class="action-link" href="${location.pathname}?instrument=${encodeURIComponent(key)}">Responder novamente</a></div></section>`;scrollTo({top:0,behavior:'smooth'})}
sink?.addEventListener('load',()=>{if(!submitted)return;submitted=false;setTimeout(showSuccess,120)});render();
})();
