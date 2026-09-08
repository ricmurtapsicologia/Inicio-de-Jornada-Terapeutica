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
assert.match(integrations,/sendScreeningReportEmail_/);
assert.match(integrations,/screeningSubmissionRef_/);
assert.match(integrations,/SHA_256/);
assert.ok(!/TRELLO_KEY|TRELLO_TOKEN|TRELLO_CARD_ID|appendScreeningTrello|channel:\s*['"]trello['"]/.test(integrations),'Trello não deve integrar o backend clínico');
assert.ok(!/GPS_NOTIFY|notifyScreeningGps_|GPS_NOT_CONFIGURED|GPS_URL|GPS_WEBHOOK|channel:\s*['"]gps['"]/.test(integrations),'GPS não deve integrar o backend clínico');

console.log('SCREENING_REPORT_INTEGRATIONS_V3_STATIC_PASS');
