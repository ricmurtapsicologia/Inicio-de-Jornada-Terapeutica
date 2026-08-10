import { readFile, writeFile } from 'node:fs/promises';

let index = await readFile('index.html','utf8');
let page = await readFile('anamnese.html','utf8');

const version = '20260810-3';

index = index.replace(/href="\.\/anamnese\.html(?:\?v=[^"]*)?"/g, `href="./anamnese.html?v=${version}"`);

if (!page.includes('http-equiv="Cache-Control"')) {
  page = page.replace('<meta name="theme-color" content="#1b7f79">', '<meta name="theme-color" content="#1b7f79">\n  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">\n  <meta http-equiv="Pragma" content="no-cache">\n  <meta http-equiv="Expires" content="0">');
}

if (!page.includes("const APP_BUILD = '20260810-3';")) {
  page = page.replace("  const FORM_ID = '1fg3ZNgCfkbk4pEJaiNt3xY5vellVGI_129lDx8v-aPI';", "  const APP_BUILD = '20260810-3';\n  const FORM_ID = '1fg3ZNgCfkbk4pEJaiNt3xY5vellVGI_129lDx8v-aPI';");
}

if (!page.includes("window.addEventListener('pageshow'")) {
  page = page.replace("  window.addEventListener('beforeunload'", "  window.addEventListener('pageshow',(event)=>{\n    if(event.persisted){\n      const url=new URL(window.location.href);\n      url.searchParams.set('v',APP_BUILD);\n      window.location.replace(url.toString());\n    }\n  });\n\n  window.addEventListener('beforeunload'");
}

// Defesa adicional: a copy antiga não pode sobreviver em nenhuma versão atual.
page = page.replace(/O envio demorou mais que o esperado\. Suas respostas continuam nesta tela; tente novamente\./g, 'O envio está levando mais tempo que o habitual. Aguarde a confirmação antes de sair desta página.');
page = page.replace(/setStatus\('error','O envio demorou mais que o esperado\.[^']*'\)/g, "setStatus('waiting','O envio está levando mais tempo que o habitual. Aguarde a confirmação antes de sair desta página.')");

await writeFile('index.html', index);
await writeFile('anamnese.html', page);
console.log('Cache-busting e proteção contra bfcache aplicados.');
