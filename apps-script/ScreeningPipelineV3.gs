/**
 * ScreeningPipelineV3.gs
 * Ledger operacional e máquina de estados pós-scoring.
 * O ledger NÃO armazena nome, respostas, escores, diagnósticos ou HTML.
 */
const SCREENING_PIPELINE = Object.freeze({
  SHEET_NAME: 'PIPELINE',
  STATES: Object.freeze(['SUBMITTED','VALIDATED','SCORED','REPORT_GENERATED','EMAIL_SENT','COMPLETE']),
  HEADERS: Object.freeze(['SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS','EMAIL_SENT_AT','ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT'])
});
const SCREENING_PIPELINE_LEGACY_HEADERS = Object.freeze(['SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS','EMAIL_SENT_AT','TRELLO_UPDATED_AT','ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT']);

function setupScreeningPipelineLedger() { return setupScreeningPipelineLedger_(); }
function setupScreeningPipelineLedger_() {
  const props=PropertiesService.getScriptProperties();
  let spreadsheetId=String(props.getProperty('SCREENING_LEDGER_SHEET_ID')||'').trim();
  let ss;
  if(spreadsheetId) ss=SpreadsheetApp.openById(spreadsheetId);
  else { ss=SpreadsheetApp.create('Rastreios — Pipeline Clínico V3'); spreadsheetId=ss.getId(); props.setProperty('SCREENING_LEDGER_SHEET_ID',spreadsheetId); }
  let sheet=ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);
  if(!sheet) sheet=ss.insertSheet(SCREENING_PIPELINE.SHEET_NAME);
  ensureScreeningPipelineSchema_(sheet);
  return {spreadsheetId:spreadsheetId,sheetName:SCREENING_PIPELINE.SHEET_NAME};
}
function ensureScreeningPipelineSchema_(sheet) {
  const expected=SCREENING_PIPELINE.HEADERS,lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow===0||lastCol===0){sheet.getRange(1,1,1,expected.length).setValues([expected]);sheet.setFrozenRows(1);return;}
  const current=sheet.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v||''));
  if(current.length===expected.length&&current.join('|')===expected.join('|'))return;
  if(current.length>=SCREENING_PIPELINE_LEGACY_HEADERS.length&&current.slice(0,SCREENING_PIPELINE_LEGACY_HEADERS.length).join('|')===SCREENING_PIPELINE_LEGACY_HEADERS.join('|')){
    const rows=lastRow>1?sheet.getRange(2,1,lastRow-1,SCREENING_PIPELINE_LEGACY_HEADERS.length).getValues():[];
    const migrated=rows.map(v=>[v[0],v[1],v[2],v[3],v[4],v[6],v[7],v[8]]);
    sheet.clearContents();sheet.getRange(1,1,1,expected.length).setValues([expected]);
    if(migrated.length)sheet.getRange(2,1,migrated.length,expected.length).setValues(migrated);
    sheet.setFrozenRows(1);return;
  }
  throw new Error('SCREENING_LEDGER_SCHEMA_UNEXPECTED');
}
function enqueueScreeningPipeline_(meta){const safe=screeningPipelineSafeMeta_(meta),sheet=screeningPipelineSheet_(),row=findScreeningPipelineRow_(sheet,safe.submissionRef);if(row)return readScreeningPipelineRow_(sheet,row);sheet.appendRow([safe.submissionRef,safe.instrumentId,safe.formResponseId,'SUBMITTED','',0,'',new Date()]);return readScreeningPipelineRow_(sheet,sheet.getLastRow());}
function processScoredScreeningPipeline_(context){
  if(!context||!context.submissionId||!context.instrumentId||!context.formResponseId)throw new Error('PIPELINE_CONTEXT_INVALID');
  if(!context.scoredResult||typeof context.scoredResult!=='object')throw new Error('PIPELINE_SCORE_REQUIRED');
  if(!context.reportInput||typeof context.reportInput!=='object')throw new Error('PIPELINE_REPORT_INPUT_REQUIRED');
  const submissionRef=screeningSubmissionRef_(context.submissionId),sheet=screeningPipelineSheet_();let row=findScreeningPipelineRow_(sheet,submissionRef);
  if(!row){enqueueScreeningPipeline_({submissionId:context.submissionId,instrumentId:context.instrumentId,formResponseId:context.formResponseId});row=findScreeningPipelineRow_(sheet,submissionRef);}
  let state=readScreeningPipelineRow_(sheet,row);incrementScreeningPipelineAttempts_(sheet,row);
  try{state=advanceScreeningPipelineState_(sheet,row,state,'VALIDATED');state=advanceScreeningPipelineState_(sheet,row,state,'SCORED');const report=buildScreeningClinicalReport_(context.reportInput);if(screeningStateBefore_(state.status,'REPORT_GENERATED'))state=advanceScreeningPipelineState_(sheet,row,state,'REPORT_GENERATED');if(screeningStateBefore_(state.status,'EMAIL_SENT')){sendScreeningReportEmail_(report);markScreeningPipelineTimestamp_(sheet,row,5);state=advanceScreeningPipelineState_(sheet,row,state,'EMAIL_SENT');}if(state.status==='EMAIL_SENT')state=advanceScreeningPipelineState_(sheet,row,state,'COMPLETE');clearScreeningPipelineError_(sheet,row);return state;}catch(err){setScreeningPipelineError_(sheet,row,screeningPipelineErrorCode_(err));throw err;}
}
function screeningPipelineSafeMeta_(meta){if(!meta||typeof meta!=='object')throw new Error('PIPELINE_META_INVALID');const instrumentId=String(meta.instrumentId||'').replace(/[^a-z0-9_-]/gi,'').slice(0,40),submissionRef=screeningSubmissionRef_(meta.submissionId),formResponseId=String(meta.formResponseId||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,180);if(!instrumentId||!submissionRef||!formResponseId)throw new Error('PIPELINE_META_INCOMPLETE');return{instrumentId,submissionRef,formResponseId};}
function screeningPipelineSheet_(){const props=PropertiesService.getScriptProperties(),id=String(props.getProperty('SCREENING_LEDGER_SHEET_ID')||'').trim();if(!id)throw new Error('SCREENING_LEDGER_NOT_CONFIGURED');const ss=SpreadsheetApp.openById(id),sheet=ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);if(!sheet)throw new Error('SCREENING_LEDGER_TAB_MISSING');ensureScreeningPipelineSchema_(sheet);return sheet;}
function findScreeningPipelineRow_(sheet,submissionRef){if(sheet.getLastRow()<2)return 0;const values=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();for(let i=0;i<values.length;i++)if(String(values[i][0])===submissionRef)return i+2;return 0;}
function readScreeningPipelineRow_(sheet,row){const v=sheet.getRange(row,1,1,SCREENING_PIPELINE.HEADERS.length).getValues()[0];return{submissionRef:String(v[0]||''),instrumentId:String(v[1]||''),formResponseId:String(v[2]||''),status:String(v[3]||''),emailSentAt:v[4]||'',attempts:Number(v[5]||0),lastErrorCode:String(v[6]||''),updatedAt:v[7]||''};}
function advanceScreeningPipelineState_(sheet,row,current,target){const currentIndex=SCREENING_PIPELINE.STATES.indexOf(current.status),targetIndex=SCREENING_PIPELINE.STATES.indexOf(target);if(targetIndex<0)throw new Error('PIPELINE_TARGET_INVALID');if(currentIndex>targetIndex||currentIndex===targetIndex)return current;if(targetIndex!==currentIndex+1)throw new Error('PIPELINE_STATE_JUMP');sheet.getRange(row,4).setValue(target);sheet.getRange(row,8).setValue(new Date());return readScreeningPipelineRow_(sheet,row);}
function screeningStateBefore_(status,target){return SCREENING_PIPELINE.STATES.indexOf(status)<SCREENING_PIPELINE.STATES.indexOf(target);}
function incrementScreeningPipelineAttempts_(sheet,row){const cell=sheet.getRange(row,6);cell.setValue(Number(cell.getValue()||0)+1);sheet.getRange(row,8).setValue(new Date());}
function markScreeningPipelineTimestamp_(sheet,row,column){sheet.getRange(row,column).setValue(new Date());sheet.getRange(row,8).setValue(new Date());}
function setScreeningPipelineError_(sheet,row,code){sheet.getRange(row,7).setValue(String(code||'PIPELINE_ERROR').slice(0,80));sheet.getRange(row,8).setValue(new Date());}
function clearScreeningPipelineError_(sheet,row){sheet.getRange(row,7).clearContent();sheet.getRange(row,8).setValue(new Date());}
function screeningPipelineErrorCode_(err){return String(err&&err.message?err.message:'PIPELINE_ERROR').split(':')[0].slice(0,80);}
