/**
 * ScreeningBackendV31.bundle.gs
 * ARQUIVO GERADO. Não editar manualmente.
 * Bundle único do backend clínico dos 15 rastreios.
 */

/* ===== ScreeningBridgeV3.gs ===== */
/**
 * ScreeningBridgeV3.gs
 * Ponte única e ordenada para os 15 rastreios clínicos.
 * A persistência no Google Forms ocorre antes de scoring, relatório ou integrações.
 */
const SCREENING_BRIDGE = Object.freeze({
  VERSION: 'screening-bridge-v3.1',
  MESSAGE_TYPE: 'RM_SCREENING_SUBMIT_RESULT',
  CACHE_TTL_SECONDS: 21600,
  MIN_FILL_MS: 1500,
  INSTRUMENTS: Object.freeze({
    geral:{formProperty:'FORM_ID_GERAL'},tdah:{formProperty:'FORM_ID_TDAH'},bipolar:{formProperty:'FORM_ID_BIPOLAR'},
    borderline:{formProperty:'FORM_ID_BORDERLINE'},narcisismo:{formProperty:'FORM_ID_NARCISISMO'},impulsividade:{formProperty:'FORM_ID_IMPULSIVIDADE'},
    esquemas:{formProperty:'FORM_ID_ESQUEMAS'},modos:{formProperty:'FORM_ID_MODOS'},necessidades:{formProperty:'FORM_ID_NECESSIDADES'},
    codependencia:{formProperty:'FORM_ID_CODEPENDENCIA'},icaps:{formProperty:'FORM_ID_ICAPS'},humor:{formProperty:'FORM_ID_HUMOR'},
    ansiedade:{formProperty:'FORM_ID_ANSIEDADE'},autoestima:{formProperty:'FORM_ID_AUTOESTIMA'},risco:{formProperty:'FORM_ID_RISCO'}
  })
});

const SCREENING_IDENTITY_TITLES = Object.freeze({
  'Nome completo':'name',
  'Data de nascimento':'birthDate',
  'Data de aplicação do rastreio':'applicationDate',
  // Compatibilidade com o ICAPS canônico criado antes do contrato v3.1.
  // Estes campos são metadados auxiliares e nunca entram no vetor clínico.
  'Código do paciente (se informado pelo psicólogo)':'patientCode',
  'Idade':'age'
});

function doGet() {
  const props=PropertiesService.getScriptProperties();
  const configured={};
  Object.keys(SCREENING_BRIDGE.INSTRUMENTS).forEach(function(id){
    configured[id]=Boolean(props.getProperty(SCREENING_BRIDGE.INSTRUMENTS[id].formProperty));
  });
  return screeningBridgeHtml_({ok:true,health:true,version:SCREENING_BRIDGE.VERSION,configured:configured});
}

function doPost(e) {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000)) return screeningBridgeHtml_({ok:false,code:'BUSY',message:'Canal temporariamente ocupado.'});
  try {
    const raw=e&&e.parameter?e.parameter.payload:'';
    if(!raw) throw new Error('PAYLOAD_MISSING');
    let payload;
    try { payload=JSON.parse(raw); } catch (_) { throw new Error('PAYLOAD_INVALID'); }
    validateScreeningEnvelope_(payload);

    const cache=CacheService.getScriptCache();
    const cacheKey='screening:'+payload.instrumentId+':'+payload.submissionId;
    if(cache.get(cacheKey)) return screeningBridgeHtml_({ok:true,duplicate:true,submissionId:payload.submissionId,instrumentId:payload.instrumentId});

    const instrument=SCREENING_BRIDGE.INSTRUMENTS[payload.instrumentId];
    const formId=PropertiesService.getScriptProperties().getProperty(instrument.formProperty);
    if(!formId) throw new Error('FORM_ID_NOT_CONFIGURED:'+payload.instrumentId);

    const form=FormApp.openById(formId);
    const contract=buildScreeningOrderedContract_(form);
    validateScreeningOrderedPayload_(payload,contract);
    const records=screeningScoringRecordsOrdered_(contract.clinical,payload.responses);

    const formResponse=form.createResponse();
    appendScreeningIdentityResponses_(formResponse,contract.identity,payload.identity);
    contract.clinical.forEach(function(entry,i){
      const value=payload.responses[i];
      if(screeningBlank_(value)) return;
      const itemResponse=createScreeningItemResponse_(entry.item,entry.type,value);
      if(itemResponse) formResponse.withItemResponse(itemResponse);
    });

    // Gate primário: a resposta fica persistida antes de qualquer processamento secundário.
    const submittedResponse=formResponse.submit();
    cache.put(cacheKey,'1',SCREENING_BRIDGE.CACHE_TTL_SECONDS);

    let processing='complete';
    try {
      const responseId=String((submittedResponse&&submittedResponse.getId&&submittedResponse.getId())||payload.submissionId);
      runScreeningPostProcessingV3_({form:form,payload:payload,formResponseId:responseId,records:records});
    } catch (postErr) {
      processing='pending';
      console.error('ScreeningPostProcess:'+screeningSafePostProcessError_(postErr));
    }

    return screeningBridgeHtml_({ok:true,submissionId:payload.submissionId,instrumentId:payload.instrumentId,processing:processing});
  } catch (err) {
    console.error('ScreeningBridge:'+screeningSafeError_(err));
    return screeningBridgeHtml_({ok:false,code:screeningSafeCode_(err),message:'Não foi possível confirmar o registro. As respostas permanecem na página para nova tentativa.'});
  } finally {
    lock.releaseLock();
  }
}

function validateScreeningEnvelope_(payload) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload)) throw new Error('ENVELOPE_INVALID');
  if(payload.version!==SCREENING_BRIDGE.VERSION) throw new Error('VERSION_UNSUPPORTED');
  if(!Object.prototype.hasOwnProperty.call(SCREENING_BRIDGE.INSTRUMENTS,payload.instrumentId)) throw new Error('INSTRUMENT_NOT_ALLOWED');
  if(!payload.submissionId||String(payload.submissionId).length>120) throw new Error('SUBMISSION_ID_INVALID');
  if(!payload.identity||typeof payload.identity!=='object'||Array.isArray(payload.identity)) throw new Error('IDENTITY_INVALID');
  if(!Array.isArray(payload.responses)) throw new Error('RESPONSES_INVALID');
  const startedAt=Number(payload.startedAt||0),submittedAt=Number(payload.submittedAt||0);
  if(!startedAt||!submittedAt||submittedAt-startedAt<SCREENING_BRIDGE.MIN_FILL_MS) throw new Error('SUBMISSION_TOO_FAST');
}

function buildScreeningOrderedContract_(form) {
  const identity={},clinical=[];
  form.getItems().forEach(function(item){
    const type=item.getType();
    if(!screeningAnswerableType_(type)) return;
    const title=String(item.getTitle()||'').trim();
    const key=SCREENING_IDENTITY_TITLES[title];
    const entry={item:item,type:type,title:title};
    if(key) {
      if(identity[key]) throw new Error('DUPLICATE_IDENTITY_ITEM:'+key);
      identity[key]=entry;
    } else {
      clinical.push(entry);
    }
  });
  if(!identity.name) throw new Error('FORM_IDENTITY_CONTRACT_INVALID');
  return {identity:identity,clinical:clinical};
}

function validateScreeningOrderedPayload_(payload,contract) {
  if(payload.responses.length!==contract.clinical.length) throw new Error('RESPONSE_COUNT_MISMATCH:'+payload.responses.length+':'+contract.clinical.length);
  const identity=payload.identity||{};
  ['name','birthDate','applicationDate'].forEach(function(key){
    const entry=contract.identity[key];
    if(entry&&screeningItemRequired_(entry.item,entry.type)&&screeningBlank_(identity[key])) throw new Error('REQUIRED_IDENTITY_MISSING:'+key);
  });
  contract.clinical.forEach(function(entry,i){
    if(screeningItemRequired_(entry.item,entry.type)&&screeningBlank_(payload.responses[i])) throw new Error('REQUIRED_ANSWER_MISSING:'+String(i+1));
  });
}

function appendScreeningIdentityResponses_(formResponse,identityContract,identity) {
  ['name','birthDate','applicationDate'].forEach(function(key){
    const entry=identityContract[key],value=identity&&identity[key];
    if(!entry||screeningBlank_(value)) return;
    const itemResponse=createScreeningItemResponse_(entry.item,entry.type,value);
    if(itemResponse) formResponse.withItemResponse(itemResponse);
  });
}

function screeningAnswerableType_(type) {
  return [FormApp.ItemType.TEXT,FormApp.ItemType.PARAGRAPH_TEXT,FormApp.ItemType.MULTIPLE_CHOICE,FormApp.ItemType.CHECKBOX,FormApp.ItemType.SCALE,FormApp.ItemType.LIST,FormApp.ItemType.DATE,FormApp.ItemType.TIME,FormApp.ItemType.DURATION,FormApp.ItemType.GRID,FormApp.ItemType.CHECKBOX_GRID].indexOf(type)>=0;
}

function screeningItemRequired_(item,type) {
  try {
    switch(type) {
      case FormApp.ItemType.TEXT:return item.asTextItem().isRequired();
      case FormApp.ItemType.PARAGRAPH_TEXT:return item.asParagraphTextItem().isRequired();
      case FormApp.ItemType.MULTIPLE_CHOICE:return item.asMultipleChoiceItem().isRequired();
      case FormApp.ItemType.CHECKBOX:return item.asCheckboxItem().isRequired();
      case FormApp.ItemType.SCALE:return item.asScaleItem().isRequired();
      case FormApp.ItemType.LIST:return item.asListItem().isRequired();
      case FormApp.ItemType.DATE:return item.asDateItem().isRequired();
      case FormApp.ItemType.TIME:return item.asTimeItem().isRequired();
      case FormApp.ItemType.DURATION:return item.asDurationItem().isRequired();
      case FormApp.ItemType.GRID:return item.asGridItem().isRequired();
      case FormApp.ItemType.CHECKBOX_GRID:return item.asCheckboxGridItem().isRequired();
      default:return false;
    }
  } catch (_) { return false; }
}

function createScreeningItemResponse_(item,type,rawValue) {
  switch(type) {
    case FormApp.ItemType.TEXT:return item.asTextItem().createResponse(String(rawValue));
    case FormApp.ItemType.PARAGRAPH_TEXT:return item.asParagraphTextItem().createResponse(String(rawValue));
    case FormApp.ItemType.MULTIPLE_CHOICE:return item.asMultipleChoiceItem().createResponse(String(rawValue));
    case FormApp.ItemType.CHECKBOX:return item.asCheckboxItem().createResponse(Array.isArray(rawValue)?rawValue.map(String):[String(rawValue)]);
    case FormApp.ItemType.SCALE:return item.asScaleItem().createResponse(Number(rawValue));
    case FormApp.ItemType.LIST:return item.asListItem().createResponse(String(rawValue));
    case FormApp.ItemType.DATE:return item.asDateItem().createResponse(new Date(String(rawValue)+'T12:00:00'));
    case FormApp.ItemType.TIME:{const p=String(rawValue).split(':');return item.asTimeItem().createResponse(Number(p[0]||0),Number(p[1]||0));}
    case FormApp.ItemType.DURATION:{const d=String(rawValue).split(':').map(Number);return item.asDurationItem().createResponse(d[0]||0,d[1]||0,d[2]||0);}
    case FormApp.ItemType.GRID:return item.asGridItem().createResponse(Array.isArray(rawValue)?rawValue.map(String):[]);
    case FormApp.ItemType.CHECKBOX_GRID:return item.asCheckboxGridItem().createResponse(Array.isArray(rawValue)?rawValue:[]);
    default:return null;
  }
}

function screeningBlank_(value) {
  if(value===null||typeof value==='undefined') return true;
  if(Array.isArray(value)) return value.length===0||value.every(function(v){return String(v).trim()==='';});
  return String(value).trim()==='';
}

function screeningSafeCode_(err) {
  const msg=err&&err.message?String(err.message):'';
  return String(msg.split(':')[0]||'TECHNICAL_ERROR').slice(0,80);
}
function screeningSafeError_(err) { return err&&err.message?String(err.message).slice(0,180):'technical_error'; }
function screeningBridgeHtml_(data) {
  const message=Object.assign({type:SCREENING_BRIDGE.MESSAGE_TYPE},data||{});
  const json=JSON.stringify(message).replace(/</g,'\\u003c');
  const html='<!doctype html><html><head><meta charset="utf-8"></head><body><script>try{parent.postMessage('+json+',"*");}catch(e){}</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ===== ScreeningOrderedRecordsV31.gs ===== */
/** Records de scoring pelo índice canônico da pergunta, não pelo título. */
function screeningScoringRecordsOrdered_(clinicalEntries,responses) {
  if(!Array.isArray(clinicalEntries)||!Array.isArray(responses)||clinicalEntries.length!==responses.length) throw new Error('SCORING_RECORD_COUNT_MISMATCH');
  return clinicalEntries.map(function(entry,i){
    const item=entry.item,type=entry.type,response=responses[i];
    let choices=[];
    try {
      if(type===FormApp.ItemType.MULTIPLE_CHOICE) choices=item.asMultipleChoiceItem().getChoices().map(function(c){return c.getValue();});
      else if(type===FormApp.ItemType.LIST) choices=item.asListItem().getChoices().map(function(c){return c.getValue();});
    } catch (_) {}
    const usable=choices.filter(function(c){return !/^selecione(?:\.\.\.)?$/i.test(String(c).trim());});
    return {
      title:String(entry.title||item.getTitle()||'').trim(),
      response:response,
      choiceIndex:usable.indexOf(String(response)),
      choices:usable,
      identity:false,
      order:i+1
    };
  });
}

/* ===== ScreeningScoringConfigV3.gs ===== */
/** Generated from canonical Esquemas source. Do not hand-edit. */
const SCREENING_SCHEMAS_CONFIG_V3 = Object.freeze({"schemas":[{"id":"PE","nome":"PE"},{"id":"AB","nome":"AB"},{"id":"DA","nome":"DA"},{"id":"SI","nome":"SI"},{"id":"DI","nome":"DI"},{"id":"FD","nome":"FD"},{"id":"DIIN","nome":"DIIN"},{"id":"VV","nome":"VV"},{"id":"EM","nome":"EM"},{"id":"SB","nome":"SB"},{"id":"SA","nome":"SA"},{"id":"AP","nome":"AP"},{"id":"EC","nome":"EC"},{"id":"AI","nome":"AI"},{"id":"NP","nome":"NP"},{"id":"IE","nome":"IE"},{"id":"PC","nome":"PC"},{"id":"PCO","nome":"PCO"}],"questions":[{"schemaId":"PE","styleHint":"R"},{"schemaId":"PE","styleHint":"R"},{"schemaId":"PE","styleHint":"E"},{"schemaId":"PE","styleHint":"E"},{"schemaId":"PE","styleHint":"H"},{"schemaId":"PE","styleHint":"H"},{"schemaId":"AB","styleHint":"R"},{"schemaId":"AB","styleHint":"R"},{"schemaId":"AB","styleHint":"E"},{"schemaId":"AB","styleHint":"E"},{"schemaId":"AB","styleHint":"H"},{"schemaId":"AB","styleHint":"H"},{"schemaId":"DA","styleHint":"R"},{"schemaId":"DA","styleHint":"R"},{"schemaId":"DA","styleHint":"E"},{"schemaId":"DA","styleHint":"E"},{"schemaId":"DA","styleHint":"H"},{"schemaId":"DA","styleHint":"H"},{"schemaId":"SI","styleHint":"R"},{"schemaId":"SI","styleHint":"R"},{"schemaId":"SI","styleHint":"E"},{"schemaId":"SI","styleHint":"E"},{"schemaId":"SI","styleHint":"H"},{"schemaId":"SI","styleHint":"H"},{"schemaId":"DI","styleHint":"R"},{"schemaId":"DI","styleHint":"R"},{"schemaId":"DI","styleHint":"E"},{"schemaId":"DI","styleHint":"E"},{"schemaId":"DI","styleHint":"H"},{"schemaId":"DI","styleHint":"H"},{"schemaId":"FD","styleHint":"R"},{"schemaId":"FD","styleHint":"R"},{"schemaId":"FD","styleHint":"E"},{"schemaId":"FD","styleHint":"E"},{"schemaId":"FD","styleHint":"H"},{"schemaId":"FD","styleHint":"H"},{"schemaId":"DIIN","styleHint":"R"},{"schemaId":"DIIN","styleHint":"R"},{"schemaId":"DIIN","styleHint":"E"},{"schemaId":"DIIN","styleHint":"E"},{"schemaId":"DIIN","styleHint":"H"},{"schemaId":"DIIN","styleHint":"H"},{"schemaId":"VV","styleHint":"R"},{"schemaId":"VV","styleHint":"R"},{"schemaId":"VV","styleHint":"E"},{"schemaId":"VV","styleHint":"E"},{"schemaId":"VV","styleHint":"H"},{"schemaId":"VV","styleHint":"H"},{"schemaId":"EM","styleHint":"R"},{"schemaId":"EM","styleHint":"R"},{"schemaId":"EM","styleHint":"E"},{"schemaId":"EM","styleHint":"E"},{"schemaId":"EM","styleHint":"H"},{"schemaId":"EM","styleHint":"H"},{"schemaId":"SB","styleHint":"R"},{"schemaId":"SB","styleHint":"R"},{"schemaId":"SB","styleHint":"E"},{"schemaId":"SB","styleHint":"E"},{"schemaId":"SB","styleHint":"H"},{"schemaId":"SB","styleHint":"H"},{"schemaId":"SA","styleHint":"R"},{"schemaId":"SA","styleHint":"R"},{"schemaId":"SA","styleHint":"E"},{"schemaId":"SA","styleHint":"E"},{"schemaId":"SA","styleHint":"H"},{"schemaId":"SA","styleHint":"H"},{"schemaId":"AP","styleHint":"R"},{"schemaId":"AP","styleHint":"R"},{"schemaId":"AP","styleHint":"E"},{"schemaId":"AP","styleHint":"E"},{"schemaId":"AP","styleHint":"H"},{"schemaId":"AP","styleHint":"H"},{"schemaId":"EC","styleHint":"R"},{"schemaId":"EC","styleHint":"R"},{"schemaId":"EC","styleHint":"E"},{"schemaId":"EC","styleHint":"E"},{"schemaId":"EC","styleHint":"H"},{"schemaId":"EC","styleHint":"H"},{"schemaId":"AI","styleHint":"R"},{"schemaId":"AI","styleHint":"R"},{"schemaId":"AI","styleHint":"E"},{"schemaId":"AI","styleHint":"E"},{"schemaId":"AI","styleHint":"H"},{"schemaId":"AI","styleHint":"H"},{"schemaId":"NP","styleHint":"R"},{"schemaId":"NP","styleHint":"R"},{"schemaId":"NP","styleHint":"E"},{"schemaId":"NP","styleHint":"E"},{"schemaId":"NP","styleHint":"H"},{"schemaId":"NP","styleHint":"H"},{"schemaId":"IE","styleHint":"R"},{"schemaId":"IE","styleHint":"R"},{"schemaId":"IE","styleHint":"E"},{"schemaId":"IE","styleHint":"E"},{"schemaId":"IE","styleHint":"H"},{"schemaId":"IE","styleHint":"H"},{"schemaId":"PC","styleHint":"R"},{"schemaId":"PC","styleHint":"R"},{"schemaId":"PC","styleHint":"E"},{"schemaId":"PC","styleHint":"E"},{"schemaId":"PC","styleHint":"H"},{"schemaId":"PC","styleHint":"H"},{"schemaId":"PCO","styleHint":"R"},{"schemaId":"PCO","styleHint":"R"},{"schemaId":"PCO","styleHint":"E"},{"schemaId":"PCO","styleHint":"E"},{"schemaId":"PCO","styleHint":"H"},{"schemaId":"PCO","styleHint":"H"}]});

/* ===== ScreeningScoringV3.gs ===== */
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
  const config=SCREENING_SCHEMAS_CONFIG_V3;
  if(!config||!Array.isArray(config.questions)||!Array.isArray(config.schemas)) throw new Error('SCHEMAS_CONFIG_NOT_COMPILED');
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
  if(['A1','A2','A3','A4'].some(function(k){return resp[k]>=1;}))flags.push('SUICIDAL_IDEATION_PRESENT');
  if(cls==='Risco moderado'||cls==='Risco grave')flags.push('CLINICAL_ALERT_REQUIRED');
  return {sourceMode:'SOURCE_DERIVED_CURRENT_HIGH_STAKES',rawScore:ir,maxScore:82,classification:cls,subscales:[],clinicalMeaning:'Índice integrado de risco com ponderação de itens críticos e regras automáticas de elevação.',riskFlags:flags,caveats:['Risco suicida exige avaliação clínica contextual; qualquer sinal de iminência prevalece sobre o escore.']};
}

/* ===== ScreeningReportV3.gs ===== */
/**
 * ScreeningReportV3.gs
 * Renderizador de relatório clínico a partir de um resultado JÁ calculado/validado.
 * Este módulo não calcula escores. Ele apenas transforma o objeto normalizado
 * produzido pelo scoring engine em HTML seguro para envio ao psicólogo.
 */

function buildScreeningClinicalReport_(data) {
  validateScreeningReportInput_(data);

  const patient = data.patient || {};
  const result = data.result || {};
  const instrument = data.instrument || {};
  const applicationDate = String(data.applicationDate || '').trim();
  const generatedAt = String(data.generatedAt || new Date().toISOString());

  const sections = [];
  sections.push(reportSection_('Identificação', [
    reportRow_('Paciente', patient.name || '—'),
    reportRow_('Data de nascimento', patient.birthDate || '—'),
    reportRow_('Instrumento', instrument.name || instrument.id),
    reportRow_('Data de aplicação', applicationDate || '—'),
    reportRow_('Versão/contrato', instrument.version || 'vigente')
  ].join('')));

  sections.push(reportSection_('Completude e validade técnica', [
    reportRow_('Status', result.valid === false ? 'Inválido / incompleto' : 'Válido para interpretação'),
    reportRow_('Itens respondidos', reportCount_(result.answeredCount, result.totalCount)),
    result.missingCount != null ? reportRow_('Itens ausentes', result.missingCount) : '',
    result.validityNote ? reportParagraph_(result.validityNote) : ''
  ].join('')));

  sections.push(reportSection_('Resultado geral', [
    result.rawScore != null ? reportRow_('Escore bruto', result.rawScore) : '',
    result.normalizedScore != null ? reportRow_('Escore normalizado', result.normalizedScore) : '',
    result.classification ? reportRow_('Classificação orientativa', result.classification) : '',
    result.summary ? reportParagraph_(result.summary) : ''
  ].join('')));

  if (Array.isArray(result.subscales) && result.subscales.length) {
    sections.push(reportSection_('Subescalas / domínios', reportTable_(
      ['Domínio', 'Resultado', 'Classificação'],
      result.subscales.map(function(x) {
        return [x.name || '—', x.score != null ? x.score : '—', x.classification || '—'];
      })
    )));
  }

  if (Array.isArray(result.indicators) && result.indicators.length) {
    sections.push(reportSection_('Indicadores clinicamente relevantes', reportList_(result.indicators)));
  }

  if (Array.isArray(result.noteworthyResponses) && result.noteworthyResponses.length) {
    sections.push(reportSection_('Respostas que merecem integração clínica', reportList_(
      result.noteworthyResponses.map(function(x) {
        if (typeof x === 'string') return x;
        const label = x.label || x.item || 'Item';
        const value = x.value != null ? ': ' + String(x.value) : '';
        const note = x.note ? ' — ' + x.note : '';
        return label + value + note;
      })
    )));
  }

  if (result.clinicalMeaning) {
    sections.push(reportSection_('Significado clínico', reportParagraph_(result.clinicalMeaning)));
  }
  if (result.integration) {
    sections.push(reportSection_('Integração clínica', reportParagraph_(result.integration)));
  }
  if (Array.isArray(result.recommendations) && result.recommendations.length) {
    sections.push(reportSection_('Recomendações', reportList_(result.recommendations)));
  }

  const limitations = Array.isArray(result.limitations) ? result.limitations.slice() : [];
  limitations.unshift('Instrumentos de rastreio e monitoramento não estabelecem diagnóstico isoladamente; os achados devem ser integrados à entrevista, história clínica e contexto atual.');
  sections.push(reportSection_('Limitações', reportList_(limitations)));

  sections.push(reportSection_('Detalhes técnicos', [
    reportRow_('Submission ID', data.submissionId),
    reportRow_('Contrato de scoring', result.scoringContract || '—'),
    reportRow_('Gerado em', generatedAt),
    result.technicalNote ? reportParagraph_(result.technicalNote) : ''
  ].join('')));

  const patientName = String(patient.name || 'Paciente').trim();
  const instrumentName = String(instrument.shortName || instrument.name || instrument.id).trim();
  const dateForSubject = applicationDate || generatedAt.slice(0, 10);
  const subject = [result.urgent === true ? 'ALERTA CLÍNICO' : 'RASTREIO', instrumentName, patientName, dateForSubject].join(' · ').slice(0, 240);

  const html = '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>' + screeningReportCss_() + '</style></head><body>' +
    '<main class="report"><header><div class="eyebrow">Richelmy Murta · Psicologia Clínica</div>' +
    '<h1>Relatório clínico de rastreio</h1><p>' + reportEscape_(instrument.name || instrument.id) + '</p></header>' +
    sections.join('') +
    '<footer>Documento de apoio à avaliação clínica. Uso profissional e confidencial.</footer>' +
    '</main></body></html>';

  const plainText = [
    'RELATÓRIO CLÍNICO DE RASTREIO',
    'Paciente: ' + patientName,
    'Instrumento: ' + instrumentName,
    'Data: ' + dateForSubject,
    result.classification ? 'Classificação orientativa: ' + result.classification : '',
    'Este rastreio não estabelece diagnóstico isoladamente.'
  ].filter(Boolean).join('\n');

  return { subject: subject, html: html, plainText: plainText };
}

function validateScreeningReportInput_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('REPORT_INPUT_INVALID');
  if (!data.submissionId) throw new Error('REPORT_SUBMISSION_ID_REQUIRED');
  if (!data.instrument || !data.instrument.id) throw new Error('REPORT_INSTRUMENT_REQUIRED');
  if (!data.result || typeof data.result !== 'object') throw new Error('REPORT_RESULT_REQUIRED');
  if (!data.patient || !data.patient.name) throw new Error('REPORT_PATIENT_REQUIRED');
}

function reportSection_(title, body) {
  return '<section><h2>' + reportEscape_(title) + '</h2>' + (body || '<p>—</p>') + '</section>';
}

function reportRow_(label, value) {
  return '<div class="row"><span class="label">' + reportEscape_(label) + '</span><span class="value">' + reportEscape_(value) + '</span></div>';
}

function reportParagraph_(value) {
  return '<p>' + reportEscape_(value).replace(/\n/g, '<br>') + '</p>';
}

function reportList_(items) {
  return '<ul>' + (items || []).map(function(x) { return '<li>' + reportEscape_(x) + '</li>'; }).join('') + '</ul>';
}

function reportTable_(headers, rows) {
  return '<div class="table-wrap"><table><thead><tr>' + headers.map(function(h) { return '<th>' + reportEscape_(h) + '</th>'; }).join('') +
    '</tr></thead><tbody>' + rows.map(function(row) {
      return '<tr>' + row.map(function(cell) { return '<td>' + reportEscape_(cell) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table></div>';
}

function reportCount_(answered, total) {
  if (answered == null && total == null) return '—';
  if (total == null) return String(answered);
  return String(answered == null ? 0 : answered) + ' / ' + String(total);
}

function reportEscape_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
    return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
  });
}

function screeningReportCss_() {
  return 'body{margin:0;background:#f4f6f8;color:#18212a;font-family:Arial,sans-serif;line-height:1.55}' +
    '.report{max-width:840px;margin:0 auto;background:#fff;padding:32px}' +
    'header{border-bottom:3px solid #28475f;padding-bottom:18px;margin-bottom:24px}' +
    '.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#647686}' +
    'h1{font-size:28px;margin:6px 0 4px}h2{font-size:18px;color:#28475f;margin:0 0 12px}' +
    'section{border-bottom:1px solid #e4e8eb;padding:18px 0}.row{display:flex;gap:16px;padding:5px 0}' +
    '.label{width:190px;flex:0 0 190px;color:#62717d;font-size:13px}.value{font-weight:600}' +
    'ul{padding-left:22px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}' +
    'th,td{border:1px solid #dfe5e9;padding:8px;text-align:left;vertical-align:top}th{background:#f5f7f8}' +
    'footer{margin-top:26px;color:#72808b;font-size:12px}@media(max-width:600px){.report{padding:18px}.row{display:block}.label{display:block;width:auto}.value{display:block}}';
}

/* ===== ScreeningPipelineV3.gs ===== */
/**
 * ScreeningPipelineV3.gs
 * Ledger operacional e máquina de estados pós-scoring.
 *
 * O ledger NÃO armazena nome, respostas, escores, diagnósticos ou HTML.
 * Ele registra somente referência pseudonimizada e estado operacional.
 */

const SCREENING_PIPELINE = Object.freeze({
  SHEET_NAME: 'PIPELINE',
  STATES: Object.freeze([
    'SUBMITTED','VALIDATED','SCORED','REPORT_GENERATED',
    'EMAIL_SENT','TRELLO_UPDATED','COMPLETE'
  ]),
  HEADERS: Object.freeze([
    'SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS',
    'EMAIL_SENT_AT','TRELLO_UPDATED_AT','ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT'
  ])
});

function setupScreeningPipelineLedger_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = String(props.getProperty('SCREENING_LEDGER_SHEET_ID') || '').trim();
  let ss;
  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.create('Rastreios — Pipeline Clínico V3');
    spreadsheetId = ss.getId();
    props.setProperty('SCREENING_LEDGER_SHEET_ID', spreadsheetId);
  }

  let sheet = ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SCREENING_PIPELINE.SHEET_NAME);
  const existing = sheet.getRange(1,1,1,SCREENING_PIPELINE.HEADERS.length).getValues()[0];
  if (existing.join('|') !== SCREENING_PIPELINE.HEADERS.join('|')) {
    sheet.clear();
    sheet.getRange(1,1,1,SCREENING_PIPELINE.HEADERS.length).setValues([SCREENING_PIPELINE.HEADERS]);
    sheet.setFrozenRows(1);
  }
  return { spreadsheetId: spreadsheetId, sheetName: SCREENING_PIPELINE.SHEET_NAME };
}

function enqueueScreeningPipeline_(meta) {
  const safe = screeningPipelineSafeMeta_(meta);
  const sheet = screeningPipelineSheet_();
  const row = findScreeningPipelineRow_(sheet, safe.submissionRef);
  if (row) return readScreeningPipelineRow_(sheet, row);

  sheet.appendRow([
    safe.submissionRef, safe.instrumentId, safe.formResponseId, 'SUBMITTED',
    '', '', 0, '', new Date()
  ]);
  return readScreeningPipelineRow_(sheet, sheet.getLastRow());
}

function processScoredScreeningPipeline_(context) {
  if (!context || !context.submissionId || !context.instrumentId || !context.formResponseId) throw new Error('PIPELINE_CONTEXT_INVALID');
  if (!context.scoredResult || typeof context.scoredResult !== 'object') throw new Error('PIPELINE_SCORE_REQUIRED');
  if (!context.reportInput || typeof context.reportInput !== 'object') throw new Error('PIPELINE_REPORT_INPUT_REQUIRED');

  const submissionRef = screeningSubmissionRef_(context.submissionId);
  const sheet = screeningPipelineSheet_();
  let row = findScreeningPipelineRow_(sheet, submissionRef);
  if (!row) {
    enqueueScreeningPipeline_({ submissionId: context.submissionId, instrumentId: context.instrumentId, formResponseId: context.formResponseId });
    row = findScreeningPipelineRow_(sheet, submissionRef);
  }

  let state = readScreeningPipelineRow_(sheet, row);
  incrementScreeningPipelineAttempts_(sheet, row);

  try {
    state = advanceScreeningPipelineState_(sheet, row, state, 'VALIDATED');
    state = advanceScreeningPipelineState_(sheet, row, state, 'SCORED');

    const report = buildScreeningClinicalReport_(context.reportInput);
    if (screeningStateBefore_(state.status, 'REPORT_GENERATED')) {
      state = advanceScreeningPipelineState_(sheet, row, state, 'REPORT_GENERATED');
    }

    if (screeningStateBefore_(state.status, 'EMAIL_SENT')) {
      sendScreeningReportEmail_(report);
      markScreeningPipelineTimestamp_(sheet, row, 5);
      state = advanceScreeningPipelineState_(sheet, row, state, 'EMAIL_SENT');
    }

    if (screeningStateBefore_(state.status, 'TRELLO_UPDATED')) {
      const trello = appendScreeningTrelloMetadata_({
        instrumentId: context.instrumentId,
        submissionId: context.submissionId,
        processedAt: new Date().toISOString(),
        status: 'REPORT_READY'
      });
      if (trello.ok || trello.skipped) {
        markScreeningPipelineTimestamp_(sheet, row, 6);
        state = advanceScreeningPipelineState_(sheet, row, state, 'TRELLO_UPDATED');
      }
    }

    if (state.status === 'TRELLO_UPDATED') {
      state = advanceScreeningPipelineState_(sheet, row, state, 'COMPLETE');
    }
    clearScreeningPipelineError_(sheet, row);
    return state;
  } catch (err) {
    setScreeningPipelineError_(sheet, row, screeningPipelineErrorCode_(err));
    throw err;
  }
}

function screeningPipelineSafeMeta_(meta) {
  if (!meta || typeof meta !== 'object') throw new Error('PIPELINE_META_INVALID');
  const instrumentId = String(meta.instrumentId || '').replace(/[^a-z0-9_-]/gi,'').slice(0,40);
  const submissionRef = screeningSubmissionRef_(meta.submissionId);
  const formResponseId = String(meta.formResponseId || '').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,180);
  if (!instrumentId || !submissionRef || !formResponseId) throw new Error('PIPELINE_META_INCOMPLETE');
  return { instrumentId: instrumentId, submissionRef: submissionRef, formResponseId: formResponseId };
}

function screeningPipelineSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = String(props.getProperty('SCREENING_LEDGER_SHEET_ID') || '').trim();
  if (!id) throw new Error('SCREENING_LEDGER_NOT_CONFIGURED');
  const ss = SpreadsheetApp.openById(id);
  const sheet = ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);
  if (!sheet) throw new Error('SCREENING_LEDGER_TAB_MISSING');
  return sheet;
}

function findScreeningPipelineRow_(sheet, submissionRef) {
  if (sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();
  for (let i=0;i<values.length;i++) if (String(values[i][0]) === submissionRef) return i + 2;
  return 0;
}

function readScreeningPipelineRow_(sheet, row) {
  const v = sheet.getRange(row,1,1,SCREENING_PIPELINE.HEADERS.length).getValues()[0];
  return {
    submissionRef: String(v[0] || ''), instrumentId: String(v[1] || ''), formResponseId: String(v[2] || ''),
    status: String(v[3] || ''), emailSentAt: v[4] || '', trelloUpdatedAt: v[5] || '',
    attempts: Number(v[6] || 0), lastErrorCode: String(v[7] || ''), updatedAt: v[8] || ''
  };
}

function advanceScreeningPipelineState_(sheet, row, current, target) {
  const currentIndex = SCREENING_PIPELINE.STATES.indexOf(current.status);
  const targetIndex = SCREENING_PIPELINE.STATES.indexOf(target);
  if (targetIndex < 0) throw new Error('PIPELINE_TARGET_INVALID');
  if (currentIndex > targetIndex) return current;
  if (currentIndex === targetIndex) return current;
  if (targetIndex !== currentIndex + 1) throw new Error('PIPELINE_STATE_JUMP');
  sheet.getRange(row,4).setValue(target);
  sheet.getRange(row,9).setValue(new Date());
  return readScreeningPipelineRow_(sheet,row);
}

function screeningStateBefore_(status,target) {
  return SCREENING_PIPELINE.STATES.indexOf(status) < SCREENING_PIPELINE.STATES.indexOf(target);
}

function incrementScreeningPipelineAttempts_(sheet,row) {
  const cell=sheet.getRange(row,7); cell.setValue(Number(cell.getValue()||0)+1); sheet.getRange(row,9).setValue(new Date());
}
function markScreeningPipelineTimestamp_(sheet,row,column) { sheet.getRange(row,column).setValue(new Date()); sheet.getRange(row,9).setValue(new Date()); }
function setScreeningPipelineError_(sheet,row,code) { sheet.getRange(row,8).setValue(String(code||'PIPELINE_ERROR').slice(0,80)); sheet.getRange(row,9).setValue(new Date()); }
function clearScreeningPipelineError_(sheet,row) { sheet.getRange(row,8).clearContent(); sheet.getRange(row,9).setValue(new Date()); }
function screeningPipelineErrorCode_(err) { return String(err && err.message ? err.message : 'PIPELINE_ERROR').split(':')[0].slice(0,80); }

/* ===== ScreeningIntegrationsV3.gs ===== */
/**
 * ScreeningIntegrationsV3.gs
 * Integrações pós-processamento dos rastreios.
 *
 * Script Properties esperadas:
 * REPORT_EMAIL          -> e-mail do psicólogo responsável
 * TRELLO_KEY             -> chave Trello
 * TRELLO_TOKEN           -> token Trello
 * TRELLO_CARD_ID         -> card operacional do pipeline clínico
 *
 * Regra de minimização: Trello NUNCA recebe respostas, escores,
 * diagnósticos, nome do paciente ou conteúdo do relatório.
 */

function sendScreeningReportEmail_(report) {
  const props = PropertiesService.getScriptProperties();
  const to = String(props.getProperty('REPORT_EMAIL') || '').trim();
  if (!to) throw new Error('REPORT_EMAIL_NOT_CONFIGURED');
  if (!report || !report.html || !report.subject) throw new Error('REPORT_INVALID');

  MailApp.sendEmail({
    to: to,
    subject: String(report.subject).slice(0, 240),
    htmlBody: String(report.html),
    body: String(report.plainText || 'Relatório clínico de rastreio disponível em HTML.'),
    name: 'Richelmy Murta Psicologia'
  });
  return { ok: true, channel: 'email' };
}

function appendScreeningTrelloMetadata_(meta) {
  const props = PropertiesService.getScriptProperties();
  const key = String(props.getProperty('TRELLO_KEY') || '').trim();
  const token = String(props.getProperty('TRELLO_TOKEN') || '').trim();
  const cardId = String(props.getProperty('TRELLO_CARD_ID') || '').trim();
  if (!key || !token || !cardId) return { ok: false, skipped: true, reason: 'TRELLO_NOT_CONFIGURED' };

  const safe = screeningMinimalOperationalMeta_(meta);
  const text = [
    'Rastreio processado',
    'instrumento: ' + safe.instrumentId,
    'submission: ' + safe.submissionRef,
    'data: ' + safe.processedAt,
    'status: ' + safe.status
  ].join(' · ');

  const url = 'https://api.trello.com/1/cards/' + encodeURIComponent(cardId) + '/actions/comments';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    muteHttpExceptions: true,
    payload: { text: text, key: key, token: token }
  });
  const code = Number(res.getResponseCode());
  if (code < 200 || code >= 300) throw new Error('TRELLO_HTTP_' + code);
  return { ok: true, channel: 'trello' };
}

function screeningMinimalOperationalMeta_(meta) {
  if (!meta || typeof meta !== 'object') throw new Error('OPERATIONAL_META_INVALID');
  const instrumentId = String(meta.instrumentId || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  const submissionRef = screeningSubmissionRef_(meta.submissionId);
  const processedAt = String(meta.processedAt || new Date().toISOString()).slice(0, 40);
  const status = String(meta.status || 'COMPLETE').replace(/[^A-Z0-9_-]/gi, '').slice(0, 40);
  if (!instrumentId || !submissionRef) throw new Error('OPERATIONAL_META_INCOMPLETE');
  return { instrumentId: instrumentId, submissionRef: submissionRef, processedAt: processedAt, status: status };
}

function screeningSubmissionRef_(submissionId) {
  const raw = String(submissionId || '');
  if (!raw) return '';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 16);
}

/* ===== ScreeningOrchestratorV3.gs ===== */
/**
 * ScreeningOrchestratorV3.gs
 * Converte uma submissão persistida em scoring + relatório + integrações.
 * Nunca decide se a resposta deve ser persistida: roda SOMENTE após submit() confirmado.
 */

const SCREENING_INSTRUMENT_META_V3 = Object.freeze({
  geral:{name:'Rastreio Clínico Geral',shortName:'Geral',version:'RC-2026'},
  tdah:{name:'Atenção, organização e impulsividade no dia a dia',shortName:'TDAH',version:'RC-2026'},
  bipolar:{name:'Oscilações de humor, energia e ritmo',shortName:'Bipolaridade',version:'RC-2026'},
  borderline:{name:'Emoções, identidade e relações',shortName:'Borderline',version:'RC-2026'},
  narcisismo:{name:'Autoimagem, reconhecimento e relações',shortName:'Narcisismo',version:'RC-2026'},
  impulsividade:{name:'Barratt Impulsiveness Scale – BIS-11',shortName:'BIS-11',version:'BIS-11'},
  esquemas:{name:'Mapa de Esquemas',shortName:'Esquemas',version:'RC-2026'},
  modos:{name:'Modos Esquemáticos',shortName:'Modos',version:'RC-2026'},
  necessidades:{name:'Escala de Necessidades Emocionais',shortName:'Necessidades',version:'RC-2026'},
  codependencia:{name:'Autonomia, limites e cuidado nas relações',shortName:'Relações',version:'RC-2026'},
  icaps:{name:'ICAPS – Inventário Clínico para Avaliação de Prontidão para Separação',shortName:'ICAPS',version:'2.0.0'},
  humor:{name:'Inventário de Depressão de Beck – BDI-II',shortName:'BDI-II',version:'conteúdo vigente bloqueado'},
  ansiedade:{name:'Monitoramento de Ansiedade – estrutura HAM-A',shortName:'Ansiedade',version:'autorrelato adaptado'},
  autoestima:{name:'Escala de Autoestima de Rosenberg',shortName:'Autoestima',version:'RSES-BR'},
  risco:{name:'EIR-RS – Escala Integrada de Risco de Suicídio',shortName:'Risco suicida',version:'vigente'}
});

function runScreeningPostProcessingV3_(context) {
  if(!context||!context.form||!context.payload||!context.formResponseId) throw new Error('ORCHESTRATOR_CONTEXT_INVALID');
  const payload=context.payload;
  const records=context.records||screeningScoringRecordsOrdered_(buildScreeningOrderedContract_(context.form).clinical,payload.responses);
  const scored=scoreScreeningV3_(payload.instrumentId,records);
  const reportInput=screeningReportInputFromScoreV3_(payload,scored,records);
  enqueueScreeningPipeline_({submissionId:payload.submissionId,instrumentId:payload.instrumentId,formResponseId:context.formResponseId});
  return processScoredScreeningPipeline_({
    submissionId:payload.submissionId,
    instrumentId:payload.instrumentId,
    formResponseId:context.formResponseId,
    scoredResult:scored,
    reportInput:reportInput
  });
}

function screeningReportInputFromScoreV3_(payload,score,records) {
  const a=payload.identity||{};
  const meta=SCREENING_INSTRUMENT_META_V3[payload.instrumentId]||{name:payload.instrumentId,shortName:payload.instrumentId,version:'vigente'};
  const sub=(score.subscales||[]).map(function(x){
    const val=x.rawScore!=null?x.rawScore:(x.score!=null?x.score:(x.mean!=null?x.mean:(x.percent!=null?x.percent+'%':'—')));
    return {name:x.title||x.name||'Domínio',score:val,classification:x.classification||''};
  });
  const flags=(score.riskFlags||[]).slice();
  const urgent=flags.some(function(f){return ['CLINICAL_ALERT_REQUIRED','SUICIDE_ITEM_ENDORSED','SUICIDE_ITEM_HIGH','CRITICAL_ITEM_4','RECENT_ATTEMPT_D2_HIGH','SUICIDAL_IDEATION_PRESENT'].indexOf(f)>=0;});
  return {
    submissionId:payload.submissionId,
    patient:{name:String(a.name||'').trim(),birthDate:String(a.birthDate||'').trim()},
    instrument:{id:payload.instrumentId,name:meta.name,shortName:meta.shortName,version:meta.version},
    applicationDate:String(a.applicationDate||'').trim(),
    generatedAt:new Date().toISOString(),
    result:{
      valid:true,
      answeredCount:records.length,
      totalCount:records.length,
      rawScore:score.rawScore,
      normalizedScore:score.normalizedScore,
      classification:score.classification,
      summary:score.clinicalMeaning||'',
      subscales:sub,
      indicators:flags,
      clinicalMeaning:score.clinicalMeaning||'',
      limitations:(score.caveats||[]).slice(),
      scoringContract:(score.sourceMode||'UNSPECIFIED')+' · '+(score.scoringVersion||SCREENING_SCORING_VERSION),
      technicalNote:'Processamento automatizado após persistência confirmada no Google Forms.',
      urgent:urgent
    }
  };
}

function screeningSafePostProcessError_(err) {
  const msg=String(err&&err.message?err.message:'POST_PROCESSING_ERROR');
  return msg.split(':')[0].replace(/[^A-Z0-9_-]/gi,'_').slice(0,80);
}

/* ===== ScreeningSetupV3.gs ===== */
/** Configura o bridge v3.1 diretamente a partir da Forms Factory. */
const SCREENING_FACTORY_SHEET_ID='178f4QTs_yER23Aa8wAjD3KFBHc6ze-kX8NCC8_F5BgU';
const SCREENING_FACTORY_FORM_MAP=Object.freeze({
  geral:'FORM-2026-0004',tdah:'FORM-2026-0005',bipolar:'FORM-2026-0006',borderline:'FORM-2026-0007',narcisismo:'FORM-2026-0008',impulsividade:'FORM-2026-0009',esquemas:'FORM-2026-0010',modos:'FORM-2026-0011',necessidades:'FORM-2026-0012',codependencia:'FORM-2026-0013',risco:'FORM-2026-0014',humor:'FORM-2026-0015',ansiedade:'FORM-2026-0016',autoestima:'FORM-2026-0017',icaps:'FORM-2026-0003'
});

function setupScreeningBridgeV3FromFactory() {
  const sheet=SpreadsheetApp.openById(SCREENING_FACTORY_SHEET_ID).getSheetByName('FORMULARIOS');
  if(!sheet) throw new Error('FORMS_FACTORY_TAB_NOT_FOUND');
  const rows=sheet.getDataRange().getValues();
  const byInternal={};
  rows.slice(1).forEach(function(r){if(r[0]&&r[17]) byInternal[String(r[0])]=String(r[17]);});

  const props=PropertiesService.getScriptProperties();
  const updates={
    REPORT_EMAIL:'ricmurtapsicologia@gmail.com',
    TRELLO_CARD_ID:'6a9e3f9c43f65edff401783a'
  };

  Object.keys(SCREENING_FACTORY_FORM_MAP).forEach(function(id){
    const internal=SCREENING_FACTORY_FORM_MAP[id];
    const formId=byInternal[internal];
    if(!formId) throw new Error('FACTORY_FORM_ID_MISSING:'+internal);
    updates[SCREENING_BRIDGE.INSTRUMENTS[id].formProperty]=formId;
  });
  props.setProperties(updates,false);

  // Monitoramentos longitudinais não coletam nascimento no frontend atual.
  ['humor','ansiedade','autoestima'].forEach(function(id){
    const form=FormApp.openById(updates[SCREENING_BRIDGE.INSTRUMENTS[id].formProperty]);
    form.getItems(FormApp.ItemType.DATE).forEach(function(item){
      if(String(item.getTitle()||'').trim()==='Data de nascimento') item.asDateItem().setRequired(false);
    });
  });

  return {
    ok:true,
    configured:Object.keys(SCREENING_FACTORY_FORM_MAP).length,
    reportEmailConfigured:Boolean(props.getProperty('REPORT_EMAIL')),
    trelloCardConfigured:Boolean(props.getProperty('TRELLO_CARD_ID')),
    trelloCredentialsConfigured:Boolean(props.getProperty('TRELLO_KEY')&&props.getProperty('TRELLO_TOKEN'))
  };
}

function verifyScreeningBridgeV31Contracts() {
  const props=PropertiesService.getScriptProperties();
  const out={version:SCREENING_BRIDGE.VERSION,instruments:{}};
  const ids=Object.keys(SCREENING_BRIDGE.INSTRUMENTS);
  ids.forEach(function(id,index){
    const formId=props.getProperty(SCREENING_BRIDGE.INSTRUMENTS[id].formProperty);
    if(!formId) throw new Error('FORM_ID_NOT_CONFIGURED:'+id);
    if(index>0) Utilities.sleep(250);
    out.instruments[id]=verifyScreeningInstrumentContractWithRetry_(id,formId);
  });
  out.verified=Object.keys(out.instruments).length;
  out.ok=out.verified===ids.length;
  return out;
}

function verifyScreeningInstrumentContractWithRetry_(id,formId) {
  let lastErr=null;
  for(let attempt=1;attempt<=4;attempt++) {
    try {
      const form=FormApp.openById(formId);
      const contract=buildScreeningOrderedContract_(form);
      return {
        formId:formId,
        clinicalItems:contract.clinical.length,
        published:form.isPublished(),
        attempts:attempt
      };
    } catch(err) {
      lastErr=err;
      if(attempt<4) Utilities.sleep(750*attempt);
    }
  }
  const msg=lastErr&&lastErr.message?String(lastErr.message).slice(0,160):'unknown';
  throw new Error('FORM_VERIFY_FAILED:'+id+':'+msg);
}
