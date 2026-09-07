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
