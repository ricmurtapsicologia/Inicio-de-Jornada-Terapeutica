/**
 * AnamneseBridge.gs
 * Ponte entre a página GitHub Pages e o Google Forms oficial de anamnese.
 *
 * Publicação recomendada no Apps Script:
 * - Executar como: proprietário do script
 * - Quem tem acesso: qualquer pessoa
 * - Usar somente a URL terminada em /exec no anamnese-config.js
 *
 * A página envia POST tradicional para um iframe invisível. A resposta do Web App
 * retorna apenas status + submissionId via postMessage. Nenhuma resposta clínica
 * é devolvida para o navegador ou registrada em logs por este código.
 */

const ANAMNESE = Object.freeze({
  VERSION: 'anamnese-v2',
  FORM_ID: '1fg3ZNgCfkbk4pEJaiNt3xY5vellVGI_129lDx8v-aPI',
  MESSAGE_TYPE: 'ANAMNESE_SUBMIT_RESULT',
  CACHE_TTL_SECONDS: 21600,
  MIN_FILL_MS: 2000,
});

function doGet() {
  return bridgeHtml_({ ok: true, health: true, version: ANAMNESE.VERSION });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return bridgeHtml_({ ok: false, message: 'O canal está ocupado. Tente novamente em instantes.' });
  }

  try {
    const raw = e && e.parameter ? e.parameter.payload : '';
    if (!raw) throw new Error('Payload ausente.');

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (_) {
      throw new Error('Payload inválido.');
    }

    validateEnvelope_(payload);

    const cache = CacheService.getScriptCache();
    const cacheKey = 'anamnese:' + payload.submissionId;
    if (cache.get(cacheKey)) {
      return bridgeHtml_({ ok: true, duplicate: true, submissionId: payload.submissionId });
    }

    const form = FormApp.openById(ANAMNESE.FORM_ID);
    if (!form.isAcceptingResponses()) throw new Error('O formulário não está aceitando respostas neste momento.');

    validateRequiredAnswers_(payload.answers);
    const formResponse = form.createResponse();
    const itemMap = buildAnswerableItemMap_(form);

    Object.keys(payload.answers || {}).forEach(function(title) {
      const value = payload.answers[title];
      if (isBlank_(value)) return;
      const entry = itemMap[title];
      if (!entry) return;

      const itemResponse = createItemResponse_(entry.item, entry.type, value);
      if (itemResponse) formResponse.withItemResponse(itemResponse);
    });

    formResponse.submit();
    cache.put(cacheKey, '1', ANAMNESE.CACHE_TTL_SECONDS);

    return bridgeHtml_({ ok: true, submissionId: payload.submissionId });
  } catch (err) {
    // Não registrar payload/respostas. Somente mensagem técnica genérica no Execution log.
    console.error('AnamneseBridge: ' + safeErrorMessage_(err));
    return bridgeHtml_({ ok: false, message: 'Não foi possível registrar a anamnese. Suas respostas continuam na página para nova tentativa.' });
  } finally {
    lock.releaseLock();
  }
}

function validateEnvelope_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Envelope ausente.');
  if (payload.version !== ANAMNESE.VERSION) throw new Error('Versão não suportada.');
  if (payload.formId !== ANAMNESE.FORM_ID) throw new Error('Formulário de destino inválido.');
  if (!payload.submissionId || String(payload.submissionId).length > 120) throw new Error('submissionId inválido.');
  if (!payload.answers || typeof payload.answers !== 'object' || Array.isArray(payload.answers)) throw new Error('Respostas inválidas.');

  const startedAt = Number(payload.startedAt || 0);
  const submittedAt = Number(payload.submittedAt || Date.now());
  if (!startedAt || submittedAt - startedAt < ANAMNESE.MIN_FILL_MS) throw new Error('Submissão rápida demais.');
}

function validateRequiredAnswers_(answers) {
  const required = [
    'Nome completo',
    'Idade',
    'O que fez você procurar terapia neste momento?',
    'Se você pudesse me ajudar a compreender o que está mais difícil atualmente, o que me contaria?',
    'Quanto essa situação tem afetado sua vida atualmente?',
    'Em quais áreas da sua vida você percebe maior impacto atualmente?',
    'Quando essas dificuldades aparecem, o que costuma acontecer com você?',
    'Você já fez psicoterapia anteriormente?',
    'Faz uso atualmente de algum medicamento que considere relevante me informar?',
    'Se nosso trabalho estiver fazendo diferença na sua vida, o que você gostaria de perceber diferente daqui a alguns meses?',
    'Existe neste momento alguma situação urgente relacionada à sua segurança ou à segurança de outra pessoa que você considere importante que eu saiba antes da sessão?'
  ];

  required.forEach(function(title) {
    if (isBlank_(answers[title])) throw new Error('Campo obrigatório ausente.');
  });
}

function buildAnswerableItemMap_(form) {
  const map = {};
  form.getItems().forEach(function(item) {
    const type = item.getType();
    const title = item.getTitle();
    if (!title) return;

    const answerable = [
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

    if (answerable) map[title] = { item: item, type: type };
  });
  return map;
}

function createItemResponse_(item, type, rawValue) {
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
      return item.asDateItem().createResponse(new Date(rawValue));
    case FormApp.ItemType.TIME: {
      const parts = String(rawValue).split(':');
      return item.asTimeItem().createResponse(Number(parts[0] || 0), Number(parts[1] || 0));
    }
    case FormApp.ItemType.DURATION: {
      const parts = String(rawValue).split(':').map(Number);
      return item.asDurationItem().createResponse(parts[0] || 0, parts[1] || 0, parts[2] || 0);
    }
    case FormApp.ItemType.GRID:
      return item.asGridItem().createResponse(Array.isArray(rawValue) ? rawValue.map(String) : []);
    case FormApp.ItemType.CHECKBOX_GRID:
      return item.asCheckboxGridItem().createResponse(Array.isArray(rawValue) ? rawValue : []);
    default:
      return null;
  }
}

function isBlank_(value) {
  if (value === null || typeof value === 'undefined') return true;
  if (Array.isArray(value)) return value.length === 0 || value.every(function(v) { return String(v).trim() === ''; });
  return String(value).trim() === '';
}

function safeErrorMessage_(err) {
  return err && err.message ? String(err.message).slice(0, 180) : 'erro não identificado';
}

function bridgeHtml_(data) {
  const message = Object.assign({ type: ANAMNESE.MESSAGE_TYPE }, data || {});
  const json = JSON.stringify(message).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>try{parent.postMessage(' + json + ',"*");}catch(e){}</script>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
