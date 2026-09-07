/**
 * ScreeningBridgeV3.gs
 * Ponte unificada de submissão confirmada para os 15 rastreios clínicos.
 *
 * Segurança/privacidade:
 * - IDs dos Google Forms ficam somente em Script Properties.
 * - respostas clínicas não são gravadas em logs;
 * - o navegador recebe apenas recibo técnico (ok, submissionId, instrumentId);
 * - o Google Forms continua sendo a camada persistente, não a interface pública.
 *
 * Implantar em projeto Apps Script próprio (substitui MonitoringBridge v2).
 */

const SCREENING_BRIDGE = Object.freeze({
  VERSION: 'screening-bridge-v3',
  MESSAGE_TYPE: 'RM_SCREENING_SUBMIT_RESULT',
  CACHE_TTL_SECONDS: 21600,
  MIN_FILL_MS: 1500,
  INSTRUMENTS: Object.freeze({
    geral: Object.freeze({ formProperty: 'FORM_ID_GERAL' }),
    tdah: Object.freeze({ formProperty: 'FORM_ID_TDAH' }),
    bipolar: Object.freeze({ formProperty: 'FORM_ID_BIPOLAR' }),
    borderline: Object.freeze({ formProperty: 'FORM_ID_BORDERLINE' }),
    narcisismo: Object.freeze({ formProperty: 'FORM_ID_NARCISISMO' }),
    impulsividade: Object.freeze({ formProperty: 'FORM_ID_IMPULSIVIDADE' }),
    esquemas: Object.freeze({ formProperty: 'FORM_ID_ESQUEMAS' }),
    modos: Object.freeze({ formProperty: 'FORM_ID_MODOS' }),
    necessidades: Object.freeze({ formProperty: 'FORM_ID_NECESSIDADES' }),
    codependencia: Object.freeze({ formProperty: 'FORM_ID_CODEPENDENCIA' }),
    icaps: Object.freeze({ formProperty: 'FORM_ID_ICAPS' }),
    humor: Object.freeze({ formProperty: 'FORM_ID_HUMOR' }),
    ansiedade: Object.freeze({ formProperty: 'FORM_ID_ANSIEDADE' }),
    autoestima: Object.freeze({ formProperty: 'FORM_ID_AUTOESTIMA' }),
    risco: Object.freeze({ formProperty: 'FORM_ID_RISCO' })
  })
});

function doGet() {
  const props = PropertiesService.getScriptProperties();
  const configured = {};
  Object.keys(SCREENING_BRIDGE.INSTRUMENTS).forEach(function(id) {
    configured[id] = Boolean(props.getProperty(SCREENING_BRIDGE.INSTRUMENTS[id].formProperty));
  });
  return screeningBridgeHtml_({
    ok: true,
    health: true,
    version: SCREENING_BRIDGE.VERSION,
    configured: configured
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return screeningBridgeHtml_({ ok: false, code: 'BUSY', message: 'Canal temporariamente ocupado.' });
  }

  try {
    const raw = e && e.parameter ? e.parameter.payload : '';
    if (!raw) throw new Error('PAYLOAD_MISSING');

    let payload;
    try { payload = JSON.parse(raw); }
    catch (_) { throw new Error('PAYLOAD_INVALID'); }

    validateScreeningEnvelope_(payload);

    const cache = CacheService.getScriptCache();
    const cacheKey = 'screening:' + payload.instrumentId + ':' + payload.submissionId;
    if (cache.get(cacheKey)) {
      return screeningBridgeHtml_({
        ok: true,
        duplicate: true,
        submissionId: payload.submissionId,
        instrumentId: payload.instrumentId
      });
    }

    const instrument = SCREENING_BRIDGE.INSTRUMENTS[payload.instrumentId];
    const formId = PropertiesService.getScriptProperties().getProperty(instrument.formProperty);
    if (!formId) throw new Error('FORM_ID_NOT_CONFIGURED:' + payload.instrumentId);

    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) throw new Error('FORM_NOT_ACCEPTING_RESPONSES');

    const itemMap = buildScreeningItemMap_(form);
    validateScreeningAnswers_(payload.answers, itemMap);

    const formResponse = form.createResponse();
    Object.keys(payload.answers).forEach(function(title) {
      const value = payload.answers[title];
      if (screeningBlank_(value)) return;
      const entry = itemMap[title];
      if (!entry) throw new Error('FORM_CONTRACT_MISMATCH:' + title);
      const itemResponse = createScreeningItemResponse_(entry.item, entry.type, value);
      if (itemResponse) formResponse.withItemResponse(itemResponse);
    });

    // Persistência é o gate primário: nunca depender de scoring/e-mail/Trello.
    const submittedResponse = formResponse.submit();
    cache.put(cacheKey, '1', SCREENING_BRIDGE.CACHE_TTL_SECONDS);

    let processing = 'complete';
    try {
      const formResponseId = String((submittedResponse && submittedResponse.getId && submittedResponse.getId()) || payload.submissionId);
      runScreeningPostProcessingV3_({ form: form, payload: payload, formResponseId: formResponseId });
    } catch (postErr) {
      // A resposta JÁ está persistida; não induzir reenvio/duplicidade.
      processing = 'pending';
      console.error('ScreeningPostProcess:' + screeningSafePostProcessError_(postErr));
    }

    return screeningBridgeHtml_({
      ok: true,
      submissionId: payload.submissionId,
      instrumentId: payload.instrumentId,
      processing: processing
    });
  } catch (err) {
    // Nunca logar payload, respostas, identificação ou conteúdo clínico.
    console.error('ScreeningBridge:' + screeningSafeError_(err));
    return screeningBridgeHtml_({
      ok: false,
      code: screeningSafeCode_(err),
      message: 'Não foi possível confirmar o registro. As respostas permanecem na página para nova tentativa.'
    });
  } finally {
    lock.releaseLock();
  }
}

function validateScreeningEnvelope_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('ENVELOPE_INVALID');
  if (payload.version !== SCREENING_BRIDGE.VERSION) throw new Error('VERSION_UNSUPPORTED');
  if (!Object.prototype.hasOwnProperty.call(SCREENING_BRIDGE.INSTRUMENTS, payload.instrumentId)) throw new Error('INSTRUMENT_NOT_ALLOWED');
  if (!payload.submissionId || String(payload.submissionId).length > 120) throw new Error('SUBMISSION_ID_INVALID');
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) throw new Error('ANSWERS_INVALID');

  const startedAt = Number(payload.startedAt || 0);
  const submittedAt = Number(payload.submittedAt || 0);
  if (!startedAt || !submittedAt || submittedAt - startedAt < SCREENING_BRIDGE.MIN_FILL_MS) throw new Error('SUBMISSION_TOO_FAST');
}

function buildScreeningItemMap_(form) {
  const map = {};
  form.getItems().forEach(function(item) {
    const title = String(item.getTitle() || '').trim();
    if (!title) return;
    if (Object.prototype.hasOwnProperty.call(map, title)) throw new Error('DUPLICATE_FORM_TITLE:' + title);
    const type = item.getType();
    if (screeningAnswerableType_(type)) map[title] = { item: item, type: type };
  });
  return map;
}

function validateScreeningAnswers_(answers, itemMap) {
  const suppliedTitles = Object.keys(answers || {});
  if (!suppliedTitles.length) throw new Error('EMPTY_ANSWERS');
  suppliedTitles.forEach(function(title) {
    if (!Object.prototype.hasOwnProperty.call(itemMap, title)) throw new Error('FORM_CONTRACT_MISMATCH:' + title);
  });

  Object.keys(itemMap).forEach(function(title) {
    const entry = itemMap[title];
    if (screeningItemRequired_(entry.item, entry.type) && screeningBlank_(answers[title])) {
      throw new Error('REQUIRED_ANSWER_MISSING:' + title);
    }
  });
}

function screeningAnswerableType_(type) {
  return [
    FormApp.ItemType.TEXT,
    FormApp.ItemType.PARAGRAPH_TEXT,
    FormApp.ItemType.MULTIPLE_CHOICE,
    FormApp.ItemType.CHECKBOX,
    FormApp.ItemType.SCALE,
    FormApp.ItemType.LIST,
    FormApp.ItemType.DATE,
    FormApp.ItemType.TIME,
    FormApp.ItemType.DURATION,
    FormApp.ItemType.GRID,
    FormApp.ItemType.CHECKBOX_GRID
  ].indexOf(type) >= 0;
}

function screeningItemRequired_(item, type) {
  try {
    switch (type) {
      case FormApp.ItemType.TEXT: return item.asTextItem().isRequired();
      case FormApp.ItemType.PARAGRAPH_TEXT: return item.asParagraphTextItem().isRequired();
      case FormApp.ItemType.MULTIPLE_CHOICE: return item.asMultipleChoiceItem().isRequired();
      case FormApp.ItemType.CHECKBOX: return item.asCheckboxItem().isRequired();
      case FormApp.ItemType.SCALE: return item.asScaleItem().isRequired();
      case FormApp.ItemType.LIST: return item.asListItem().isRequired();
      case FormApp.ItemType.DATE: return item.asDateItem().isRequired();
      case FormApp.ItemType.TIME: return item.asTimeItem().isRequired();
      case FormApp.ItemType.DURATION: return item.asDurationItem().isRequired();
      case FormApp.ItemType.GRID: return item.asGridItem().isRequired();
      case FormApp.ItemType.CHECKBOX_GRID: return item.asCheckboxGridItem().isRequired();
      default: return false;
    }
  } catch (_) { return false; }
}

function createScreeningItemResponse_(item, type, rawValue) {
  switch (type) {
    case FormApp.ItemType.TEXT:
      return item.asTextItem().createResponse(String(rawValue));
    case FormApp.ItemType.PARAGRAPH_TEXT:
      return item.asParagraphTextItem().createResponse(String(rawValue));
    case FormApp.ItemType.MULTIPLE_CHOICE:
      return item.asMultipleChoiceItem().createResponse(String(rawValue));
    case FormApp.ItemType.CHECKBOX:
      return item.asCheckboxItem().createResponse(Array.isArray(rawValue) ? rawValue.map(String) : [String(rawValue)]);
    case FormApp.ItemType.SCALE:
      return item.asScaleItem().createResponse(Number(rawValue));
    case FormApp.ItemType.LIST:
      return item.asListItem().createResponse(String(rawValue));
    case FormApp.ItemType.DATE:
      return item.asDateItem().createResponse(new Date(String(rawValue) + 'T12:00:00'));
    case FormApp.ItemType.TIME: {
      const parts = String(rawValue).split(':');
      return item.asTimeItem().createResponse(Number(parts[0] || 0), Number(parts[1] || 0));
    }
    case FormApp.ItemType.DURATION: {
      const duration = String(rawValue).split(':').map(Number);
      return item.asDurationItem().createResponse(duration[0] || 0, duration[1] || 0, duration[2] || 0);
    }
    case FormApp.ItemType.GRID:
      return item.asGridItem().createResponse(Array.isArray(rawValue) ? rawValue.map(String) : []);
    case FormApp.ItemType.CHECKBOX_GRID:
      return item.asCheckboxGridItem().createResponse(Array.isArray(rawValue) ? rawValue : []);
    default:
      return null;
  }
}

function screeningBlank_(value) {
  if (value === null || typeof value === 'undefined') return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(function(v) { return String(v).trim() === ''; });
  return String(value).trim() === '';
}

function screeningSafeCode_(err) {
  const msg = err && err.message ? String(err.message) : '';
  return String(msg.split(':')[0] || 'TECHNICAL_ERROR').slice(0, 80);
}

function screeningSafeError_(err) {
  return err && err.message ? String(err.message).slice(0, 180) : 'technical_error';
}

function screeningBridgeHtml_(data) {
  const message = Object.assign({ type: SCREENING_BRIDGE.MESSAGE_TYPE }, data || {});
  const json = JSON.stringify(message).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>try{parent.postMessage(' + json + ',"*");}catch(e){}</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
