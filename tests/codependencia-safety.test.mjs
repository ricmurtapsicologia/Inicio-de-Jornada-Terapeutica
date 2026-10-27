import fs from 'node:fs';
import assert from 'node:assert/strict';

const get = p => fs.readFileSync(p, 'utf8');
const config = JSON.parse(get('assets/screening-public-experience-v2.json')).instruments.codependencia;
const adapter = JSON.parse(get('assets/screening-adapters-v2.json')).instruments.codependencia;
const mirror = JSON.parse(get('audits/mirror-specs/codependencia.json'));
const bridge = get('apps-script/ScreeningBridgeV3.gs');
const client = get('assets/screening-submit-v3.js');
const uniformity = get('assets/screening-uniformity-v1.js');

assert.equal(config.productionReady, false, 'Do not release before verified E2E');
assert.equal(adapter.submissionSupported, false, 'Keep codependency disabled in the adapter');
assert.equal(mirror.questionCount, 40);
assert.equal(mirror.questions.length, 40);
assert.deepEqual(mirror.questions.map((q, i) => q.name), Array.from({length: 40}, (_, i) => 'q' + (i + 1)));
for (const q of mirror.questions) {
  assert.equal(q.required, true);
  assert.deepEqual(q.options.map(o => o.value), ['1','2','3','4','5']);
}
assert.match(client, /function validateResponses\(/);
assert.match(client, /CODEPENDENCIA|codependencia/);
assert.match(client, /responses\.map\(v=>\['Discordo Totalmente','Discordo','Neutro','Concordo','Concordo Totalmente'\]/);
assert.doesNotMatch(client, /&&false/);
assert.match(client, /event\.source!==sink\.contentWindow/);
assert.match(client, /googleusercontent/);
assert.match(client, /rm:screening-bridge-ready/);
assert.match(client, /lastAttempt=\{signature,id:pendingId\}/);
assert.match(bridge, /SCREENING_CODEPENDENCIA_ENABLED/);
assert.match(bridge, /CODEP_CONTRACT_COUNT/);
assert.match(bridge, /CODEP_CHOICE_CONTRACT_MISMATCH/);
assert.match(bridge, /CODEP_ANSWER_INVALID/);
assert.match(bridge, /parent\.postMessage\('\+json\+',"https:\/\/ricmurtapsicologia\.github\.io"/);
assert.match(uniformity, /screening-submit-v3\.js\?v=3\.1\.1-clinical-guard/);

// Generated Apps Script bundle must exactly track the nine source files.
const files = [
  'ScreeningBridgeV3.gs','ScreeningOrderedRecordsV31.gs','ScreeningScoringConfigV3.gs',
  'ScreeningScoringV3.gs','ScreeningReportV3.gs','ScreeningPipelineV3.gs',
  'ScreeningIntegrationsV3.gs','ScreeningOrchestratorV3.gs','ScreeningSetupV3.gs'
];
let generated = '/**\n * ScreeningBackendV31.bundle.gs\n * ARQUIVO GERADO. Não editar manualmente.\n * Bundle único do backend clínico dos 15 rastreios.\n */\n';
for (const name of files) generated += '\n/* ===== ' + name + ' ===== */\n' + get('apps-script/' + name).trimEnd() + '\n';
assert.equal(get('apps-script/ScreeningBackendV31.bundle.gs'), generated, 'Generated backend bundle drift');
for (const source of [client, uniformity, bridge, generated]) assert.doesNotThrow(() => new Function(source));
console.log('CODEPENDENCIA_SAFETY_PASS');
