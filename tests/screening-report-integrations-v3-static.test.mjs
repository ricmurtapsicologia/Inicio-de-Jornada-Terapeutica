import fs from 'node:fs';
import assert from 'node:assert/strict';

const report = fs.readFileSync('apps-script/ScreeningReportV3.gs','utf8');
const integrations = fs.readFileSync('apps-script/ScreeningIntegrationsV3.gs','utf8');

assert.match(report,/function\s+buildScreeningClinicalReport_/);
assert.match(report,/reportEscape_/);
assert.match(report,/Instrumentos de rastreio e monitoramento não estabelecem diagnóstico isoladamente/);
assert.match(report,/Significado clínico/);
assert.match(report,/Limitações/);
assert.match(report,/Detalhes técnicos/);
assert.ok(!/innerHTML|document\.|window\.|localStorage|sessionStorage|indexedDB/.test(report),'Gerador Apps Script não deve depender de browser/storage');

assert.match(integrations,/REPORT_EMAIL/);
assert.match(integrations,/TRELLO_CARD_ID/);
assert.match(integrations,/screeningSubmissionRef_/);
assert.match(integrations,/SHA_256/);
assert.ok(!/GPS_NOTIFY|notifyScreeningGps_|GPS_NOT_CONFIGURED|channel:\s*['"]gps['"]/.test(integrations),'GPS deve permanecer fora do pipeline até existir integração real');

const minimalBody = integrations.slice(integrations.indexOf('function screeningMinimalOperationalMeta_'));
for (const forbidden of ['patientName','patient.name','answers','rawScore','normalizedScore','classification','diagnosis','diagnóstico','report.html']) {
  assert.ok(!minimalBody.includes(forbidden),`Metadado operacional não pode conter ${forbidden}`);
}

const trelloFn = integrations.slice(integrations.indexOf('function appendScreeningTrelloMetadata_'), integrations.indexOf('function screeningMinimalOperationalMeta_'));
for (const forbidden of ['answers','rawScore','normalizedScore','patient.name','report.html','diagnóstico','diagnosis']) {
  assert.ok(!trelloFn.includes(forbidden),`Trello não pode conter ${forbidden}`);
}

console.log('SCREENING_REPORT_INTEGRATIONS_V3_STATIC_PASS');
