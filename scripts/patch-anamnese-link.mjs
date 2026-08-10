import { readFile, writeFile } from 'node:fs/promises';

const indexPath = 'index.html';
const anamnesePath = 'anamnese.html';
const bridgePath = 'apps-script/AnamneseBridge.gs';

let index = await readFile(indexPath, 'utf8');
let anamnese = await readFile(anamnesePath, 'utf8');
let bridge = await readFile(bridgePath, 'utf8');

const oldButton = '<button class="form-btn" type="button" data-target="form-anamnese2"><strong>Ficha de Anamnese II</strong></button>';
const newButton = '<a class="form-btn" href="./anamnese.html"><strong>Anamnese</strong></a>';

if (index.includes(oldButton)) {
  index = index.replace(oldButton, newButton);
} else if (!index.includes(newButton)) {
  throw new Error('Botão de Anamnese II não encontrado no index.html.');
}

const oldDetail = /\n\s*<!-- Anamnese II -->\s*\n\s*<div class="form-detail" id="form-anamnese2">[\s\S]*?<\/div>\s*<\/div>\s*\n(?=\s*<!-- Escala de \(Co\)Dependência Emocional -->)/;
index = index.replace(oldDetail, '\n');

const configTag = '<script src="./anamnese-config.js"></script>';
anamnese = anamnese.replace(/\n<script src="\.\/anamnese-config\.js"><\/script>\s*\n<\/body>/, '\n</body>');
if (!anamnese.includes(`${configTag}\n<script>\n(() => {`)) {
  anamnese = anamnese.replace('<script>\n(() => {', `${configTag}\n<script>\n(() => {`);
}

if (!anamnese.includes('let submitted = false;')) {
  anamnese = anamnese.replace('  let sending = false;', '  let sending = false;\n  let submitted = false;');
}
anamnese = anamnese.replace('if(data.ok){document.getElementById(\'anamneseForm\')', 'if(data.ok){submitted=true;document.getElementById(\'anamneseForm\')');
anamnese = anamnese.replace("if(Object.keys(answers).some(k=>", "if(!submitted && Object.keys(answers).some(k=>");
anamnese = anamnese.replace("const holder=document.querySelector(`.field[data-title=\"${CSS.escape(f.title)}\"]`);", "const holder=[...document.querySelectorAll('.field')].find(el=>el.dataset.title===f.title);");

// O Apps Script precisa devolver HTML com fechamento real de </script>.
bridge = bridge.replace(/<\\+\/script>/g, '</script>');

await writeFile(indexPath, index);
await writeFile(anamnesePath, anamnese);
await writeFile(bridgePath, bridge);
console.log('Patch de anamnese aplicado.');
