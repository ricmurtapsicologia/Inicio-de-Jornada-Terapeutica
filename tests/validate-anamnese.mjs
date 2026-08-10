import { readFile } from 'node:fs/promises';

const [index, page, config, bridge] = await Promise.all([
  readFile('index.html','utf8'),
  readFile('anamnese.html','utf8'),
  readFile('anamnese-config.js','utf8'),
  readFile('apps-script/AnamneseBridge.gs','utf8'),
]);

const FORM_ID='1fg3ZNgCfkbk4pEJaiNt3xY5vellVGI_129lDx8v-aPI';
const OLD_FORM='1FAIpQLSd3VTOenTa4cqrePvGKt2-uGCzNDxpqf_A6PRwbO6llOXXnqA';
const expected=[
'Nome completo','Como você prefere ser chamado(a)?','Idade','Ocupação ou profissão','Com quem você vive atualmente?',
'O que fez você procurar terapia neste momento?','Se você pudesse me ajudar a compreender o que está mais difícil atualmente, o que me contaria?','Quanto essa situação tem afetado sua vida atualmente?','Em quais áreas da sua vida você percebe maior impacto atualmente?',
'Quando essas dificuldades aparecem, o que costuma acontecer com você?','Existem situações, pessoas ou momentos em que isso costuma ficar mais difícil?','O que você costuma fazer para lidar com isso?','Existe alguma coisa que costuma ajudar, mesmo que seja apenas um pouco?',
'Quando você pensa na sua infância, como descreveria, de forma geral, o ambiente em que cresceu?','Quem foram as pessoas mais importantes na sua criação e como você se lembra da relação com elas?','Quando você estava triste, preocupado(a), com medo ou precisava de ajuda, como as pessoas próximas costumavam reagir?','Na sua família havia espaço para falar sobre sentimentos, necessidades ou dificuldades?','Você sente que precisou amadurecer muito cedo, assumir muitas responsabilidades ou aprender a resolver as coisas sozinho(a)?','Existe alguma experiência da infância ou adolescência que você sente que ainda influencia sua vida atualmente?',
'Existe algum tipo de situação ou relacionamento que parece se repetir na sua vida, mesmo quando você gostaria que fosse diferente?','Quando algo importante dá errado, como você costuma falar consigo mesmo(a)?','O que costuma ser mais difícil para você nas relações com outras pessoas?','Existe algo sobre você que sente que as pessoas próximas nem sempre conseguem compreender?',
'O que você reconhece em você como uma força ou qualidade?','O que já ajudou você a atravessar outros períodos difíceis?','Quem ou o que representa apoio importante para você atualmente?',
'Você já fez psicoterapia anteriormente?','O que funcionou bem naquela experiência?','Existe alguma coisa que você gostaria que fosse diferente desta vez?','Existe algum acompanhamento de saúde ou condição clínica que você considera importante eu conhecer?','Faz uso atualmente de algum medicamento que considere relevante me informar?','Qual medicamento você considera importante me informar?',
'Se nosso trabalho estiver fazendo diferença na sua vida, o que você gostaria de perceber diferente daqui a alguns meses?','O que você espera encontrar neste processo de terapia?','O que ajuda você a se sentir confortável para falar sobre coisas importantes com alguém?',
'Existe neste momento alguma situação urgente relacionada à sua segurança ou à segurança de outra pessoa que você considere importante que eu saiba antes da sessão?','O que você considera importante eu saber neste momento?','Existe alguma coisa que eu não perguntei e que você gostaria que eu soubesse antes da nossa primeira sessão?'
];

if(expected.length!==38) throw new Error(`Esperadas 38 perguntas respondíveis; lista tem ${expected.length}`);
for(const title of expected){if(!page.includes(title)) throw new Error(`Pergunta ausente: ${title}`)}
if(!index.includes('href="./anamnese.html"')) throw new Error('Botão da Jornada não aponta para anamnese.html');
if(index.includes('data-target="form-anamnese2"')) throw new Error('Botão antigo de Anamnese II ainda está ativo');
if(index.includes(OLD_FORM)) throw new Error('URL da anamnese antiga ainda está no index.html');
if(!page.includes(FORM_ID)||!bridge.includes(FORM_ID)) throw new Error('Form ID oficial não está consistente entre página e bridge');
if(!page.includes('anamnese-config.js')) throw new Error('Configuração da ponte não é carregada');
if(!config.includes('ANAMNESE_BRIDGE_URL')) throw new Error('Configuração da URL da ponte ausente');
const submitPos=bridge.indexOf('formResponse.submit();');
const successPos=bridge.indexOf("return bridgeHtml_({ ok: true, submissionId: payload.submissionId });");
if(submitPos<0||successPos<0||submitPos>successPos) throw new Error('Bridge sinaliza sucesso antes de salvar no Forms');
if(!bridge.includes('HtmlService.XFrameOptionsMode.ALLOWALL')) throw new Error('Bridge não está liberado para iframe de transporte');
if(!bridge.includes("CacheService.getScriptCache()")) throw new Error('Idempotência por submissionId ausente');
console.log('Anamnese gate: PASS — 38 perguntas, Forms oficial, anamnese antiga removida e bridge consistente.');
