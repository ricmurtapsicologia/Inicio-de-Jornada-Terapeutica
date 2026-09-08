/**
 * ScreeningIntegrationsV3.gs
 * Entrega operacional canônica dos rastreios: relatório clínico por e-mail.
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

function screeningSubmissionRef_(submissionId) {
  const raw = String(submissionId || '');
  if (!raw) return '';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 16);
}
