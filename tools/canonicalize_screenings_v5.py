#!/usr/bin/env python3
from __future__ import annotations
import json, pathlib, re, hashlib

ROOT=pathlib.Path(__file__).resolve().parents[1]
NAMES={
'geral':'RAC-5TR',
'tdah':'TDAH Adulto — EIR-TDAH-A',
'bipolar':'Bipolaridade — TAB',
'borderline':'Traços Borderline',
'narcisismo':'Traços Narcísicos',
'impulsividade':'Impulsividade — BIS-11',
'esquemas':'Esquemas',
'modos':'Modos Esquemáticos',
'necessidades':'Necessidades Emocionais',
'codependencia':'Codependência',
'icaps':'ICAPS — Prontidão para Separação',
'risco':'Risco Suicida — EIR-RS',
'humor':'Depressão — BDI-II',
'ansiedade':'Ansiedade',
'autoestima':'Autoestima — RSES'
}
EVIDENCE={
'geral':('C','Exploratório/descritivo','Instrumento integrativo próprio; usar como organização dimensional, sem corte diagnóstico.'),
'tdah':('C','Exploratório/descritivo','Rastreio dimensional próprio; não equivale a ASRS, DIVA-5 ou diagnóstico de TDAH.'),
'bipolar':('B','Triagem composta contextual','Integra componentes de rastreio conhecidos; interpretação depende de curso temporal, prejuízo e diagnóstico diferencial.'),
'borderline':('C','Provisório/dimensional','Instrumento local sem ponto de corte psicométrico validado; interpretar apenas de forma dimensional.'),
'narcisismo':('C','Provisório/dimensional','Bateria local integrada; não converter contagens e médias em probabilidade diagnóstica.'),
'impulsividade':('A','Padronizado/dimensional','BIS-11 com escore total e fatores; sem ponto de corte diagnóstico automático.'),
'esquemas':('B','Clínico/operacional','Mapeamento item→esquema versionado; faixas são operacionais e exigem formulação clínica.'),
'modos':('B','Clínico/dimensional','SMI em perfil dimensional; percentuais não devem ser tratados como gravidade diagnóstica.'),
'necessidades':('C','Exploratório/descritivo','Escala clínica local; priorizar perfil relativo dos domínios, não rótulos de deficiência.'),
'codependencia':('C','Exploratório/descritivo','Dois blocos descritivos, sem ponto de corte validado no sistema.'),
'icaps':('C','Clínico local/descritivo','Seis dimensões 0–100; não determina decisão conjugal e não possui ponto de corte psicométrico validado.'),
'risco':('D','Alta criticidade/revisão obrigatória','Instrumento local de apoio. Nunca deve declarar ausência de risco nem substituir avaliação clínica de risco.'),
'humor':('A','Padronizado','BDI-II: escore de intensidade; qualquer endosso do item de suicídio exige avaliação contextual.'),
'ansiedade':('B','Adaptação de autorrelato','Estrutura HAM-A adaptada para autorrelato; usar longitudinalmente, sem importar automaticamente gravidade da escala clinician-rated.'),
'autoestima':('A','Padronizado/contínuo','Rosenberg: escore contínuo; priorizar contexto e comparação longitudinal, sem corte clínico universal.')
}
ALT={
'geral':'Checklist e materiais de avaliação clínica organizados sobre uma mesa, sem retratos.',
'tdah':'Mesa de trabalho com agenda, lembretes e organização de tarefas, sem retratos.',
'bipolar':'Calendário e relógio representando ritmo, sono e curso temporal, sem retratos.',
'borderline':'Espelho fragmentado representando identidade e integração de experiências, sem retratos.',
'narcisismo':'Espelho e objetos de autorrepresentação em composição sóbria, sem retratos.',
'impulsividade':'Ampulheta representando a pausa entre impulso, decisão e ação, sem retratos.',
'esquemas':'Quadro com cartões agrupados representando padrões recorrentes e formulação, sem retratos.',
'modos':'Mesa de formulação com cartões e estados organizados, sem retratos.',
'necessidades':'Caderno em ambiente acolhedor representando segurança, vínculo e cuidado, sem retratos.',
'codependencia':'Nó em cordas representando vínculo, limites e autonomia, sem retratos.',
'icaps':'Sinalização de duas direções representando decisão e prontidão para mudança, sem retratos.',
'risco':'Telefone e bloco de plano de segurança em mesa de apoio, sem imagens de método ou gatilho.',
'humor':'Imagem sóbria de baixa energia e recolhimento usada no BDI-II, preservada por adequação clínica.',
'ansiedade':'Fio emaranhado representando tensão, antecipação e dificuldade de relaxamento, sem retratos.',
'autoestima':'Caderno de autorreflexão e flores em composição neutra, sem retratos.'
}


def replace_between(text:str,start_marker:str,end_marker:str,new_block:str)->str:
    a=text.find(start_marker)
    if a<0: raise RuntimeError(f'marker ausente: {start_marker}')
    b=text.find(end_marker,a)
    if b<0: raise RuntimeError(f'marker final ausente: {end_marker}')
    return text[:a]+new_block.rstrip()+"\n\n"+text[b:]

# 1) Fonte pública e nomes canônicos
cfg_path=ROOT/'assets/screening-public-experience-v2.json'
cfg=json.loads(cfg_path.read_text(encoding='utf-8'))
cfg['schemaVersion']='2.2.0'
for k,name in NAMES.items():
    inst=cfg['instruments'][k]
    inst['publicName']=name
    inst['evidenceClass']=EVIDENCE[k][0]
    inst['interpretiveStatus']=EVIDENCE[k][1]
    inst['evidenceNote']=EVIDENCE[k][2]
    # Não liberar produção por inferência. Gates de Forms/E2E continuam obrigatórios.
cfg_path.write_text(json.dumps(cfg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 2) Catálogo da Jornada: mesmo nome do hero, curto e estável
cat_path=ROOT/'assets/screening-catalog-v3.js'
cat=cat_path.read_text(encoding='utf-8')
cat=re.sub(r"version:'[^']+'", "version:'3.3.0'", cat, count=1)
for k,name in NAMES.items():
    pattern=r"(\{id:'"+re.escape(k)+r"',[^\n]*?name:')[^']*(')"
    cat,n=re.subn(pattern,lambda m:m.group(1)+name+m.group(2),cat,count=1)
    if n!=1: raise RuntimeError('nome não atualizado no catálogo: '+k)
cat_path.write_text(cat,encoding='utf-8')

# 3) Visual: 15 fotos temáticas locais, sem créditos externos e sem duplicidade de header legado
vis_path=ROOT/'assets/screening-visual-v4.js'
vis=vis_path.read_text(encoding='utf-8')
vis=re.sub(r"const VERSION='[^']+';", "const VERSION='5.0.0-clinical-photo-curation';",vis,count=1)
alt_js='const ALT={'+','.join("%s:%s"%(k,json.dumps(v,ensure_ascii=False)) for k,v in ALT.items())+'};'
vis=re.sub(r"const ALT=\{.*?\};\nfunction id",alt_js+'\nfunction id',vis,count=1,flags=re.S)
vis=vis.replace(".jpg?v=4.0.0", ".jpg?v=5.0.0")
# Defesa final: remove cabeçalho top-level legado apenas em páginas dos rastreios; shell é injetado separadamente.
vis=vis.replace("function removeLegacy(){const shell=document.querySelector('.rm-screening-shell');document.querySelectorAll('main>.hero,.container>.hero,.wrapper>.hero,.hero-banner,.legacy-hero,.instrument-hero,.hero-image,.banner-image,.banner-wrap').forEach(el=>{if(!(shell&&shell.contains(el)))el.remove()});}",
"function removeLegacy(){const shell=document.querySelector('.rm-screening-shell');document.querySelectorAll('body>header,main>.hero,.container>.hero,.wrapper>.hero,.hero-banner,.legacy-hero,.instrument-hero,.hero-image,.banner-image,.banner-wrap').forEach(el=>{if(!(shell&&shell.contains(el))&&!el.matches('[data-rm-keep-header]'))el.remove()});}")
vis_path.write_text(vis,encoding='utf-8')

loader_path=ROOT/'assets/screening-uniformity-v1.js'
loader=loader_path.read_text(encoding='utf-8').replace('window.RM_SCREENING_V4_CLIENT=true','window.RM_SCREENING_V5_CLIENT=true').replace('screening-visual-v4.js?v=4.0.0','screening-visual-v4.js?v=5.0.0').replace("'data-rm-visual-v4'","'data-rm-visual-v5'")
loader_path.write_text(loader,encoding='utf-8')

# 4) Metadados do relatório e nomes do backend
orch_path=ROOT/'apps-script/ScreeningOrchestratorV3.gs'
orch=orch_path.read_text(encoding='utf-8')
meta_lines=['const SCREENING_INSTRUMENT_META_V3 = Object.freeze({']
for k,name in NAMES.items():
    version={'impulsividade':'BIS-11','icaps':'2.0.0','humor':'BDI-II','ansiedade':'autorrelato adaptado','autoestima':'RSES-BR'}.get(k,'RC-2026')
    meta_lines.append("  %s:{name:%s,shortName:%s,version:%s},"%(k,json.dumps(name,ensure_ascii=False),json.dumps(name,ensure_ascii=False),json.dumps(version,ensure_ascii=False)))
meta_lines.append('});')
orch=re.sub(r"const SCREENING_INSTRUMENT_META_V3 = Object\.freeze\(\{.*?\}\);",'\n'.join(meta_lines),orch,count=1,flags=re.S)
evid_lines=['const SCREENING_EVIDENCE_V5 = Object.freeze({']
for k,(cl,status,note) in EVIDENCE.items():
    evid_lines.append("  %s:{evidenceClass:%s,status:%s,note:%s},"%(k,json.dumps(cl),json.dumps(status,ensure_ascii=False),json.dumps(note,ensure_ascii=False)))
evid_lines.append('});')
if 'SCREENING_EVIDENCE_V5' not in orch:
    insert='\n'.join(evid_lines)+'\n\n'
    pos=orch.find('function runScreeningPostProcessingV3_')
    orch=orch[:pos]+insert+orch[pos:]
orch=orch.replace("  const flags=(score.riskFlags||[]).slice();", "  const flags=(score.riskFlags||[]).slice();\n  const evidence=SCREENING_EVIDENCE_V5[payload.instrumentId]||{evidenceClass:'C',status:'Interpretação contextual',note:'Integrar com entrevista clínica.'};")
orch=orch.replace("      scoringContract:(score.sourceMode||'UNSPECIFIED')+' · '+(score.scoringVersion||SCREENING_SCORING_VERSION),", "      scoringContract:(score.sourceMode||'UNSPECIFIED')+' · '+(score.scoringVersion||SCREENING_SCORING_VERSION),\n      evidenceClass:evidence.evidenceClass,\n      evidenceStatus:evidence.status,\n      evidenceNote:evidence.note,")
orch_path.write_text(orch,encoding='utf-8')

# 5) Scoring: retirar falsas certezas e pontos de corte locais não validados
score_path=ROOT/'apps-script/ScreeningScoringV3.gs'
score=score_path.read_text(encoding='utf-8').replace("const SCREENING_SCORING_VERSION = '3.0.0-rc';","const SCREENING_SCORING_VERSION = '3.1.0';")

bipolar="""// 3. Bateria bipolar: componentes de triagem; convergência exige curso temporal e diagnóstico diferencial.
function scoreBipolarV3_(r){
  if(r.length!==77) throw new Error('BIPOLAR_COUNT:'+r.length);
  let p=0;
  const mdqItems=r.slice(p,p+13);p+=13; const mdqSim=r[p++],mdqImp=r[p++];
  const mdqYes=mdqItems.filter(scYes_).length, simult=scYes_(mdqSim), imp=String(mdqImp.response||'').toLowerCase();
  const mdqMeets=mdqYes>=7 && simult && (imp.indexOf('moderado')>=0||imp.indexOf('grave')>=0);
  const hcl=r.slice(p,p+32);p+=32; const hclYes=hcl.filter(scYes_).length;
  const hclReference=hclYes>=14?'acima de limiar de referência para aprofundamento':'abaixo do limiar de referência';
  const bs=r.slice(p,p+19);p+=19; const bsYes=bs.filter(scYes_).length; const fit=String(r[p++].response||'');
  const fitMap={'Tem tudo ou quase tudo (+6)':6,'Tem mais ou menos (+4)':4,'Tem pouco (+2)':2,'Nada (+0)':0};
  const bsTotal=bsYes+(fitMap[fit]||0),bsTier=bsTotal>=20?'faixa de referência elevada':(bsTotal>=13?'faixa intermediária de referência':'abaixo da faixa de referência');
  const mini12=r.slice(p,p+2);p+=2, mini3=r.slice(p,p+7);p+=7, dur=String(r[p++].response||'');
  const gate=mini12.every(scYes_),d3=mini3.filter(scYes_).length,mania=gate&&d3>=3&&dur.indexOf('7')>=0,hypo=gate&&d3>=3&&!mania;
  const convergent=mdqMeets||hclYes>=14||bsTotal>=13||mania||hypo;
  return {sourceMode:'SCREENING_BATTERY_CONTEXT_DEPENDENT',classification:convergent?'Indicadores para aprofundamento clínico':'Sem convergência clara nos rastreios',subscales:[
    {title:'MDQ',rawScore:mdqYes,maxScore:13,classification:mdqMeets?'critério de rastreio atendido':'critério de rastreio não atendido'},
    {title:'HCL-32',rawScore:hclYes,maxScore:32,classification:hclReference},
    {title:'BSDS',rawScore:bsTotal,maxScore:25,classification:bsTier},
    {title:'MINI — módulo bipolar',rawScore:d3,maxScore:7,classification:!gate?'porta de entrada negativa':(mania||hypo?'respostas que requerem aprofundamento':'respostas insuficientes para o conjunto de referência')}
  ],clinicalMeaning:'Os instrumentos são triagens. A interpretação depende de episodicidade, duração, mudança do funcionamento habitual, prejuízo, uso de substâncias, sono, medicamentos e diagnóstico diferencial.',caveats:['O limiar do HCL-32 varia conforme população e finalidade; não tratar uma contagem isolada como diagnóstico.','MDQ, HCL-32 e BSDS são instrumentos de rastreio; convergência aumenta prioridade de entrevista clínica, não certeza diagnóstica.']};
}
"""
score=replace_between(score,'// 3. Bateria bipolar:','// 4. Borderline:',bipolar)

borderline="""// 4. Borderline: perfil dimensional local; cortes proporcionais antigos foram retirados por não serem psicometricamente validados.
function scoreBorderlineV3_(r){
  if(r.length!==47) throw new Error('BORDERLINE_COUNT:'+r.length);
  const rev={4:1,10:1,16:1,30:1,36:1}; let sum=0;
  r.forEach(function(x,i){var v=scIdx_(x)+1;if(rev[i+1])v=5-v;sum+=v;});
  const min=47,max=188,normalized=Math.round((sum-min)/(max-min)*100);
  return {sourceMode:'PROVISIONAL_LOCAL_DIMENSIONAL',rawScore:sum,maxScore:max,normalizedScore:normalized,classification:'Perfil dimensional sem corte validado',subscales:[],clinicalMeaning:'O escore descreve intensidade relativa das respostas no instrumento local e deve ser integrado a padrões persistentes, funcionamento, contexto e entrevista clínica.',caveats:['Não há ponto de corte psicométrico validado para converter este escore local em gravidade ou diagnóstico.','Não usar o resultado isoladamente para concluir transtorno de personalidade borderline.'],riskFlags:[]};
}
"""
score=replace_between(score,'// 4. Borderline:','// 5. Narcisismo:',borderline)

narc="""// 5. Narcisismo: bateria local integrada; médias e contagens permanecem descritivas, sem probabilidade diagnóstica automática.
function scoreNarcisismoV3_(r){
  if(r.length!==112) throw new Error('NARC_COUNT:'+r.length); let p=0;
  const npi=r.slice(p,p+16);p+=16; const npiYes=npi.filter(scYes_).length;
  const pid=r.slice(p,p+25);p+=25,pidVals=pid.map(function(x){return scNum_(x,0,3);}); const ant=[16,19,21,24,22].map(function(n){return pidVals[n-1];});
  const pidMean=scMean_(pidVals),antMean=scMean_(ant);
  const ff=r.slice(p,p+60);p+=60,ffVals=ff.map(function(x){return scNum_(x,1,5);}); [19,27,38].forEach(function(n){ffVals[n-1]=6-ffVals[n-1];});
  const vul=[12,27,42,57,13,28,43,58,14,29,44,59].map(function(n){return n-1;}),vset={};vul.forEach(function(i){vset[i]=1;});
  const gra=ffVals.filter(function(_,i){return !vset[i];}),ffMean=scMean_(ffVals),vMean=scMean_(vul.map(function(i){return ffVals[i];})),gMean=scMean_(gra);
  const mini=r.slice(p,p+11),yes=mini.slice(0,9).filter(scYes_).length,perv=scYes_(mini[9]),imp=scYes_(mini[10]);
  return {sourceMode:'LOCAL_BATTERY_DESCRIPTIVE',classification:'Perfil dimensional descritivo',subscales:[
    {title:'NPI-16 — contagem',rawScore:npiYes,maxScore:16,classification:'descritivo'},
    {title:'PID-5-BF — média global',mean:scRound_(pidMean,2),classification:'descritivo'},
    {title:'PID-5-BF — antagonismo',mean:scRound_(antMean,2),classification:'descritivo'},
    {title:'FFNI-SF — média total',mean:scRound_(ffMean,2),classification:'descritivo'},
    {title:'FFNI-SF — grandiosidade',mean:scRound_(gMean,2),classification:'descritivo'},
    {title:'FFNI-SF — vulnerabilidade',mean:scRound_(vMean,2),classification:'descritivo'},
    {title:'Critérios autorreferidos — contagem',rawScore:yes,maxScore:9,classification:(perv&&imp)?'com pervasividade e impacto autorreferidos':'sem confirmação simultânea de pervasividade e impacto'}
  ],clinicalMeaning:'A bateria organiza dimensões de autoimagem, reconhecimento, grandiosidade, vulnerabilidade, antagonismo e impacto interpessoal. Não estima probabilidade diagnóstica.',caveats:['Faixas locais antigas foram removidas por não constituírem pontos de corte validados.','Traços narcisistas existem dimensionalmente e requerem integração com história, funcionamento, contexto e avaliação clínica.']};
}
"""
score=replace_between(score,'// 5. Narcisismo:','// 6. BIS-11:',narc)

modes="""// 8. Modos: mapeamento vigente SMI 124; percentuais são descritivos, sem faixas automáticas de gravidade.
function scoreModosV3_(r){
  if(r.length!==124) throw new Error('MODES_COUNT:'+r.length); const v=r.map(function(x){return scNum_(x,1,6);});
  const map={
    'Criança Vulnerável':[4,6,36,50,67,71,105,106,111,119],'Criança Zangada':[22,42,47,49,56,63,76,79,103,109],
    'Criança Raivosa':[14,25,26,46,54,60,92,98,101,123],'Criança Impulsiva':[12,15,35,40,66,69,78,97,110],
    'Criança Indisciplinada':[13,21,30,65,70,107],'Criança Feliz':[2,17,19,48,61,68,95,96,113,122],
    'Capitulador Complacente':[8,18,37,38,55,100,108],'Protetor Desligado':[28,33,34,39,43,59,64,75,88],
    'Auto-confortador Desligado':[41,52,57,86],'Autoengrandece':[10,11,27,31,44,74,81,89,91,114],
    'Intimidação e Ataque':[1,24,32,53,77,93,99,102,112],'Pais Punitivos':[3,5,9,16,58,72,84,87,94,118],
    'Pais Exigentes/Críticos':[7,23,45,51,82,83,90,104,115,116],'Adulto Saudável':[20,29,62,73,80,85,117,120,121,124]
  };
  const sub=Object.keys(map).map(function(name){const items=map[name],total=items.reduce(function(a,n){return a+v[n-1];},0),pct=Math.round(total/(items.length*6)*100);return {title:name,percent:pct,classification:'percentual descritivo'};});
  return {sourceMode:'SOURCE_DERIVED_DIMENSIONAL',classification:'Perfil dimensional de modos',subscales:sub,clinicalMeaning:'Percentuais descrevem a presença relativa dos modos no mapeamento vigente. A leitura clínica deve considerar função, contexto, gatilhos e relação entre modos.',caveats:['Faixas automáticas de leve/moderado/grave foram removidas por não serem tratadas como pontos de corte psicométricos validados.','Modos saudáveis e disfuncionais não devem ser interpretados na mesma direção clínica.']};
}
"""
score=replace_between(score,'// 8. Modos:','// 9. Necessidades:',modes)

needs="""// 9. Necessidades: 9 domínios x 4; escore por domínio permanece descritivo.
function scoreNecessidadesV3_(r){
  if(r.length!==36) throw new Error('NEEDS_COUNT:'+r.length); const names=['Segurança e Estabilidade','Afeto e Conexão','Validação','Autonomia','Propósito e Direção','Apoio e Suporte','Expressão e Comunicação','Novidade e Desafios','Crescimento e Desenvolvimento'];
  const sub=[]; for(var d=0;d<9;d++){let vals=[];for(var j=0;j<4;j++){var x=scIdx_(r[d*4+j])+1;if(j===1||j===3)x=6-x;vals.push(x);}var score=vals.reduce(function(a,b){return a+b;},0);sub.push({title:names[d],rawScore:score,maxScore:20,percent:Math.round(score/20*100),classification:'perfil descritivo'});}
  return {sourceMode:'LOCAL_NEEDS_DESCRIPTIVE',classification:'Perfil descritivo de necessidades',subscales:sub,clinicalMeaning:'O perfil mostra diferenças relativas entre domínios para orientar exploração clínica. Não define deficiência, causa desenvolvimental ou diagnóstico.',caveats:['Faixas automáticas de necessidade fragilizada/atendida foram retiradas por ausência de ponto de corte psicométrico validado.','Associações com experiências desenvolvimentais são hipóteses a investigar, não conclusões automáticas.']};
}
"""
score=replace_between(score,'// 9. Necessidades:','// 10. Codependência:',needs)

icaps="""// 11. ICAPS: 6 dimensões x 10, normalização 0–100; resultados são dimensionais e não determinam decisão conjugal.
function scoreIcapsV3_(r){
  if(r.length!==60) throw new Error('ICAPS_COUNT:'+r.length); const names=['Satisfação Conjugal Atual','Ambivalência Decisional','Codependência e Subjugação Pessoal','Traição e Impacto Emocional','Rede de Apoio e Medos Contextuais','Recursos Internos e Prontidão para a Mudança'];
  const sub=[];for(var d=0;d<6;d++){const vals=r.slice(d*10,d*10+10).map(function(x){return (scNum_(x,1,5)-1)*25;});const score=Math.round(scMean_(vals));sub.push({title:names[d],rawScore:score,maxScore:100,classification:'escore dimensional'});}
  return {sourceMode:'LOCAL_ICAPS_DIMENSIONAL',classification:'Perfil dimensional ICAPS',subscales:sub,clinicalMeaning:'Seis dimensões normalizadas de 0–100 para organizar a reflexão clínica sobre a relação e a prontidão para mudança.',caveats:['Faixas operacionais foram removidas do relatório automático por não serem pontos de corte psicométricos validados.','O ICAPS não recomenda permanecer ou separar-se e não substitui avaliação clínica do contexto conjugal e de segurança.']};
}
"""
score=replace_between(score,'// 11. ICAPS:','// 12. BDI-II:',icaps)

hama="""// 13. HAM-A adaptada em autorrelato: 14 itens 0–4, total 0–56; uso longitudinal sem faixas clinician-rated automáticas.
function scoreHamaV3_(r){
  if(r.length!==14) throw new Error('HAMA_COUNT:'+r.length);const vals=r.map(function(x){return scIdx_(x);}),total=vals.reduce(function(a,b){return a+b;},0);
  return {sourceMode:'HAMA_STRUCTURE_ADAPTED_SELF_REPORT',rawScore:total,maxScore:56,classification:'Escore longitudinal de autorrelato',subscales:[],clinicalMeaning:'Escore total para acompanhamento longitudinal de sintomas ansiosos nesta adaptação de autorrelato.',caveats:['A HAM-A original é clinician-rated; faixas de gravidade da aplicação por clínico não foram transferidas automaticamente para esta adaptação.','Priorizar tendência longitudinal, sintomas específicos, prejuízo e entrevista clínica.']};
}
"""
score=replace_between(score,'// 13. HAM-A adaptada em autorrelato:','// 14. Rosenberg:',hama)

risk="""// 15. EIR-RS: índice técnico local + flags diretos; nunca declara ausência de risco nem substitui avaliação clínica.
function scoreRiscoV3_(r){
  if(r.length!==18) throw new Error('RISK_COUNT:'+r.length); const ids=['A1','A2','A3','A4','B1','B2','B3','B4','C1','C2','D1','D2','D3','E1','E2','E3','F1','F2'],critical={A3:1,B3:1,B4:1,C2:1,D3:1},invert={F1:1,F2:1};
  const resp={};r.forEach(function(x,i){resp[ids[i]]=scNum_(x,0,4);});let weighted=0,weight=0;ids.forEach(function(id){var v=resp[id];if(invert[id])v=4-v;var w=critical[id]?1.5:1;weighted+=v*w;weight+=w;});
  const ir=Math.round(weighted*10)/10,flags=[];
  if(['A1','A2','A3','A4'].some(function(k){return resp[k]>=1;}))flags.push('SUICIDAL_IDEATION_PRESENT');
  if(Object.keys(critical).some(function(k){return resp[k]>=3;}))flags.push('CRITICAL_ITEM_HIGH');
  if(Object.keys(critical).some(function(k){return resp[k]===4;}))flags.push('CRITICAL_ITEM_4');
  if(resp.D2>=3)flags.push('RECENT_ATTEMPT_D2_HIGH');
  if(resp.C1>=3&&resp.B3>=2)flags.push('MEANS_PLUS_PLAN');
  if(flags.length)flags.push('CLINICAL_ALERT_REQUIRED');
  return {sourceMode:'LOCAL_HIGH_STAKES_REVIEW_REQUIRED',rawScore:ir,maxScore:82,classification:'Avaliação clínica contextual obrigatória',subscales:[],clinicalMeaning:'O índice técnico organiza respostas, mas a decisão clínica deve priorizar ideação, intenção, plano/meios, tentativas recentes, fatores de proteção, acesso a suporte e sinais de iminência.',riskFlags:Array.from(new Set(flags)),caveats:['Este instrumento local não possui validação suficiente para afirmar “sem risco” com base em escore.','Qualquer sinal de iminência, intenção, plano, meios disponíveis ou tentativa recente prevalece sobre o índice numérico e requer avaliação clínica imediata.']};
}
"""
# último bloco vai até fim do arquivo
idx=score.find('// 15. EIR-RS:')
if idx<0: raise RuntimeError('bloco risco ausente')
score=score[:idx]+risk.rstrip()+"\n"
score_path.write_text(score,encoding='utf-8')

# 6) Relatório: diferenciar completude técnica de validade psicométrica e explicitar base interpretativa
report_path=ROOT/'apps-script/ScreeningReportV3.gs'
report=report_path.read_text(encoding='utf-8')
report=report.replace("sections.push(reportSection_('Completude e validade técnica'", "sections.push(reportSection_('Completude técnica'")
report=report.replace("reportRow_('Status', result.valid === false ? 'Inválido / incompleto' : 'Válido para interpretação')", "reportRow_('Status', result.valid === false ? 'Incompleto para processamento' : 'Completo para processamento')")
anchor="  sections.push(reportSection_('Resultado geral', ["
quality="""  sections.push(reportSection_('Qualidade interpretativa', [
    reportRow_('Classe de evidência interna', result.evidenceClass || '—'),
    reportRow_('Status interpretativo', result.evidenceStatus || 'Interpretação contextual'),
    result.evidenceNote ? reportParagraph_(result.evidenceNote) : ''
  ].join('')));

"""
if "'Qualidade interpretativa'" not in report:
    report=report.replace(anchor,quality+anchor)
# caveats do scorer entram em limitações; flags ganham linguagem de segurança
report=report.replace("  if (Array.isArray(result.indicators) && result.indicators.length) {\n    sections.push(reportSection_('Indicadores clinicamente relevantes', reportList_(result.indicators)));\n  }", "  if (Array.isArray(result.indicators) && result.indicators.length) {\n    const title = result.urgent === true ? 'Sinais de segurança — revisão prioritária' : 'Indicadores clinicamente relevantes';\n    sections.push(reportSection_(title, reportList_(result.indicators)));\n  }")
report_path.write_text(report,encoding='utf-8')

# 7) Auditoria de estado canônico
heroes=[]
for k,name in NAMES.items():
    p=ROOT/'assets/heroes'/f'{k}.jpg'
    if not p.exists(): raise RuntimeError('hero ausente: '+k)
    b=p.read_bytes()
    heroes.append({'id':k,'name':name,'file':str(p.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'alt':ALT[k],'evidenceClass':EVIDENCE[k][0],'interpretiveStatus':EVIDENCE[k][1],'evidenceNote':EVIDENCE[k][2]})
if len({x['sha256'] for x in heroes})!=15: raise RuntimeError('heroes duplicados por hash')

audit={
'version':'5.0.0','generatedBy':'tools/canonicalize_screenings_v5.py','scope':'Jornada Terapêutica + 15 rastreios',
'principles':['um hero por página','nome idêntico entre Jornada e hero','imagem semanticamente relacionada ao construto','sem ponto de corte inventado','rastreio não equivale a diagnóstico','alto risco nunca classificado automaticamente como ausência de risco'],
'heroes':heroes,
'globalGates':{
'heroCount':len(heroes),'uniqueHeroHashes':len({x['sha256'] for x in heroes}),'nameCount':len(NAMES),
'noLegacySvgGenerator':'HERO_SCENES' not in (ROOT/'assets/screening-system-v2.js').read_text(encoding='utf-8'),
'patientDiagnosticResultPolicy':cfg.get('patientResultPolicy'),
'productionReleasePolicy':'Somente após Forms + scorer + E2E por instrumento; nenhum productionReady foi promovido por inferência.'
}}
(ROOT/'audits/canonical-screening-v5.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(audit['globalGates'],ensure_ascii=False,indent=2))
