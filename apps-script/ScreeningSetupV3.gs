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
