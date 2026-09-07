import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync('apps-script/ScreeningBridgeV3.gs', 'utf8');
const ids = [
  'geral','tdah','bipolar','borderline','narcisismo','impulsividade','esquemas','modos',
  'necessidades','codependencia','icaps','humor','ansiedade','autoestima','risco'
];

assert.match(src, /VERSION:\s*'screening-bridge-v3'/);
assert.match(src, /FormResponse|formResponse/);
assert.match(src, /formResponse\.submit\(\)/);
assert.match(src, /CacheService\.getScriptCache\(\)/);
assert.match(src, /LockService\.getScriptLock\(\)/);
assert.match(src, /FORM_NOT_ACCEPTING_RESPONSES/);

for (const id of ids) {
  assert.match(src, new RegExp('\\b' + id + ':\\s*Object\\.freeze'));
}

const propertyMatches = [...src.matchAll(/formProperty:\s*'FORM_ID_[A-Z_]+'/g)];
assert.equal(propertyMatches.length, 15, 'A ponte deve declarar exatamente 15 FORM_ID_*');

assert.ok(!/console\.(log|error)\s*\([^\n]*(payload|answers)/i.test(src), 'Payload/respostas não podem ser enviados a console');
assert.ok(!/PropertiesService[^\n]*answers/i.test(src), 'Respostas não podem ser gravadas em PropertiesService');
assert.ok(!/localStorage|sessionStorage|indexedDB/i.test(src), 'Backend não deve usar storage do navegador');

console.log('SCREENING_BRIDGE_V3_STATIC_PASS');
