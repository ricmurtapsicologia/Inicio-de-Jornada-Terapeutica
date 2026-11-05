// Regressão estática da integração de monitoramentos clínicos.
// Executar: node --test tests/monitoring-hotfix-v381.test.mjs
// Não contém dados pessoais, não faz requisições e não envia formulários.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const monitoring = read('assets/monitoramentos-v2.js');
const source = monitoring.slice(monitoring.indexOf('const ENDPOINT='),monitoring.indexOf('const esc=value=>'));
const schemas = runInNewContext(source+'\nschemas;',{});
const config = JSON.parse(read('assets/screening-public-experience-v2.json')).instruments;
const transport = JSON.parse(read('assets/screening-transport-v3.json'));
const submit = read('assets/screening-submit-v3.js');
const system = read('assets/screening-system-v2.js');
const receipt = read('assets/monitoramentos-receipt-bridge-v2.js');
const uniform = read('assets/screening-uniformity-v1.js');
const page = read('monitoramento.html');

for(const [id,expected] of Object.entries({humor:21,ansiedade:14,autoestima:10})){
  test(id+': a coleta tem somente os itens clínicos',()=>{
    const fields=schemas[id].fields;
    assert.equal(fields.filter(f=>f.choices?.length).length,expected);
    assert.equal(config[id].collectorReady,true);
    assert.equal(config[id].scorerValidated,false);
  });
}
test('opção de risco não contém formulação ambígua',()=>{
  assert.equal(monitoring.includes("'Gostaria de matar.'"),false);
  assert.ok(monitoring.includes("'Gostaria de me matar.'"));
});
test('coletor de respostas ativado e com destino Google Apps Script',()=>{
  assert.equal(transport.enabled,true);
  assert.equal(transport.version,'screening-bridge-v3.1');
  assert.match(transport.bridgeUrl,/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/);
});
test('somente fieldsets clínicos e respostas não vazias são transmitidos',()=>{
  assert.ok(submit.includes("querySelectorAll('fieldset.field-card')"));
  assert.ok(submit.includes('responses.some(blank)'));
});
test('comprovante autenticado pela identidade da janela de destino',()=>{
  assert.ok(submit.includes('event.source!==sink.contentWindow'));
  assert.ok(submit.includes('data.submissionId!==pendingId'));
  assert.ok(receipt.includes('window.RM_SCREENING_V5_CLIENT===true'));
});
test('coleta depende da prontidão do transporte, sem autorizar escore',()=>{
  assert.ok(system.includes('function submissionReady()'));
  assert.ok(system.includes('window.RM_SCREENING_TRANSPORT_READY===true'));
  assert.ok(system.includes('function confirmDelivery(detail={}){if(!submissionReady())return;'));
  assert.equal(config.humor.productionReady,false);
});
test('HTML usa os módulos do hotfix sem cache legado',()=>{
  assert.ok(uniform.includes('2.5.1-monitoring-v381'));
  assert.ok(uniform.includes('3.1.1-monitoring-v381'));
  assert.ok(page.includes('5.0.1-monitoring-v381'));
});
