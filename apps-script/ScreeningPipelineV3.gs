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
    'EMAIL_SENT','TRELLO_UPDATED','GPS_NOTIFIED','COMPLETE'
  ]),
  HEADERS: Object.freeze([
    'SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS',
    'EMAIL_SENT_AT','TRELLO_UPDATED_AT','GPS_NOTIFIED_AT',
    'ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT'
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
    '', '', '', 0, '', new Date()
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

    let report;
    if (screeningStateBefore_(state.status, 'REPORT_GENERATED')) {
      report = buildScreeningClinicalReport_(context.reportInput);
      state = advanceScreeningPipelineState_(sheet, row, state, 'REPORT_GENERATED');
    } else {
      report = buildScreeningClinicalReport_(context.reportInput);
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

    if (screeningStateBefore_(state.status, 'GPS_NOTIFIED')) {
      const gps = notifyScreeningGps_({
        instrumentId: context.instrumentId,
        submissionId: context.submissionId,
        processedAt: new Date().toISOString(),
        status: 'REPORT_READY'
      });
      if (gps.ok) {
        markScreeningPipelineTimestamp_(sheet, row, 7);
        state = advanceScreeningPipelineState_(sheet, row, state, 'GPS_NOTIFIED');
      } else if (gps.skipped && gps.reason === 'GPS_NOT_CONFIGURED') {
        // GPS permanece explicitamente pendente; não fingir notificação.
        return readScreeningPipelineRow_(sheet, row);
      }
    }

    if (state.status === 'GPS_NOTIFIED') {
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
    status: String(v[3] || ''), emailSentAt: v[4] || '', trelloUpdatedAt: v[5] || '', gpsNotifiedAt: v[6] || '',
    attempts: Number(v[7] || 0), lastErrorCode: String(v[8] || ''), updatedAt: v[9] || ''
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
  sheet.getRange(row,10).setValue(new Date());
  return readScreeningPipelineRow_(sheet,row);
}

function screeningStateBefore_(status,target) {
  return SCREENING_PIPELINE.STATES.indexOf(status) < SCREENING_PIPELINE.STATES.indexOf(target);
}

function incrementScreeningPipelineAttempts_(sheet,row) {
  const cell=sheet.getRange(row,8); cell.setValue(Number(cell.getValue()||0)+1); sheet.getRange(row,10).setValue(new Date());
}
function markScreeningPipelineTimestamp_(sheet,row,column) { sheet.getRange(row,column).setValue(new Date()); sheet.getRange(row,10).setValue(new Date()); }
function setScreeningPipelineError_(sheet,row,code) { sheet.getRange(row,9).setValue(String(code||'PIPELINE_ERROR').slice(0,80)); sheet.getRange(row,10).setValue(new Date()); }
function clearScreeningPipelineError_(sheet,row) { sheet.getRange(row,9).clearContent(); sheet.getRange(row,10).setValue(new Date()); }
function screeningPipelineErrorCode_(err) { return String(err && err.message ? err.message : 'PIPELINE_ERROR').split(':')[0].slice(0,80); }
