/**
 * ScreeningScoringV3.gs
 * Motor único dos 15 rastreios.
 *
 * Política:
 * - nunca inventar ponto de corte;
 * - regras proprietárias atuais são portadas literalmente e marcadas como source-derived;
 * - regras antigas deliberadamente removidas não são ressuscitadas;
 * - instrumentos sem corte validado retornam perfil DESCRIPTIVE_ONLY;
 * - todo resultado é rastreio/monitoramento, nunca diagnóstico isolado.
 */

const SCREENING_SCORING_VERSION = '3.0.0-rc';

function scoreScreeningV3_(instrumentId, records) {
  const id = String(instrumentId || '').toLowerCase();
  const r = (records || []).filter(function(x){ return x && !x.identity; });
  const scorers = {
    geral: scoreGeralV3_, tdah: scoreTdahV3_, bipolar: scoreBipolarV3_, borderline: scoreBorderlineV3_,
    narcisismo: scoreNarcisismoV3_, impulsividade: scoreImpulsividadeV3_, esquemas: scoreEsquemasV3_,
    modos: scoreModosV3_, necessidades: scoreNecessidadesV3_, codependencia: scoreCodependenciaV3_,
    icaps: scoreIcapsV3_, humor: scoreBdi2V3_, ansiedade: scoreHamaV3_, autoestima: scoreRosenbergV3_, risco: scoreRiscoV3_
  };
  if (!scorers[id]) throw new Error('SCORER_NOT_FOUND:' + id);
  const out = scorers[id](r);
  out.instrumentId = id;
  out.scoringVersion = SCREENING_SCORING_VERSION;
  out.disclaimer = out.disclaimer || 'Resultado de rastreio/monitoramento. Não estabelece diagnóstico isoladamente.';
  out.riskFlags = out.riskFlags || [];
  out.caveats = out.caveats || [];
  return out;
}

function screeningScoringRecords_(form, answers) {
  const identity = {'Nome completo':1,'Data de nascimento':1,'Data de aplicação do rastreio':1};
  return form.getItems().map(function(item){
    const title = String(item.getTitle() || '').trim();
    if (!title || !Object.prototype.hasOwnProperty.call(answers, title)) return null;
    const response = answers[title];
    let choices = [];
    try {
      const t = item.getType();
      if (t === FormApp.ItemType.MULTIPLE_CHOICE) choices = item.asMultipleChoiceItem().getChoices().map(function(c){return c.getValue();});
      else if (t === FormApp.ItemType.LIST) choices = item.asListItem().getChoices().map(function(c){return c.getValue();});
    } catch (_) {}
    const usable = choices.filter(function(c){ return !/^selecione(?:\.\.\.)?$/i.test(String(c).trim()); });
    const choiceIndex = usable.indexOf(String(response));
    return {title:title,response:response,choiceIndex:choiceIndex,choices:usable,identity:Boolean(identity[title])};
  }).filter(Boolean);
}

function scNum_(rec, min, max) {
  const s = String(rec && rec.response != null ? rec.response : '').trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)/);
  let n = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(n) && rec && rec.choiceIndex >= 0) n = rec.choiceIndex + (min || 0);
  if (!Number.isFinite(n)) throw new Error('SCORE_VALUE_UNMAPPED');
  if (typeof min === 'number' && n < min) throw new Error('SCORE_VALUE_LOW');
  if (typeof max === 'number' && n > max) throw new Error('SCORE_VALUE_HIGH');
  return n;
}
function scIdx_(rec) { if (!rec || rec.choiceIndex < 0) throw new Error('CHOICE_INDEX_UNMAPPED'); return rec.choiceIndex; }
function scYes_(rec) { return /^(sim|aplica-se\s*\(sim\))/i.test(String(rec.response || '').trim()); }
function scMean_(arr){ return arr.reduce(function(a,b){return a+b;},0)/arr.length; }
function scRound_(n,d){ const p=Math.pow(10,d||0); return Math.round(n*p)/p; }
function scBand_(n, bands){ for(var i=0;i<bands.length;i++) if(n>=bands[i][0] && n<=bands[i][1]) return bands[i][2]; return bands[bands.length-1][2]; }
function scBlock_(r,start,count,parser){ return r.slice(start,start+count).map(parser); }
function scDescriptive_(title, values, maxPerItem){
  const total=values.reduce(function(a,b){return a+b;},0), max=values.length*maxPerItem;
  return {title:title,rawScore:total,maxScore:max,mean:scRound_(total/values.length,2),percent:scRound_(100*total/max,1)};
}

// 1. RAC-5TR: regras diagnósticas antigas foram removidas; mantemos apenas os 7 blocos descritivos.
function scoreGeralV3_(r){
  if(r.length!==70) throw new Error('GERAL_COUNT:'+r.length);
  const names=['Exposição/ansiedade social','Humor depressivo','Preocupação/ansiedade geral','Evitação interpessoal','Pensamentos obsessivos','Autovalor','Oscilações de humor/energia'];
  const sub=[];
  for(var b=0;b<7;b++) sub.push(scDescriptive_(names[b],scBlock_(r,b*10,10,function(x){return scNum_(x,0,3);}),3));
  return {sourceMode:'DESCRIPTIVE_ONLY',classification:'Sem corte diagnóstico',subscales:sub,clinicalMeaning:'Panorama dimensional dos sete blocos. Os cortes diagnósticos antigos foram deliberadamente excluídos do backend.',caveats:['Questionário integrativo próprio; interpretar bloco a bloco e em entrevista clínica.']};
}

// 2. EIR-TDAH-A: mantém blocos dimensionais; interpretação DSM-like removida não é restaurada.
function scoreTdahV3_(r){
  if(r.length!==85) throw new Error('TDAH_COUNT:'+r.length);
  const lens=[12,12,10,12,8,10,10,11];
  const names=['Desatenção','Hiperatividade/impulsividade','Desregulação emocional','Funções executivas','Impacto funcional','História infantil','Indicadores diferenciais','Recursos de autorregulação'];
  let pos=0; const sub=[];
  for(var i=0;i<lens.length;i++){
    const vals=scBlock_(r,pos,lens[i],function(x){return scNum_(x,0,4);}); pos+=lens[i];
    sub.push(scDescriptive_(names[i],vals,4));
  }
  return {sourceMode:'DESCRIPTIVE_ONLY',classification:'Sem corte diagnóstico',subscales:sub,clinicalMeaning:'Perfil dimensional de atenção, impulsividade, regulação, funcionamento e história. A antiga classificação DSM-like não foi reintroduzida.',caveats:['Não equivale a ASRS, DIVA ou diagnóstico de TDAH.']};
}

// 3. Bateria bipolar: porta literalmente MDQ/HCL-32/BSDS/MINI da página clínica vigente.
function scoreBipolarV3_(r){
  if(r.length!==77) throw new Error('BIPOLAR_COUNT:'+r.length);
  let p=0;
  const mdqItems=r.slice(p,p+13);p+=13; const mdqSim=r[p++],mdqImp=r[p++];
  const mdqYes=mdqItems.filter(scYes_).length, simult=scYes_(mdqSim), imp=String(mdqImp.response||'').toLowerCase();
  const mdqMeets=mdqYes>=8 && simult && (imp.indexOf('moderado')>=0||imp.indexOf('grave')>=0);
  const hcl=r.slice(p,p+32);p+=32; const hclYes=hcl.filter(scYes_).length;
  const hclTier=hclYes>=19?'compatível':(hclYes>=14?'atenção':'baixo');
  const bs=r.slice(p,p+19);p+=19; const bsYes=bs.filter(scYes_).length; const fit=String(r[p++].response||'');
  const fitMap={'Tem tudo ou quase tudo (+6)':6,'Tem mais ou menos (+4)':4,'Tem pouco (+2)':2,'Nada (+0)':0};
  const bsTotal=bsYes+(fitMap[fit]||0),bsTier=bsTotal>=20?'provável':(bsTotal>=13?'possível':'improvável');
  const mini12=r.slice(p,p+2);p+=2, mini3=r.slice(p,p+7);p+=7, dur=String(r[p++].response||'');
  const gate=mini12.every(scYes_),d3=mini3.filter(scYes_).length,mania=gate&&d3>=3&&dur.indexOf('7')>=0,hypo=gate&&d3>=3&&!mania;
  return {sourceMode:'SOURCE_DERIVED_CURRENT',classification:(mdqMeets||(hclTier==='compatível')||(bsTier==='provável')||mania||hypo)?'Indicadores convergentes/atencionais':'Sem convergência robusta',subscales:[
    {title:'MDQ',rawScore:mdqYes,maxScore:13,classification:mdqMeets?'triagem positiva':(mdqYes>=7?'atenção':'abaixo do corte')},
    {title:'HCL-32',rawScore:hclYes,maxScore:32,classification:hclTier},
    {title:'BSDS',rawScore:bsTotal,maxScore:25,classification:bsTier},
    {title:'MINI módulo bipolar',rawScore:d3,maxScore:7,classification:!gate?'porta de entrada negativa':(mania?'compatível com mania em rastreio':(hypo?'compatível com hipomania em rastreio':'insuficiente'))}
  ],clinicalMeaning:'Bateria de triagem integrada; convergência aumenta prioridade de aprofundamento do curso temporal e diagnóstico diferencial.',caveats:['Não diagnostica transtorno bipolar isoladamente.']};
}

// 4. Borderline: regra proporcional v3 vigente; cortes são locais/orientativos, não psicométricos validados.
function scoreBorderlineV3_(r){
  if(r.length!==47) throw new Error('BORDERLINE_COUNT:'+r.length);
  const rev={4:1,10:1,16:1,30:1,36:1}; let sum=0;
  r.forEach(function(x,i){var v=scIdx_(x)+1; if(rev[i+1])v=5-v; sum+=v;});
  const min=47,max=188,cuts=[118,141,161,176];
  const cls=sum<=cuts[0]?'baixa':sum<=cuts[1]?'leve':sum<=cuts[2]?'moderada':sum<=cuts[3]?'elevada':'muito elevada';
  return {sourceMode:'SOURCE_DERIVED_PROVISIONAL',rawScore:sum,maxScore:max,normalizedScore:Math.round((sum-min)/(max-min)*100),classification:'Traços '+cls,subscales:[],clinicalMeaning:'Intensidade dimensional de traços na regra proporcional v3 do sistema.',caveats:['Os cortes proporcionais são orientativos/provisórios e dependem de validação; não equivalem a diagnóstico.'],riskFlags:[]};
}

// 5. Narcisismo: bateria local NPI/PID-5-BF/FFNI-SF/MINI; mantém faixas da fonte como triagem dimensional.
function scoreNarcisismoV3_(r){
  if(r.length!==112) throw new Error('NARC_COUNT:'+r.length); let p=0;
  const npi=r.slice(p,p+16);p+=16; const npiYes=npi.filter(scYes_).length,npiBand=npiYes>=13?'elevado':(npiYes>=6?'moderado':'baixo');
  const pid=r.slice(p,p+25);p+=25,pidVals=pid.map(function(x){return scNum_(x,0,3);}); const ant=[16,19,21,24,22].map(function(n){return pidVals[n-1];});
  const pidMean=scMean_(pidVals),antMean=scMean_(ant),band03=function(m){return m>=2.30?'elevado':(m>=2.00?'atencional':'baixo');};
  const ff=r.slice(p,p+60);p+=60,ffVals=ff.map(function(x){return scNum_(x,1,5);}); [19,27,38].forEach(function(n){ffVals[n-1]=6-ffVals[n-1];});
  const vul=[12,27,42,57,13,28,43,58,14,29,44,59].map(function(n){return n-1;}),vset={};vul.forEach(function(i){vset[i]=1;});
  const gra=ffVals.filter(function(_,i){return !vset[i];}),ffMean=scMean_(ffVals),vMean=scMean_(vul.map(function(i){return ffVals[i];})),gMean=scMean_(gra),band15=function(m){return m>=2.9?'elevado':(m>=2.2?'moderado':'baixo');};
  const mini=r.slice(p,p+11),yes=mini.slice(0,9).filter(scYes_).length,perv=scYes_(mini[9]),imp=scYes_(mini[10]);
  const miniClass=yes>=5&&perv&&imp?'alta probabilidade na triagem':(yes>=3?'traços clinicamente relevantes':'sem indicadores relevantes');
  return {sourceMode:'SOURCE_DERIVED_LOCAL_BATTERY',classification:(npiBand!=='baixo'||band03(pidMean)!=='baixo'||band15(ffMean)!=='baixo'||miniClass!=='sem indicadores relevantes')?'Indicadores dimensionais presentes':'Sem convergência robusta',subscales:[
    {title:'NPI-16 local',rawScore:npiYes,maxScore:16,classification:npiBand},
    {title:'PID-5-BF global',mean:scRound_(pidMean,2),classification:band03(pidMean)},{title:'PID-5-BF antagonismo',mean:scRound_(antMean,2),classification:band03(antMean)},
    {title:'FFNI-SF total',mean:scRound_(ffMean,2),classification:band15(ffMean)},{title:'FFNI-SF grandioso',mean:scRound_(gMean,2),classification:band15(gMean)},{title:'FFNI-SF vulnerável',mean:scRound_(vMean,2),classification:band15(vMean)},
    {title:'Critérios centrais autorreferidos',rawScore:yes,maxScore:9,classification:miniClass}
  ],clinicalMeaning:'Triagem dimensional integrada de grandiosidade, vulnerabilidade, antagonismo e impacto funcional.',caveats:['As faixas locais não substituem avaliação diagnóstica estruturada.']};
}

// 6. BIS-11: protocolo de 30 itens, reversões e fatores oficiais.
function scoreImpulsividadeV3_(r){
  if(r.length!==30) throw new Error('BIS_COUNT:'+r.length); const vals=r.map(function(x){return scIdx_(x)+1;});
  const rev={1:1,7:1,8:1,9:1,10:1,12:1,13:1,15:1,20:1,29:1,30:1}; Object.keys(rev).forEach(function(k){vals[k-1]=5-vals[k-1];});
  const sumItems=function(items){return items.reduce(function(a,n){return a+vals[n-1];},0);};
  const att=[6,5,9,11,20,24,26,28],motor=[2,3,4,16,17,19,21,22,23,25,30],non=[1,7,8,10,12,13,14,15,18,27,29];
  const total=vals.reduce(function(a,b){return a+b;},0);
  return {sourceMode:'STANDARD_BIS11',rawScore:total,maxScore:120,classification:'Escore dimensional',subscales:[{title:'Impulsividade atencional',rawScore:sumItems(att),maxScore:32},{title:'Impulsividade motora',rawScore:sumItems(motor),maxScore:44},{title:'Impulsividade por não planejamento',rawScore:sumItems(non),maxScore:44}],clinicalMeaning:'Quanto maior o escore, maior a impulsividade autorreferida; interpretar total e fatores em contexto.',caveats:['Sem percentis simulados e sem ponto de corte diagnóstico automático.']};
}

// 7. Esquemas: média por esquema e estilo de enfrentamento conforme fonte vigente.
function scoreEsquemasV3_(r){
  if(r.length!==108) throw new Error('SCHEMAS_COUNT:'+r.length);
  const rows=r.map(function(x){return {title:x.title,value:scIdx_(x)+1};});
  const config=JSON.parse(PropertiesService.getScriptProperties().getProperty('SCHEMAS_SCORING_CONFIG_JSON')||'null');
  if(!config||!Array.isArray(config.questions)||!Array.isArray(config.schemas)) throw new Error('SCHEMAS_CONFIG_NOT_CONFIGURED');
  const by={}; config.schemas.forEach(function(s){by[s.id]={title:s.nome||s.name||s.id,sum:0,count:0,styles:{resignado:0,evitativo:0,hipercompensador:0}};});
  config.questions.forEach(function(q,i){const e=by[q.schemaId];if(!e)return;const v=rows[i].value;e.sum+=v;e.count++;if(q.styleHint==='R')e.styles.resignado+=v;if(q.styleHint==='E')e.styles.evitativo+=v;if(q.styleHint==='H')e.styles.hipercompensador+=v;});
  const sub=Object.keys(by).map(function(k){const e=by[k],m=e.count?e.sum/e.count:0,status=m>=4?'ativo':m>=2.5?'latente':'ausente';let style='Não definido',mx=0;Object.keys(e.styles).forEach(function(s){if(e.styles[s]>mx){mx=e.styles[s];style=s;}});return {title:e.title,mean:scRound_(m,2),classification:status,copingStyle:style};});
  return {sourceMode:'SOURCE_DERIVED_CURRENT_CONFIGURED',classification:'Perfil de esquemas',subscales:sub,clinicalMeaning:'Esquemas são classificados pela média atual: ativo ≥4, latente ≥2,5, ausente abaixo disso.',caveats:['Configuração item→esquema é versionada separadamente.']};
}

// 8. Modos: mapeamento vigente SMI 124.
function scoreModosV3_(r){
  if(r.length!==124) throw new Error('MODES_COUNT:'+r.length); const v=r.map(function(x){return scNum_(x,1,6);});
  const map={
    'Criança Vulnerável':[4,6,36,50,67,71,105,106,111,119],'Criança Zangada':[22,42,47,49,56,63,76,79,103,109],
    'Criança Raivosa':[14,25,26,46,54,60,92,98,101,123],'Criança Impulsiva':[12,15,35,40,66,69,78,97,110],
    'Criança Indisciplinada':[13,21,30,65,70,107],'Criança Feliz':[2,17,19,48,61,68,95,96,113,122],
    'Capitulador Complacente':[8,18,37,38,55,100,108],'Protetor Desligado':[28,33,34,39,43,59,64,75,88],
    'Auto-confortador Desligado':[41,52,57,86],'Autoengrandece':[10,11,27,31,44,74,81,89,91,114],
    'Intimidação e Ataque':[1,24,32,53,77,93,99,102,112],'Pais Punitivos':[3,5,9,16,58,72,84,87,94,118],
    'Pais Exigentes/Críticos':[7,23,45,51,82,83,90,104,115,116],'Adulto Saudável':[20,29,62,73,80,85,117,120,121,124]
  };
  const healthy={'Criança Feliz':1,'Adulto Saudável':1};
  const sub=Object.keys(map).map(function(name){const items=map[name],total=items.reduce(function(a,n){return a+v[n-1];},0),pct=Math.round(total/(items.length*6)*100);const cls=healthy[name]?(pct>=67?'desenvolvido':pct>=34?'moderado':'pouco desenvolvido'):(pct<34?'leve':pct<67?'moderado':'grave');return {title:name,percent:pct,classification:cls};});
  return {sourceMode:'SOURCE_DERIVED_CURRENT',classification:'Perfil de modos',subscales:sub,clinicalMeaning:'Percentual por modo conforme mapeamento vigente do SMI na página clínica.',caveats:['Interpretar modos disfuncionais e modos saudáveis em sentidos clínicos distintos.']};
}

// 9. Necessidades: 9 domínios x 4, inversões alternadas conforme definição vigente.
function scoreNecessidadesV3_(r){
  if(r.length!==36) throw new Error('NEEDS_COUNT:'+r.length); const names=['Segurança e Estabilidade','Afeto e Conexão','Validação','Autonomia','Propósito e Direção','Apoio e Suporte','Expressão e Comunicação','Novidade e Desafios','Crescimento e Desenvolvimento'];
  const sub=[]; for(var d=0;d<9;d++){let vals=[];for(var j=0;j<4;j++){var x=scIdx_(r[d*4+j])+1; if(j===1||j===3)x=6-x;vals.push(x);}var score=vals.reduce(function(a,b){return a+b;},0),cls=score<=8?'necessidade muito fragilizada':score<=13?'parcialmente fragilizada':score<=17?'moderadamente atendida':'bem atendida';sub.push({title:names[d],rawScore:score,maxScore:20,classification:cls});}
  return {sourceMode:'SOURCE_DERIVED_CURRENT',classification:'Perfil de necessidades',subscales:sub,clinicalMeaning:'Quanto menor o domínio, maior a prioridade clínica potencial de investigação daquela necessidade.',caveats:['Associações desenvolvimentais são hipóteses clínicas, não conclusões automáticas.']};
}

// 10. Codependência: scorer legado foi descartado; apenas dois blocos descritivos 1–5.
function scoreCodependenciaV3_(r){
  if(r.length!==40) throw new Error('CODEP_COUNT:'+r.length); const v=r.map(function(x){return scIdx_(x)+1;});
  return {sourceMode:'DESCRIPTIVE_ONLY',classification:'Sem ponto de corte validado no sistema atual',subscales:[scDescriptive_('Autonomia e segurança nos vínculos',v.slice(0,20),5),scDescriptive_('Limites, cuidado e reciprocidade',v.slice(20),5)],clinicalMeaning:'Escores descritivos dos dois blocos; maior concordância sinaliza maior concentração dos padrões perguntados.',caveats:['O scoring legado foi deliberadamente removido e não foi restaurado.']};
}

// 11. ICAPS: 6 dimensões x 10, normalização 0–100; faixas operacionais descritivas.
function scoreIcapsV3_(r){
  if(r.length!==60) throw new Error('ICAPS_COUNT:'+r.length); const names=['Satisfação Conjugal Atual','Ambivalência Decisional','Codependência e Subjugação Pessoal','Traição e Impacto Emocional','Rede de Apoio e Medos Contextuais','Recursos Internos e Prontidão para a Mudança'];
  const bands=[['Muito baixa','Baixa','Intermediária','Elevada'],['Baixa','Baixa a moderada','Intermediária','Elevada'],['Poucos indicadores','Alguns indicadores','Faixa intermediária','Muitos indicadores'],['Reduzido','Leve a moderado','Intermediário','Elevado'],['Baixa interferência','Baixa a moderada','Intermediária','Elevada'],['Frágeis','Emergentes','Intermediários','Elevados']];
  const sub=[];for(var d=0;d<6;d++){const vals=r.slice(d*10,d*10+10).map(function(x){return scIdx_(x)*25;});const score=Math.round(scMean_(vals)),bi=score<=24?0:score<=49?1:score<=74?2:3;sub.push({title:names[d],rawScore:score,maxScore:100,classification:bands[d][bi]});}
  return {sourceMode:'SOURCE_DERIVED_CURRENT',classification:'Perfil dimensional ICAPS',subscales:sub,clinicalMeaning:'Seis dimensões normalizadas de 0–100 com faixas operacionais descritivas.',caveats:['As faixas não são pontos de corte psicométricos validados e não determinam decisão conjugal.']};
}

// 12. BDI-II: 21 grupos; 0–3. Sono/apetite têm duas direções para intensidades 1–3.
function scoreBdi2V3_(r){
  if(r.length!==21) throw new Error('BDI_COUNT:'+r.length); let total=0,suicide=0;
  r.forEach(function(x,i){let idx=scIdx_(x),s=(i===15||i===17)?([0,1,1,2,2,3,3][idx]):idx;if(s<0||s>3)throw new Error('BDI_SCORE_INVALID');total+=s;if(i===8)suicide=s;});
  const cls=total<=13?'mínimo':total<=19?'leve':total<=28?'moderado':'grave'; const flags=[];if(suicide>0)flags.push('SUICIDE_ITEM_ENDORSED');if(suicide>=2)flags.push('SUICIDE_ITEM_HIGH');
  return {sourceMode:'STANDARD_BDI2',rawScore:total,maxScore:63,classification:cls,subscales:[],clinicalMeaning:'Intensidade global de sintomas depressivos no BDI-II.',riskFlags:flags,caveats:['Resultado deve ser integrado à entrevista clínica; item de suicídio requer avaliação contextual imediata quando endossado.']};
}

// 13. HAM-A adaptada em autorrelato: 14 itens 0–4, total 0–56.
function scoreHamaV3_(r){
  if(r.length!==14) throw new Error('HAMA_COUNT:'+r.length);const vals=r.map(function(x){return scIdx_(x);}),total=vals.reduce(function(a,b){return a+b;},0);const cls=total<=17?'leve':total<=24?'leve a moderada':total<=30?'moderada a grave':'grave';
  return {sourceMode:'STANDARD_HAMA_ADAPTED_SELF_REPORT',rawScore:total,maxScore:56,classification:cls,subscales:[],clinicalMeaning:'Intensidade de sintomas ansiosos na estrutura HAM-A.',caveats:['A HAM-A original é clinician-rated; esta aplicação funciona como adaptação de autorrelato/monitoramento.']};
}

// 14. Rosenberg: versão brasileira, positivos 1,3,4,7,10; negativos 2,5,6,8,9; escore 0–30.
function scoreRosenbergV3_(r){
  if(r.length!==10) throw new Error('RSES_COUNT:'+r.length);const neg={2:1,5:1,6:1,8:1,9:1};let total=0;r.forEach(function(x,i){var idx=scIdx_(x);total+=neg[i+1]?idx:(3-idx);});
  return {sourceMode:'STANDARD_RSES_BR',rawScore:total,maxScore:30,normalizedScore:scRound_(100*total/30,1),classification:'Escore contínuo',subscales:[],clinicalMeaning:'Quanto maior o escore, maior a autoestima global autorreferida.',caveats:['Sem ponto de corte clínico oficial; priorizar comparação longitudinal e contexto.']};
}

// 15. EIR-RS: pesos, inversões, proration e overrides exatamente da fonte vigente.
function scoreRiscoV3_(r){
  if(r.length!==18) throw new Error('RISK_COUNT:'+r.length); const ids=['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','D1','D2','D3','E1','E2','E3','F1','F2'],critical={A3:1,B3:1,B4:1,C2:1,D3:1},invert={F1:1,F2:1};
  const resp={};r.forEach(function(x,i){resp[ids[i]]=scNum_(x,0,4);});let weighted=0,weight=0;ids.forEach(function(id){var v=resp[id];if(invert[id])v=4-v;var w=critical[id]?1.5:1;weighted+=v*w;weight+=w;});
  let ir=Math.round(weighted*10)/10;const thresholds=[[0,9,'Sem risco'],[10,22,'Risco mínimo'],[23,42,'Risco moderado'],[43,Infinity,'Risco grave']];let cls=scBand_(ir,thresholds);const anyCrit4=Object.keys(critical).some(function(k){return resp[k]===4;}),d2=resp.D2>=3,c1b3=resp.C1>=3&&resp.B3>=2,flags=[];
  if(anyCrit4){cls='Risco grave';flags.push('CRITICAL_ITEM_4');}if(d2){cls='Risco grave';flags.push('RECENT_ATTEMPT_D2_HIGH');}if(c1b3){const order=['Sem risco','Risco mínimo','Risco moderado','Risco grave'];cls=order[Math.min(order.indexOf(cls)+1,3)];flags.push('MEANS_PLUS_PLAN');}
  if(cls==='Risco moderado'||cls==='Risco grave')flags.push('CLINICAL_ALERT_REQUIRED');
  return {sourceMode:'SOURCE_DERIVED_CURRENT_HIGH_STAKES',rawScore:ir,maxScore:82,classification:cls,subscales:[],clinicalMeaning:'Índice integrado de risco com ponderação de itens críticos e regras automáticas de elevação.',riskFlags:flags,caveats:['Risco suicida exige avaliação clínica contextual; qualquer sinal de iminência prevalece sobre o escore.']};
}
