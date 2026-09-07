/**
 * MonitoringBridge.gs
 * Ponte de submissão confirmada para Humor, Ansiedade e Autoestima.
 *
 * Implantação: projeto Apps Script separado, Web App executado como proprietário,
 * acesso público por URL /exec. Os IDs editáveis dos Forms ficam somente em
 * Script Properties: FORM_ID_HUMOR, FORM_ID_ANSIEDADE, FORM_ID_AUTOESTIMA.
 *
 * A resposta ao navegador contém apenas status + submissionId. Nenhuma resposta
 * clínica é devolvida ao frontend ou registrada em logs.
 */

const MONITORING_BRIDGE = Object.freeze({
  VERSION: 'monitoring-bridge-v2',
  MESSAGE_TYPE: 'RM_MONITORING_SUBMIT_RESULT',
  CACHE_TTL_SECONDS: 21600,
  MIN_FILL_MS: 1500,
  INSTRUMENTS: Object.freeze({
    humor: Object.freeze({ formProperty: 'FORM_ID_HUMOR' }),
    ansiedade: Object.freeze({ formProperty: 'FORM_ID_ANSIEDADE' }),
    autoestima: Object.freeze({ formProperty: 'FORM_ID_AUTOESTIMA' })
  })
});

function doGet() {
  const props = PropertiesService.getScriptProperties();
  const configured = {};
  Object.keys(MONITORING_BRIDGE.INSTRUMENTS).forEach(function(id) {
    configured[id] = Boolean(props.getProperty(MONITORING_BRIDGE.INSTRUMENTS[id].formProperty));
  });
  return monitoringBridgeHtml_({
    ok: true,
    health: true,
    version: MONITORING_BRIDGE.VERSION,
    configured: configured
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return monitoringBridgeHtml_({ ok: false, message: 'O canal está ocupado. Tente novamente em instantes.' });
  }

  try {
    const raw = e && e.parameter ? e.parameter.payload : '';
    if (!raw) throw new Error('PAYLOAD_MISSING');

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      throw new Error('PAYLOAD_INVALID');
    }

    validateMonitoringEnvelope_(payload);

    const cache = CacheService.getScriptCache();
    const cacheKey = 'monitoring:' + payload.instrumentId + ':' + payload.submissionId;
    if (cache.get(cacheKey)) {
      return monitoringBridgeHtml_({
        ok: true,
        duplicate: true,
        submissionId: payload.submissionId,
        instrumentId: payload.instrumentId
      });
    }

    const instrument = MONITORING_BRIDGE.INSTRUMENTS[payload.instrumentId];
    const formId = PropertiesService.getScriptProperties().getProperty(instrument.formProperty);
    if (!formId) throw new Error('FORM_ID_NOT_CONFIGURED:' + payload.instrumentId);

    const form = FormApp.openById(formId);
    if (!form.isAcceptingResponses()) throw new Error('FORM_NOT_ACCEPTING_RESPONSES');

    const itemMap = buildMonitoringItemMap_(form);
    validateMonitoringAnswers_(payload.answers, itemMap);

    const formResponse = form.createResponse();
    Object.keys(payload.answers).forEach(function(title) {
      const value = payload.answers[title];
      if (monitoringBlank_(value)) return;
      const entry = itemMap[title];
      if (!entry) throw new Error('FORM_CONTRACT_MISMATCH:' + title);
      const itemResponse = createMonitoringItemResponse_(entry.item, entry.type, value);
      if (itemResponse) formResponse.withItemResponse(itemResponse);
    });

    // O recibo só é devolvido depois que o Google Forms confirma submit().
    formResponse.submit();
    cache.put(cacheKey, '1', MONITORING_BRIDGE.CACHE_TTL_SECONDS);

    return monitoringBridgeHtml_({
      ok: true,
      submissionId: payload.submissionId,
      instrumentId: payload.instrumentId
    });
  } catch (err) {
    // Nunca registrar payload, respostas, nome ou demais dados clínicos.
    console.error('MonitoringBridge:' + monitoringSafeError_(err));
    return monitoringBridgeHtml_({
      ok: false,
      message: 'Não foi possível confirmar o registro. Suas respostas permanecem na página para nova tentativa.'
    });
  } finally {
    lock.releaseLock();
  }
}

function validateMonitoringEnvelope_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('ENVELOPE_INVALID');
  if (payload.version !== MONITORING_BRIDGE.VERSION) throw new Error('VERSION_UNSUPPORTED');
  if (!Object.prototype.hasOwnProperty.call(MONITORING_BRIDGE.INSTRUMENTS, payload.instrumentId)) throw new Error('INSTRUMENT_NOT_ALLOWED');
  if (!payload.submissionId || String(payload.submissionId).length > 120) throw new Error('SUBMISSION_ID_INVALID');
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) throw new Error('ANSWERS_INVALID');

  const startedAt = Number(payload.startedAt || 0);
  const submittedAt = Number(payload.submittedAt || 0);
  if (!startedAt || !submittedAt || submittedAt - startedAt < MONITORING_BRIDGE.MIN_FILL_MS) throw new Error('SUBMISSION_TOO_FAST');
}

function buildMonitoringItemMap_(form) {
  const map = {};
  form.getItems().forEach(function(item) {
    const title = String(item.getTitle() || '').trim();
    if (!title) return;
    if (Object.prototype.hasOwnProperty.call(map, title)) throw new Error('DUPLICATE_FORM_TITLE:' + title);
    const type = item.getType();
    if (monitoringAnswerableType_(type)) map[title] = { item: item, type: type };
  });
  return map;
}

function validateMonitoringAnswers_(answers, itemMap) {
  const suppliedTitles = Object.keys(answers || {});
  if (!suppliedTitles.length) throw new Error('EMPTY_ANSWERS');
  suppliedTitles.forEach(function(title) {
    if (!Object.prototype.hasOwnProperty.call(itemMap, title)) throw new Error('FORM_CONTRACT_MISMATCH:' + title);
  });

  Object.keys(itemMap).forEach(function(title) {
    const entry = itemMap[title];
    if (monitoringItemRequired_(entry.item, entry.type) && monitoringBlank_(answers[title])) {
      throw new Error('REQUIRED_ANSWER_MISSING:' + title);
    }
  });
}

function monitoringAnswerableType_(type) {
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

function monitoringItemRequired_(item, type) {
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
  } catch (_) {
    return false;
  }
}

function createMonitoringItemResponse_(item, type, rawValue) {
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

function monitoringBlank_(value) {
  if (value === null || typeof value === 'undefined') return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(function(v) { return String(v).trim() === ''; });
  return String(value).trim() === '';
}

function monitoringSafeError_(err) {
  return err && err.message ? String(err.message).slice(0, 180) : 'technical_error';
}

function monitoringBridgeHtml_(data) {
  const message = Object.assign({ type: MONITORING_BRIDGE.MESSAGE_TYPE }, data || {});
  const json = JSON.stringify(message).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>try{parent.postMessage(' + json + ',"*");}catch(e){}</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
