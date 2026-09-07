import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('monitoramento.html');
const config=read('assets/monitoramentos-bridge-config.js');
const bridge=read('assets/monitoramentos-receipt-bridge-v2.js');
const backend=read('apps-script/MonitoringBridge.gs');

assert.match(config,/RM_MONITORING_BRIDGE_URL='';/,'feature flag deve permanecer vazia até implantação validada');
assert.match(config,/monitoring-bridge-v2/);

const configPos=html.indexOf('monitoramentos-bridge-config.js');
const appPos=html.indexOf('monitoramentos-v2.js');
const bridgePos=html.indexOf('monitoramentos-receipt-bridge-v2.js');
assert.ok(configPos>=0&&appPos>configPos&&bridgePos>appPos,'ordem de scripts inválida');
assert.ok(!html.includes('monitoramentos-uniformity-bridge-v1.js'),'bridge legado não deve ser carregado');

assert.match(bridge,/bridgeEnabled=.*script\\\.google\\\.com/);
assert.match(bridge,/event\.source!==sink\.contentWindow/,'postMessage deve estar vinculado ao iframe de transporte');
assert.match(bridge,/if\(data\.ok===true\)[\s\S]*confirmDelivery/,'sucesso forte deve exigir data.ok');
assert.match(bridge,/if\(bridgeEnabled\|\|!legacySubmitted\)return/,'iframe load não pode confirmar entrega quando bridge v2 estiver ativo');
assert.match(bridge,/receipt:'apps_script_formresponse'/);
assert.match(bridge,/receipt:'legacy_iframe_load'/,'fallback deve permanecer explicitamente marcado como legado');

for(const forbidden of ['localStorage','sessionStorage','indexedDB']){
  assert.ok(!bridge.includes(forbidden),`persistência clínica proibida no browser: ${forbidden}`);
}

for(const property of ['FORM_ID_HUMOR','FORM_ID_ANSIEDADE','FORM_ID_AUTOESTIMA']) assert.ok(backend.includes(property),`Script Property ausente: ${property}`);
assert.match(backend,/FormApp\.openById\(formId\)/);
assert.match(backend,/formResponse\.submit\(\)/,'recibo deve ocorrer após submit do Google Forms');
assert.match(backend,/CacheService\.getScriptCache\(\)/,'deduplicação ausente');
assert.match(backend,/LockService\.getScriptLock\(\)/,'lock ausente');
assert.ok(!backend.includes('1FAIpQL'),'URL/ID público de Forms não deve ser hardcoded no backend');
assert.ok(!backend.includes('console.log(payload)'),'payload clínico não pode ser logado');
assert.ok(!backend.includes('JSON.stringify(payload)'), 'payload clínico não deve ser serializado para log/retorno');

console.log('MONITORING_BRIDGE_V2_PASS');
