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
assert.match(integrations,/GPS_NOTIFY_URL/);
assert.match(integrations,/screeningSubmissionRef_/);
assert.match(integrations,/SHA_256/);
assert.match(integrations,/GPS_NOT_CONFIGURED/);

const minimalBody = integrations.slice(integrations.indexOf('function screeningMinimalOperationalMeta_'));
for (const forbidden of ['patientName','patient.name','answers','rawScore','normalizedScore','classification','diagnosis','diagnóstico','report.html']) {
  assert.ok(!minimalBody.includes(forbidden),`Metadado operacional não pode conter ${forbidden}`);
}

const trelloFn = integrations.slice(integrations.indexOf('function appendScreeningTrelloMetadata_'), integrations.indexOf('function notifyScreeningGps_'));
for (const forbidden of ['answers','rawScore','normalizedScore','patient.name','report.html']) {
  assert.ok(!trelloFn.includes(forbidden),`Trello não pode conter ${forbidden}`);
}

const gpsFn = integrations.slice(integrations.indexOf('function notifyScreeningGps_'), integrations.indexOf('function screeningMinimalOperationalMeta_'));
for (const forbidden of ['answers','rawScore','normalizedScore','patient.name','report.html']) {
  assert.ok(!gpsFn.includes(forbidden),`GPS não pode conter ${forbidden}`);
}

console.log('SCREENING_REPORT_INTEGRATIONS_V3_STATIC_PASS');
