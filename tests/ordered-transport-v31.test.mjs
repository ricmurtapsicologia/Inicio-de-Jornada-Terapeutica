import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('apps-script/ScreeningBridgeV3.gs','utf8');
const ordered=fs.readFileSync('apps-script/ScreeningOrderedRecordsV31.gs','utf8');
const setup=fs.readFileSync('apps-script/ScreeningSetupV3.gs','utf8');
const orch=fs.readFileSync('apps-script/ScreeningOrchestratorV3.gs','utf8');
const client=fs.readFileSync('assets/screening-submit-v3.js','utf8');
const transport=JSON.parse(fs.readFileSync('assets/screening-transport-v3.json','utf8'));
const e2e=JSON.parse(fs.readFileSync('audits/e2e-post-sanitize-15.json','utf8'));
const uniformity=fs.readFileSync('assets/screening-uniformity-v1.js','utf8');
const legacy=fs.readFileSync('assets/monitoramentos-receipt-bridge-v2.js','utf8');

assert.match(bridge,/screening-bridge-v3\.1/);
assert.match(bridge,/payload\.responses/);
assert.match(bridge,/payload\.identity/);
assert.ok(!bridge.includes('payload.answers'));
assert.ok(!bridge.includes('isAcceptingResponses'));
assert.match(bridge,/formResponse\.submit\(\)/);
assert.match(ordered,/choiceIndex/);
assert.match(orch,/context\.records/);
assert.ok(!orch.includes('payload.answers'));

const ids=['geral','tdah','bipolar','borderline','narcisismo','impulsividade','esquemas','modos','necessidades','codependencia','icaps','risco','humor','ansiedade','autoestima'];
for(const id of ids) assert.match(setup,new RegExp('\\b'+id+":'FORM-2026-"));
assert.equal((setup.match(/FORM-2026-/g)||[]).length,15);
assert.ok(!/TRELLO_(KEY|TOKEN)\s*[:=]\s*['"][^'"]+/.test(setup),'Credenciais Trello não podem estar no código');
assert.match(setup,/ricmurtapsicologia@gmail\.com/);

assert.equal(e2e.summary.total,15,'E2E pós-saneamento deve cobrir 15 instrumentos');
assert.equal(e2e.summary.pass,15,'E2E pós-saneamento precisa estar 15/15 verde antes da ativação');
assert.equal(e2e.summary.fail,0,'E2E pós-saneamento não pode ter falhas');
assert.equal(transport.enabled,true,'Transporte só pode estar ativo após certificação E2E 15/15');
assert.match(transport.bridgeUrl,/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/);
assert.equal(transport.version,'screening-bridge-v3.1');
assert.match(client,/responses/);
assert.match(client,/audits\/mirror-specs/);
assert.match(client,/ICAPS\/data\/icaps-v2\.json/);
assert.match(client,/field_card_order/);
assert.match(uniformity,/RM_SCREENING_V3_CLIENT=true/);
assert.match(uniformity,/screening-submit-v3\.js/);
assert.match(legacy,/if\(window\.RM_SCREENING_V3_CLIENT===true\)return/);

for(const file of ['assets/screening-submit-v3.js','assets/screening-uniformity-v1.js','assets/monitoramentos-receipt-bridge-v2.js']) new Function(fs.readFileSync(file,'utf8'));
for(const file of ['apps-script/ScreeningBridgeV3.gs','apps-script/ScreeningOrderedRecordsV31.gs','apps-script/ScreeningSetupV3.gs','apps-script/ScreeningOrchestratorV3.gs']) new Function(fs.readFileSync(file,'utf8'));

console.log('ORDERED_TRANSPORT_V31_PASS');
