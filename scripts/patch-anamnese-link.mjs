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

// HTML5: elementos vazios sem barra XHTML.
anamnese = anamnese.replace(/(<(?:meta|link|input)\b[^>]*?)\s*\/>/gi, '$1>');

// Barra de progresso nativa e semanticamente acessível.
anamnese = anamnese.replace('<div class="progress-wrap" aria-label="Progresso da anamnese">', '<div class="progress-wrap">');
anamnese = anamnese.replace('<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="progressBar"><div id="progressFill"></div></div>', '<progress class="progress" id="progressBar" max="100" value="0" aria-label="Progresso da anamnese">0%</progress>');
anamnese = anamnese.replace('.progress{height:8px;background:#dce8e6;border-radius:999px;overflow:hidden}.progress>div{height:100%;width:0;background:linear-gradient(90deg,var(--brand),#4c9b91);transition:width .25s ease}', '.progress{display:block;width:100%;height:8px;appearance:none;border:0;background:#dce8e6;border-radius:999px;overflow:hidden}.progress::-webkit-progress-bar{background:#dce8e6;border-radius:999px}.progress::-webkit-progress-value{background:linear-gradient(90deg,var(--brand),#4c9b91);border-radius:999px}.progress::-moz-progress-bar{background:linear-gradient(90deg,var(--brand),#4c9b91);border-radius:999px}');
anamnese = anamnese.replace('@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.progress>div{transition:none}}', '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}');
anamnese = anamnese.replace("document.getElementById('progressFill').style.width=`${pct}%`;const bar=document.getElementById('progressBar');bar.setAttribute('aria-valuenow',String(pct));", "const bar=document.getElementById('progressBar');bar.value=pct;bar.textContent=`${pct}%`;");

// Submit buttons estáticos satisfazem semântica HTML; o fluxo continua controlado pelo JS.
if (!anamnese.includes('id="nativeSubmitGuard"')) {
  anamnese = anamnese.replace('<section class="card" id="formCard" aria-live="polite"></section>\n    </form>', '<section class="card" id="formCard" aria-live="polite"></section>\n      <button class="hidden" id="nativeSubmitGuard" type="submit" tabindex="-1" aria-hidden="true">Enviar</button>\n    </form>');
}
if (!anamnese.includes('id="transportSubmitGuard"')) {
  anamnese = anamnese.replace('<input type="hidden" name="payload" id="transportPayload">\n  </form>', '<input type="hidden" name="payload" id="transportPayload">\n    <button class="hidden" id="transportSubmitGuard" type="submit" tabindex="-1" aria-hidden="true">Enviar</button>\n  </form>');
}
if (!anamnese.includes("document.getElementById('anamneseForm').addEventListener('submit'")) {
  anamnese = anamnese.replace('  render();\n})();', "  document.getElementById('anamneseForm').addEventListener('submit', (event)=>event.preventDefault());\n  render();\n})();");
}

// O Apps Script precisa devolver HTML com fechamento real de </script>.
bridge = bridge.replace(/<\\+\/script>/g, '</script>');

await writeFile(indexPath, index);
await writeFile(anamnesePath, anamnese);
await writeFile(bridgePath, bridge);
console.log('Patch de anamnese aplicado.');
