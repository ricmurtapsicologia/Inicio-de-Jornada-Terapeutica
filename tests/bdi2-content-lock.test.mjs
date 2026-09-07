import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const source=fs.readFileSync('assets/monitoramentos-v2.js','utf8');
const match=source.match(/\n  humor:\{([\s\S]*?)\n  \},\n  ansiedade:\{/);
assert.ok(match,'BDI-II humor schema block must exist');
const block=match[1];
const count=(block.match(/\bchoice\('/g)||[]).length;
assert.equal(count,21,'BDI-II must preserve exactly 21 item groups');
const expected=fs.readFileSync('tests/fixtures/bdi2-humor.sha256','utf8').trim();
const actual=crypto.createHash('sha256').update(block,'utf8').digest('hex');
assert.equal(actual,expected,'BDI-II questions/order/options changed: clinical review and explicit versioning required');
assert.match(block,/Pensamentos ou desejos suicidas/,'BDI-II safety item must remain present');
console.log('BDI2_CONTENT_LOCK_PASS');
