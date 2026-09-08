import fs from 'node:fs';
import assert from 'node:assert/strict';

const index=fs.readFileSync('index.html','utf8');
const catalog=fs.readFileSync('assets/screening-catalog-v3.js','utf8');
const host=fs.readFileSync('monitoramento.html','utf8');
const js=fs.readFileSync('assets/monitoramentos-v2.js','utf8');
const css=fs.readFileSync('assets/monitoramentos-v2.css','utf8');

assert.doesNotThrow(()=>new Function(js),'branded questionnaire runtime must be valid JavaScript');
assert.doesNotMatch(index,/<iframe[^>]+docs\.google\.com\/forms/is,'Jornada must not render Google Forms iframes');
assert.doesNotMatch(index,/docs\.google\.com\/forms/i,'Jornada index must not expose direct Forms URLs');
assert.match(index,/screening-catalog-v3\.js/,'Jornada must consume the canonical screening catalog');
for(const instrument of ['controle','humor','ansiedade','autoestima']){
  assert.match(catalog,new RegExp(`monitoramento\\.html\\?instrument=${instrument}`),`${instrument} must resolve through the canonical catalog`);
  assert.match(js,new RegExp(`${instrument}:\\{`),`${instrument} schema missing from branded runtime`);
}
assert.doesNotMatch(host,/docs\.google\.com\/forms/i,'public host HTML must not contain Forms branding or direct endpoint');
assert.match(host,/clinical-collection-sink/,'host must use an invisible technical submission sink');
assert.match(host,/monitoramentos-v2\.css/,'host CSS system missing');
assert.match(host,/monitoramentos-v2\.js/,'host runtime missing');
assert.doesNotMatch(js,/\/viewform/i,'runtime must never navigate to native Forms view');
assert.equal((js.match(/\/formResponse/g)||[]).length,4,'exactly four existing collectors must remain wired in the branded runtime');
assert.match(js,/target=\"clinical-collection-sink\"/,'submission must stay inside the branded host');
assert.match(js,/não estabelece diagnóstico/i,'non-diagnostic disclaimer missing');
assert.match(js,/Atenção à sua segurança/,'safety response for mood item missing');
assert.match(js,/risk|risco|intenção de se ferir/i,'safety guidance must be explicit');
assert.doesNotMatch(js,/localStorage|sessionStorage|indexedDB/i,'questionnaire runtime must not persist clinical responses in browser storage');
assert.match(js,/checkValidity\(\)/,'client validation guard missing');
assert.match(js,/reportValidity\(\)/,'accessible validation feedback missing');
assert.match(css,/min-height:44px/,'touch targets must be at least 44px');
assert.match(css,/prefers-reduced-motion:reduce/,'reduced-motion support missing');
assert.match(css,/grid-template-columns:repeat\(5/,'desktop scale controls should be compact and scannable');
assert.match(css,/@media\(max-width:720px\)/,'mobile layout breakpoint missing');
assert.match(css,/:focus-visible/,'keyboard focus visibility missing');
console.log('BRANDED_QUESTIONNAIRES_PASS');
