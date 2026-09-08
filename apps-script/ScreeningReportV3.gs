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
