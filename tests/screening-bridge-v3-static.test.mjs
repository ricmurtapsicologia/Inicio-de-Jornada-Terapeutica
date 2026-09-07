import fs from 'node:fs';
import assert from 'node:assert/strict';

const src=fs.readFileSync('apps-script/ScreeningBridgeV3.gs','utf8');
const ids=['geral','tdah','bipolar','borderline','narcisismo','impulsividade','esquemas','modos','necessidades','codependencia','icaps','humor','ansiedade','autoestima','risco'];

assert.match(src,/VERSION:\s*'screening-bridge-v3\.1'/);
assert.match(src,/formResponse\.submit\(\)/);
assert.match(src,/CacheService\.getScriptCache\(\)/);
assert.match(src,/LockService\.getScriptLock\(\)/);
assert.match(src,/payload\.responses/);
assert.match(src,/payload\.identity/);
assert.ok(!src.includes('payload.answers'),'Contrato antigo por título não pode permanecer ativo');
assert.ok(!src.includes('isAcceptingResponses'),'Bridge programático não deve depender da publicação pública do Form');

for(const id of ids) assert.match(src,new RegExp('\\b'+id+':\\{formProperty:'));
const propertyMatches=[...src.matchAll(/formProperty:'FORM_ID_[A-Z_]+'/g)];
assert.equal(propertyMatches.length,15,'A ponte deve declarar exatamente 15 FORM_ID_*');

assert.ok(!/console\.(log|error)\s*\([^\n]*(payload|responses|identity)/i.test(src),'Payload/respostas/identidade não podem ser enviados a console');
assert.ok(!/PropertiesService[^\n]*(responses|identity)/i.test(src),'Respostas/identidade não podem ser gravadas em PropertiesService');
assert.ok(!/localStorage|sessionStorage|indexedDB/i.test(src),'Backend não deve usar storage do navegador');

console.log('SCREENING_BRIDGE_V31_STATIC_PASS');
