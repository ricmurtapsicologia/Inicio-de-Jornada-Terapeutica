/**
 * ScreeningIntegrationsV3.gs
 * Integrações pós-processamento dos rastreios.
 *
 * Script Properties esperadas:
 * REPORT_EMAIL          -> e-mail do psicólogo responsável
 * TRELLO_KEY             -> chave Trello
 * TRELLO_TOKEN           -> token Trello
 * TRELLO_CARD_ID         -> card operacional do pipeline clínico
 * GPS_NOTIFY_URL         -> opcional; endpoint real do serviço GPS
 * GPS_NOTIFY_TOKEN       -> opcional
 *
 * Regra de minimização: Trello/GPS NUNCA recebem respostas, escores,
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

function notifyScreeningGps_(meta) {
  const props = PropertiesService.getScriptProperties();
  const url = String(props.getProperty('GPS_NOTIFY_URL') || '').trim();
  const token = String(props.getProperty('GPS_NOTIFY_TOKEN') || '').trim();
  if (!url) return { ok: false, skipped: true, reason: 'GPS_NOT_CONFIGURED' };

  const safe = screeningMinimalOperationalMeta_(meta);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: headers,
    payload: JSON.stringify(safe)
  });
  const code = Number(res.getResponseCode());
  if (code < 200 || code >= 300) throw new Error('GPS_HTTP_' + code);
  return { ok: true, channel: 'gps' };
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
