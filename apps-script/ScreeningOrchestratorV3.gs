/**
 * ScreeningOrchestratorV3.gs
 * Converte uma submissão persistida em scoring + relatório + integrações.
 * Nunca decide se a resposta deve ser persistida: roda SOMENTE após submit() confirmado.
 */

const SCREENING_INSTRUMENT_META_V3 = Object.freeze({
  geral:{name:"RAC-5TR",shortName:"RAC-5TR",version:"RC-2026"},
  tdah:{name:"TDAH Adulto — EIR-TDAH-A",shortName:"TDAH Adulto — EIR-TDAH-A",version:"RC-2026"},
  bipolar:{name:"Bipolaridade — TAB",shortName:"Bipolaridade — TAB",version:"RC-2026"},
  borderline:{name:"Traços Borderline",shortName:"Traços Borderline",version:"RC-2026"},
  narcisismo:{name:"Traços Narcísicos",shortName:"Traços Narcísicos",version:"RC-2026"},
  impulsividade:{name:"Impulsividade — BIS-11",shortName:"Impulsividade — BIS-11",version:"BIS-11"},
  esquemas:{name:"Esquemas",shortName:"Esquemas",version:"RC-2026"},
  modos:{name:"Modos Esquemáticos",shortName:"Modos Esquemáticos",version:"RC-2026"},
  necessidades:{name:"Necessidades Emocionais",shortName:"Necessidades Emocionais",version:"RC-2026"},
  codependencia:{name:"Codependência",shortName:"Codependência",version:"RC-2026"},
  icaps:{name:"ICAPS — Prontidão para Separação",shortName:"ICAPS — Prontidão para Separação",version:"2.0.0"},
  risco:{name:"Risco Suicida — EIR-RS",shortName:"Risco Suicida — EIR-RS",version:"RC-2026"},
  humor:{name:"Depressão — BDI-II",shortName:"Depressão — BDI-II",version:"BDI-II"},
  ansiedade:{name:"Ansiedade",shortName:"Ansiedade",version:"autorrelato adaptado"},
  autoestima:{name:"Autoestima — RSES",shortName:"Autoestima — RSES",version:"RSES-BR"},
});

const SCREENING_EVIDENCE_V5 = Object.freeze({
  geral:{evidenceClass:"C",status:"Exploratório/descritivo",note:"Instrumento integrativo próprio; usar como organização dimensional, sem corte diagnóstico."},
  tdah:{evidenceClass:"C",status:"Exploratório/descritivo",note:"Rastreio dimensional próprio; não equivale a ASRS, DIVA-5 ou diagnóstico de TDAH."},
  bipolar:{evidenceClass:"B",status:"Triagem composta contextual",note:"Integra componentes de rastreio conhecidos; interpretação depende de curso temporal, prejuízo e diagnóstico diferencial."},
  borderline:{evidenceClass:"C",status:"Provisório/dimensional",note:"Instrumento local sem ponto de corte psicométrico validado; interpretar apenas de forma dimensional."},
  narcisismo:{evidenceClass:"C",status:"Provisório/dimensional",note:"Bateria local integrada; não converter contagens e médias em probabilidade diagnóstica."},
  impulsividade:{evidenceClass:"A",status:"Padronizado/dimensional",note:"BIS-11 com escore total e fatores; sem ponto de corte diagnóstico automático."},
  esquemas:{evidenceClass:"B",status:"Clínico/operacional",note:"Mapeamento item→esquema versionado; faixas são operacionais e exigem formulação clínica."},
  modos:{evidenceClass:"B",status:"Clínico/dimensional",note:"SMI em perfil dimensional; percentuais não devem ser tratados como gravidade diagnóstica."},
  necessidades:{evidenceClass:"C",status:"Exploratório/descritivo",note:"Escala clínica local; priorizar perfil relativo dos domínios, não rótulos de deficiência."},
  codependencia:{evidenceClass:"C",status:"Exploratório/descritivo",note:"Dois blocos descritivos, sem ponto de corte validado no sistema."},
  icaps:{evidenceClass:"C",status:"Clínico local/descritivo",note:"Seis dimensões 0–100; não determina decisão conjugal e não possui ponto de corte psicométrico validado."},
  risco:{evidenceClass:"D",status:"Alta criticidade/revisão obrigatória",note:"Instrumento local de apoio. Nunca deve declarar ausência de risco nem substituir avaliação clínica de risco."},
  humor:{evidenceClass:"A",status:"Padronizado",note:"BDI-II: escore de intensidade; qualquer endosso do item de suicídio exige avaliação contextual."},
  ansiedade:{evidenceClass:"B",status:"Adaptação de autorrelato",note:"Estrutura HAM-A adaptada para autorrelato; usar longitudinalmente, sem importar automaticamente gravidade da escala clinician-rated."},
  autoestima:{evidenceClass:"A",status:"Padronizado/contínuo",note:"Rosenberg: escore contínuo; priorizar contexto e comparação longitudinal, sem corte clínico universal."},
});

function runScreeningPostProcessingV3_(context) {
  if(!context||!context.form||!context.payload||!context.formResponseId) throw new Error('ORCHESTRATOR_CONTEXT_INVALID');
  const payload=context.payload;
  const records=context.records||screeningScoringRecordsOrdered_(buildScreeningOrderedContract_(context.form).clinical,payload.responses);
  const scored=scoreScreeningV3_(payload.instrumentId,records);
  const reportInput=screeningReportInputFromScoreV3_(payload,scored,records);
  enqueueScreeningPipeline_({submissionId:payload.submissionId,instrumentId:payload.instrumentId,formResponseId:context.formResponseId});
  return processScoredScreeningPipeline_({
    submissionId:payload.submissionId,
    instrumentId:payload.instrumentId,
    formResponseId:context.formResponseId,
    scoredResult:scored,
    reportInput:reportInput
  });
}

function screeningReportInputFromScoreV3_(payload,score,records) {
  const a=payload.identity||{};
  const meta=SCREENING_INSTRUMENT_META_V3[payload.instrumentId]||{name:payload.instrumentId,shortName:payload.instrumentId,version:'vigente'};
  const sub=(score.subscales||[]).map(function(x){
    const val=x.rawScore!=null?x.rawScore:(x.score!=null?x.score:(x.mean!=null?x.mean:(x.percent!=null?x.percent+'%':'—')));
    return {name:x.title||x.name||'Domínio',score:val,classification:x.classification||''};
  });
  const flags=(score.riskFlags||[]).slice();
  const evidence=SCREENING_EVIDENCE_V5[payload.instrumentId]||{evidenceClass:'C',status:'Interpretação contextual',note:'Integrar com entrevista clínica.'};
  const urgent=flags.some(function(f){return ['CLINICAL_ALERT_REQUIRED','SUICIDE_ITEM_ENDORSED','SUICIDE_ITEM_HIGH','CRITICAL_ITEM_4','RECENT_ATTEMPT_D2_HIGH','SUICIDAL_IDEATION_PRESENT'].indexOf(f)>=0;});
  return {
    submissionId:payload.submissionId,
    patient:{name:String(a.name||'').trim(),birthDate:String(a.birthDate||'').trim()},
    instrument:{id:payload.instrumentId,name:meta.name,shortName:meta.shortName,version:meta.version},
    applicationDate:String(a.applicationDate||'').trim(),
    generatedAt:new Date().toISOString(),
    result:{
      valid:true,
      answeredCount:records.length,
      totalCount:records.length,
      rawScore:score.rawScore,
      normalizedScore:score.normalizedScore,
      classification:score.classification,
      summary:score.clinicalMeaning||'',
      subscales:sub,
      indicators:flags,
      clinicalMeaning:score.clinicalMeaning||'',
      limitations:(score.caveats||[]).slice(),
      scoringContract:(score.sourceMode||'UNSPECIFIED')+' · '+(score.scoringVersion||SCREENING_SCORING_VERSION),
      evidenceClass:evidence.evidenceClass,
      evidenceStatus:evidence.status,
      evidenceNote:evidence.note,
      technicalNote:'Processamento automatizado após persistência confirmada no Google Forms.',
      urgent:urgent
    }
  };
}

function screeningSafePostProcessError_(err) {
  const msg=String(err&&err.message?err.message:'POST_PROCESSING_ERROR');
  return msg.split(':')[0].replace(/[^A-Z0-9_-]/gi,'_').slice(0,80);
}
