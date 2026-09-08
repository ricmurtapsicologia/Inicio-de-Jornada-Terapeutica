from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

CATALOG = r'''(()=>{
'use strict';
const catalog={
  version:'3.1.0',count:15,
  order:['Geral','Neurodesenvolvimento','Humor','Personalidade','Dimensões clínicas','Terapia do Esquema','Relacionamentos','Monitoramento','Uso clínico restrito'],
  items:[
    {id:'geral',group:'Geral',name:'Panorama do seu momento emocional',desc:'Visão ampla do funcionamento emocional para orientar aprofundamentos em sessão.',url:'https://ricmurtapsicologia.github.io/Rastreioclinico/'},
    {id:'tdah',group:'Neurodesenvolvimento',name:'Atenção, organização e impulsividade no dia a dia',desc:'Organiza aspectos de atenção, rotina, impulsividade e história de desenvolvimento.',url:'https://ricmurtapsicologia.github.io/rastreioTDAH/'},
    {id:'bipolar',group:'Humor',name:'Oscilações de humor, energia e ritmo',desc:'Explora mudanças de humor, energia, sono, atividade e curso temporal.',url:'https://ricmurtapsicologia.github.io/tab-bateria-integrada/'},
    {id:'borderline',group:'Personalidade',name:'Emoções, identidade e relações',desc:'Organiza padrões emocionais, relacionais e de autoimagem para discussão clínica.',url:'https://ricmurtapsicologia.github.io/Inventario-de-Tracos-Borderline/'},
    {id:'narcisismo',group:'Personalidade',name:'Autoimagem, reconhecimento e relações',desc:'Explora autoimagem, reconhecimento, crítica, empatia e funcionamento interpessoal.',url:'https://ricmurtapsicologia.github.io/bateria.narcisismo/'},
    {id:'impulsividade',group:'Dimensões clínicas',name:'Decisão, planejamento e controle de impulsos',desc:'Mapeia aspectos de planejamento, tomada de decisão e controle de impulsos.',url:'https://ricmurtapsicologia.github.io/Rastreio-de-Impulsividade/'},
    {id:'esquemas',group:'Terapia do Esquema',name:'Padrões emocionais que se repetem',desc:'Mapeia padrões emocionais de longa duração relevantes para formulação clínica.',url:'https://ricmurtapsicologia.github.io/rastreio.de.esquemas/'},
    {id:'modos',group:'Terapia do Esquema',name:'Como você reage quando algo toca em pontos sensíveis?',desc:'Organiza estados emocionais e respostas de enfrentamento ativados em situações difíceis.',url:'https://ricmurtapsicologia.github.io/rastreiomodosesquematicos/'},
    {id:'necessidades',group:'Terapia do Esquema',name:'O que sustenta seu bem-estar emocional',desc:'Explora necessidades emocionais, recursos e áreas de maior fragilidade.',url:'https://ricmurtapsicologia.github.io/Escala-de-Necessidades-Emocionais/'},
    {id:'codependencia',group:'Relacionamentos',name:'Autonomia, limites e cuidado nas relações',desc:'Explora equilíbrio entre autonomia, cuidado, reciprocidade e limites.',url:'https://ricmurtapsicologia.github.io/Escala-de-Co-Depenpencia-Emocional/'},
    {id:'icaps',group:'Relacionamentos',name:'Clareza para decisões importantes no relacionamento',desc:'Organiza elementos do contexto conjugal para reflexão clínica estruturada.',url:'https://ricmurtapsicologia.github.io/ICAPS/'},
    {id:'risco',group:'Uso clínico restrito',name:'Segurança emocional no momento atual',desc:'Instrumento de uso clínico mediado pelo psicólogo responsável.',url:'https://ricmurtapsicologia.github.io/TriagemRiscoSuicidio/',restricted:true},
    {id:'humor',group:'Monitoramento',name:'Humor e sintomas depressivos nas últimas duas semanas',desc:'Monitoramento clínico com conteúdo preservado e análise pelo psicólogo.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=humor'},
    {id:'ansiedade',group:'Monitoramento',name:'Tensão e sinais de ansiedade no momento atual',desc:'Acompanhamento longitudinal de sinais ansiosos e sua variação.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=ansiedade'},
    {id:'autoestima',group:'Monitoramento',name:'Como você tem se percebido',desc:'Acompanhamento da autopercepção e autoestima durante o processo terapêutico.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=autoestima'}
  ],
  otherResources:[
    {id:'controle',name:'Dados para continuidade do atendimento',desc:'Cadastro clínico e administrativo para organização do atendimento.',url:'./monitoramento.html?instrument=controle'},
    {id:'anamnese',name:'Anamnese',desc:'Levantamento inicial estruturado da história clínica.',url:'./anamnese.html'},
    {id:'guia',name:'Guia de Apoio à Saúde Mental',desc:'Material psicoeducativo de apoio, sem função de rastreio.',url:'https://ricmurtapsicologia.github.io/Guia-de-Apoio-a-Saude-Mental/'}
  ]
};
if(catalog.items.length!==catalog.count) throw new Error('SCREENING_CATALOG_COUNT_DRIFT');
window.RM_SCREENING_CATALOG=Object.freeze(catalog);
})();
'''

INTEGRATIONS = r'''/**
 * ScreeningIntegrationsV3.gs
 * Entrega operacional canônica dos rastreios: relatório clínico por e-mail.
 */
function sendScreeningReportEmail_(report) {
  const props = PropertiesService.getScriptProperties();
  const to = String(props.getProperty('REPORT_EMAIL') || '').trim();
  if (!to) throw new Error('REPORT_EMAIL_NOT_CONFIGURED');
  if (!report || !report.html || !report.subject) throw new Error('REPORT_INVALID');
  MailApp.sendEmail({
    to: to,
    subject: String(report.subject).slice(0, 240),
    htmlBody: String(report.html),
    body: String(report.plainText || 'Relatório clínico de rastreio disponível em HTML.'),
    name: 'Richelmy Murta Psicologia'
  });
  return { ok: true, channel: 'email' };
}

function screeningSubmissionRef_(submissionId) {
  const raw = String(submissionId || '');
  if (!raw) return '';
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('').slice(0, 16);
}
'''

PIPELINE = r'''/**
 * ScreeningPipelineV3.gs
 * Ledger operacional e máquina de estados pós-scoring.
 * O ledger NÃO armazena nome, respostas, escores, diagnósticos ou HTML.
 */
const SCREENING_PIPELINE = Object.freeze({
  SHEET_NAME: 'PIPELINE',
  STATES: Object.freeze(['SUBMITTED','VALIDATED','SCORED','REPORT_GENERATED','EMAIL_SENT','COMPLETE']),
  HEADERS: Object.freeze(['SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS','EMAIL_SENT_AT','ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT'])
});
const SCREENING_PIPELINE_LEGACY_HEADERS = Object.freeze(['SUBMISSION_REF','INSTRUMENT_ID','FORM_RESPONSE_ID','STATUS','EMAIL_SENT_AT','TRELLO_UPDATED_AT','ATTEMPTS','LAST_ERROR_CODE','UPDATED_AT']);

function setupScreeningPipelineLedger() { return setupScreeningPipelineLedger_(); }
function setupScreeningPipelineLedger_() {
  const props=PropertiesService.getScriptProperties();
  let spreadsheetId=String(props.getProperty('SCREENING_LEDGER_SHEET_ID')||'').trim();
  let ss;
  if(spreadsheetId) ss=SpreadsheetApp.openById(spreadsheetId);
  else { ss=SpreadsheetApp.create('Rastreios — Pipeline Clínico V3'); spreadsheetId=ss.getId(); props.setProperty('SCREENING_LEDGER_SHEET_ID',spreadsheetId); }
  let sheet=ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);
  if(!sheet) sheet=ss.insertSheet(SCREENING_PIPELINE.SHEET_NAME);
  ensureScreeningPipelineSchema_(sheet);
  return {spreadsheetId:spreadsheetId,sheetName:SCREENING_PIPELINE.SHEET_NAME};
}
function ensureScreeningPipelineSchema_(sheet) {
  const expected=SCREENING_PIPELINE.HEADERS,lastRow=sheet.getLastRow(),lastCol=sheet.getLastColumn();
  if(lastRow===0||lastCol===0){sheet.getRange(1,1,1,expected.length).setValues([expected]);sheet.setFrozenRows(1);return;}
  const current=sheet.getRange(1,1,1,lastCol).getValues()[0].map(v=>String(v||''));
  if(current.length===expected.length&&current.join('|')===expected.join('|'))return;
  if(current.length>=SCREENING_PIPELINE_LEGACY_HEADERS.length&&current.slice(0,SCREENING_PIPELINE_LEGACY_HEADERS.length).join('|')===SCREENING_PIPELINE_LEGACY_HEADERS.join('|')){
    const rows=lastRow>1?sheet.getRange(2,1,lastRow-1,SCREENING_PIPELINE_LEGACY_HEADERS.length).getValues():[];
    const migrated=rows.map(v=>[v[0],v[1],v[2],v[3],v[4],v[6],v[7],v[8]]);
    sheet.clearContents();sheet.getRange(1,1,1,expected.length).setValues([expected]);
    if(migrated.length)sheet.getRange(2,1,migrated.length,expected.length).setValues(migrated);
    sheet.setFrozenRows(1);return;
  }
  throw new Error('SCREENING_LEDGER_SCHEMA_UNEXPECTED');
}
function enqueueScreeningPipeline_(meta){const safe=screeningPipelineSafeMeta_(meta),sheet=screeningPipelineSheet_(),row=findScreeningPipelineRow_(sheet,safe.submissionRef);if(row)return readScreeningPipelineRow_(sheet,row);sheet.appendRow([safe.submissionRef,safe.instrumentId,safe.formResponseId,'SUBMITTED','',0,'',new Date()]);return readScreeningPipelineRow_(sheet,sheet.getLastRow());}
function processScoredScreeningPipeline_(context){
  if(!context||!context.submissionId||!context.instrumentId||!context.formResponseId)throw new Error('PIPELINE_CONTEXT_INVALID');
  if(!context.scoredResult||typeof context.scoredResult!=='object')throw new Error('PIPELINE_SCORE_REQUIRED');
  if(!context.reportInput||typeof context.reportInput!=='object')throw new Error('PIPELINE_REPORT_INPUT_REQUIRED');
  const submissionRef=screeningSubmissionRef_(context.submissionId),sheet=screeningPipelineSheet_();let row=findScreeningPipelineRow_(sheet,submissionRef);
  if(!row){enqueueScreeningPipeline_({submissionId:context.submissionId,instrumentId:context.instrumentId,formResponseId:context.formResponseId});row=findScreeningPipelineRow_(sheet,submissionRef);}
  let state=readScreeningPipelineRow_(sheet,row);incrementScreeningPipelineAttempts_(sheet,row);
  try{state=advanceScreeningPipelineState_(sheet,row,state,'VALIDATED');state=advanceScreeningPipelineState_(sheet,row,state,'SCORED');const report=buildScreeningClinicalReport_(context.reportInput);if(screeningStateBefore_(state.status,'REPORT_GENERATED'))state=advanceScreeningPipelineState_(sheet,row,state,'REPORT_GENERATED');if(screeningStateBefore_(state.status,'EMAIL_SENT')){sendScreeningReportEmail_(report);markScreeningPipelineTimestamp_(sheet,row,5);state=advanceScreeningPipelineState_(sheet,row,state,'EMAIL_SENT');}if(state.status==='EMAIL_SENT')state=advanceScreeningPipelineState_(sheet,row,state,'COMPLETE');clearScreeningPipelineError_(sheet,row);return state;}catch(err){setScreeningPipelineError_(sheet,row,screeningPipelineErrorCode_(err));throw err;}
}
function screeningPipelineSafeMeta_(meta){if(!meta||typeof meta!=='object')throw new Error('PIPELINE_META_INVALID');const instrumentId=String(meta.instrumentId||'').replace(/[^a-z0-9_-]/gi,'').slice(0,40),submissionRef=screeningSubmissionRef_(meta.submissionId),formResponseId=String(meta.formResponseId||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,180);if(!instrumentId||!submissionRef||!formResponseId)throw new Error('PIPELINE_META_INCOMPLETE');return{instrumentId,submissionRef,formResponseId};}
function screeningPipelineSheet_(){const props=PropertiesService.getScriptProperties(),id=String(props.getProperty('SCREENING_LEDGER_SHEET_ID')||'').trim();if(!id)throw new Error('SCREENING_LEDGER_NOT_CONFIGURED');const ss=SpreadsheetApp.openById(id),sheet=ss.getSheetByName(SCREENING_PIPELINE.SHEET_NAME);if(!sheet)throw new Error('SCREENING_LEDGER_TAB_MISSING');ensureScreeningPipelineSchema_(sheet);return sheet;}
function findScreeningPipelineRow_(sheet,submissionRef){if(sheet.getLastRow()<2)return 0;const values=sheet.getRange(2,1,sheet.getLastRow()-1,1).getValues();for(let i=0;i<values.length;i++)if(String(values[i][0])===submissionRef)return i+2;return 0;}
function readScreeningPipelineRow_(sheet,row){const v=sheet.getRange(row,1,1,SCREENING_PIPELINE.HEADERS.length).getValues()[0];return{submissionRef:String(v[0]||''),instrumentId:String(v[1]||''),formResponseId:String(v[2]||''),status:String(v[3]||''),emailSentAt:v[4]||'',attempts:Number(v[5]||0),lastErrorCode:String(v[6]||''),updatedAt:v[7]||''};}
function advanceScreeningPipelineState_(sheet,row,current,target){const currentIndex=SCREENING_PIPELINE.STATES.indexOf(current.status),targetIndex=SCREENING_PIPELINE.STATES.indexOf(target);if(targetIndex<0)throw new Error('PIPELINE_TARGET_INVALID');if(currentIndex>targetIndex||currentIndex===targetIndex)return current;if(targetIndex!==currentIndex+1)throw new Error('PIPELINE_STATE_JUMP');sheet.getRange(row,4).setValue(target);sheet.getRange(row,8).setValue(new Date());return readScreeningPipelineRow_(sheet,row);}
function screeningStateBefore_(status,target){return SCREENING_PIPELINE.STATES.indexOf(status)<SCREENING_PIPELINE.STATES.indexOf(target);}
function incrementScreeningPipelineAttempts_(sheet,row){const cell=sheet.getRange(row,6);cell.setValue(Number(cell.getValue()||0)+1);sheet.getRange(row,8).setValue(new Date());}
function markScreeningPipelineTimestamp_(sheet,row,column){sheet.getRange(row,column).setValue(new Date());sheet.getRange(row,8).setValue(new Date());}
function setScreeningPipelineError_(sheet,row,code){sheet.getRange(row,7).setValue(String(code||'PIPELINE_ERROR').slice(0,80));sheet.getRange(row,8).setValue(new Date());}
function clearScreeningPipelineError_(sheet,row){sheet.getRange(row,7).clearContent();sheet.getRange(row,8).setValue(new Date());}
function screeningPipelineErrorCode_(err){return String(err&&err.message?err.message:'PIPELINE_ERROR').split(':')[0].slice(0,80);}
'''

JOURNEY_SECTION = '''        <!-- Rastreios e recursos clínicos -->
        <section class="section-shell content" id="forms" aria-labelledby="sec-formularios">
            <h2 id="sec-formularios" class="section-title">Rastreios e monitoramentos clínicos</h2>
            <p class="content-description">Esta área reúne os <strong>15 instrumentos clínicos canônicos</strong> utilizados no acompanhamento. Cada opção abre sua página própria; os dados são processados para análise clínica do psicólogo responsável.</p>
            <p class="catalog-meta"><strong id="screeningCount">15</strong> rastreios e monitoramentos · catálogo único da Jornada Terapêutica</p>
            <div class="form-links" id="screeningCanonicalGrid" aria-label="15 rastreios e monitoramentos clínicos"></div>
            <div class="resources-subsection" aria-labelledby="sec-outros-recursos">
                <h3 id="sec-outros-recursos">Outros recursos clínicos</h3>
                <p>Recursos de cadastro, anamnese e apoio psicoeducativo. Eles não integram a contagem dos 15 rastreios.</p>
                <div class="form-links form-links--resources" id="otherResourcesGrid"></div>
            </div>
            <p class="final-words">Em caso de dúvida sobre qual instrumento utilizar, confirme com o psicólogo responsável antes do preenchimento. Rastreios apoiam a avaliação clínica e não estabelecem diagnóstico isoladamente.</p>
        </section>

'''

CATALOG_CSS = '''        .catalog-meta { margin: -8px auto var(--s-5); text-align:center; color:var(--brand-2); font-size:.94rem; }
        .form-btn.restricted { background:#6f5a32; }
        .resources-subsection { margin-top:var(--s-6); padding-top:var(--s-5); border-top:1px solid rgba(27,127,121,.14); }
        .resources-subsection h3 { margin:0 0 var(--s-2); text-align:center; color:#355e3b; font-size:clamp(1.2rem,2vw,1.5rem); }
        .resources-subsection > p { margin:0 auto; max-width:800px; text-align:center; color:var(--muted); }
        .form-links--resources .form-btn { background:#4d6668; }

'''

RENDER_JS = '''            // Catálogo canônico compartilhado entre Jornada e Painel.
            const catalog = window.RM_SCREENING_CATALOG;
            const screeningGrid = qs("#screeningCanonicalGrid");
            const otherGrid = qs("#otherResourcesGrid");
            if (!catalog || !Array.isArray(catalog.items) || catalog.items.length !== 15) throw new Error("SCREENING_CATALOG_UNAVAILABLE");
            const renderCatalogLink = (item, restricted = false) => {
                const a = document.createElement("a");
                a.className = `form-btn${restricted ? " restricted" : ""}`;
                a.href = item.url;
                if (/^https?:/i.test(item.url)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
                const strong = document.createElement("strong"); strong.textContent = item.name; a.appendChild(strong);
                if (restricted) a.setAttribute("aria-label", `${item.name} — uso clínico restrito`);
                return a;
            };
            catalog.items.forEach(item => screeningGrid?.appendChild(renderCatalogLink(item, Boolean(item.restricted))));
            catalog.otherResources.forEach(item => otherGrid?.appendChild(renderCatalogLink(item, false)));
            const count = qs("#screeningCount"); if (count) count.textContent = String(catalog.items.length);

'''


def write(path, content):
    (ROOT / path).write_text(content, encoding='utf-8')

write('assets/screening-catalog-v3.js', CATALOG)
write('apps-script/ScreeningIntegrationsV3.gs', INTEGRATIONS)
write('apps-script/ScreeningPipelineV3.gs', PIPELINE)

# Setup: remove backend-specific Trello/GPS properties from future setup and delete legacy props when setup runs.
p = ROOT / 'apps-script/ScreeningSetupV3.gs'
s = p.read_text(encoding='utf-8')
s = s.replace("  const updates={\n    REPORT_EMAIL:'ricmurtapsicologia@gmail.com',\n    TRELLO_CARD_ID:'6a9e3f9c43f65edff401783a'\n  };", "  const updates={REPORT_EMAIL:'ricmurtapsicologia@gmail.com'};\n  ['TRELLO_KEY','TRELLO_TOKEN','TRELLO_CARD_ID','GPS_URL','GPS_WEBHOOK'].forEach(function(k){props.deleteProperty(k);});")
s = s.replace("    reportEmailConfigured:Boolean(props.getProperty('REPORT_EMAIL')),\n    trelloCardConfigured:Boolean(props.getProperty('TRELLO_CARD_ID')),\n    trelloCredentialsConfigured:Boolean(props.getProperty('TRELLO_KEY')&&props.getProperty('TRELLO_TOKEN'))", "    reportEmailConfigured:Boolean(props.getProperty('REPORT_EMAIL')),\n    legacyOperationalPropertiesRemoved:true")
p.write_text(s, encoding='utf-8')

# Hub: consume canonical shared catalog.
p = ROOT / 'painel-rastreios/index.html'
s = p.read_text(encoding='utf-8')
if '../assets/screening-catalog-v3.js' not in s:
    s = s.replace('<script>\nconst ITEMS=[', '<script src="../assets/screening-catalog-v3.js?v=20260907"></script>\n<script>\nconst ITEMS=[')
s, n = re.subn(r"const ITEMS=\[.*?\];\nconst ORDER=\[.*?\];", "const ITEMS=window.RM_SCREENING_CATALOG.items;\nconst ORDER=window.RM_SCREENING_CATALOG.order;", s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('PANEL_CATALOG_INLINE_BLOCK_NOT_FOUND')
p.write_text(s, encoding='utf-8')

# Journey: replace legacy mixed grid with canonical 15 + auxiliary resources.
p = ROOT / 'index.html'
s = p.read_text(encoding='utf-8')
start = s.index('        <!-- Seção de Formulários -->')
end = s.index('        <!-- Seção Observações -> Envio para WhatsApp -->')
s = s[:start] + JOURNEY_SECTION + s[end:]
css_start = s.index('        .forms-detail-area {')
css_end = s.index('        /* =========================\n       10) Observações (WhatsApp)')
s = s[:css_start] + CATALOG_CSS + s[css_end:]
if './assets/screening-catalog-v3.js' not in s:
    s = s.replace('    <!-- JavaScript (ES6+), preservando funcionalidades + redundâncias antifrágeis -->\n    <script type="module">', '    <!-- Catálogo canônico único dos 15 rastreios -->\n    <script src="./assets/screening-catalog-v3.js?v=20260907"></script>\n\n    <!-- JavaScript (ES6+) -->\n    <script type="module">')
anchor = '        document.addEventListener("DOMContentLoaded", () => {\n'
if RENDER_JS not in s:
    s = s.replace(anchor, anchor + RENDER_JS, 1)
js_start = s.find('            // -------------------------\n            // Formulários: abrir/fechar + lazy-load iframe (preservado)')
js_end = s.find('            // -------------------------\n            // Botão flutuante "voltar ao topo" (preservado)', js_start)
if js_start != -1 and js_end != -1:
    s = s[:js_start] + s[js_end:]
s = s.replace('<span>Formulários</span>', '<span>Rastreios</span>')
p.write_text(s, encoding='utf-8')

print('FINAL_SANITIZE_SCRIPT_DONE')
