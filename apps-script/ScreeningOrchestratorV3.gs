/**
 * ScreeningOrchestratorV3.gs
 * Converte uma submissão persistida em scoring + relatório + integrações.
 * Nunca decide se a resposta deve ser persistida: roda SOMENTE após submit() confirmado.
 */

const SCREENING_INSTRUMENT_META_V3 = Object.freeze({
  geral:{name:'Rastreio Clínico Geral',shortName:'Geral',version:'RC-2026'},
  tdah:{name:'Atenção, organização e impulsividade no dia a dia',shortName:'TDAH',version:'RC-2026'},
  bipolar:{name:'Oscilações de humor, energia e ritmo',shortName:'Bipolaridade',version:'RC-2026'},
  borderline:{name:'Emoções, identidade e relações',shortName:'Borderline',version:'RC-2026'},
  narcisismo:{name:'Autoimagem, reconhecimento e relações',shortName:'Narcisismo',version:'RC-2026'},
  impulsividade:{name:'Barratt Impulsiveness Scale – BIS-11',shortName:'BIS-11',version:'BIS-11'},
  esquemas:{name:'Mapa de Esquemas',shortName:'Esquemas',version:'RC-2026'},
  modos:{name:'Modos Esquemáticos',shortName:'Modos',version:'RC-2026'},
  necessidades:{name:'Escala de Necessidades Emocionais',shortName:'Necessidades',version:'RC-2026'},
  codependencia:{name:'Autonomia, limites e cuidado nas relações',shortName:'Relações',version:'RC-2026'},
  icaps:{name:'ICAPS – Inventário Clínico para Avaliação de Prontidão para Separação',shortName:'ICAPS',version:'2.0.0'},
  humor:{name:'Inventário de Depressão de Beck – BDI-II',shortName:'BDI-II',version:'conteúdo vigente bloqueado'},
  ansiedade:{name:'Monitoramento de Ansiedade – estrutura HAM-A',shortName:'Ansiedade',version:'autorrelato adaptado'},
  autoestima:{name:'Escala de Autoestima de Rosenberg',shortName:'Autoestima',version:'RSES-BR'},
  risco:{name:'EIR-RS – Escala Integrada de Risco de Suicídio',shortName:'Risco suicida',version:'vigente'}
});

function runScreeningPostProcessingV3_(context) {
  if (!context || !context.form || !context.payload || !context.formResponseId) throw new Error('ORCHESTRATOR_CONTEXT_INVALID');
  const payload=context.payload;
  const records=screeningScoringRecords_(context.form,payload.answers);
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
  const a=payload.answers||{};
  const meta=SCREENING_INSTRUMENT_META_V3[payload.instrumentId]||{name:payload.instrumentId,shortName:payload.instrumentId,version:'vigente'};
  const sub=(score.subscales||[]).map(function(x){
    const val=x.rawScore!=null?x.rawScore:(x.score!=null?x.score:(x.mean!=null?x.mean:(x.percent!=null?x.percent+'%':'—')));
    return {name:x.title||x.name||'Domínio',score:val,classification:x.classification||''};
  });
  const flags=(score.riskFlags||[]).slice();
  const urgent=flags.some(function(f){return ['CLINICAL_ALERT_REQUIRED','SUICIDE_ITEM_ENDORSED','SUICIDE_ITEM_HIGH','CRITICAL_ITEM_4','RECENT_ATTEMPT_D2_HIGH','SUICIDAL_IDEATION_PRESENT'].indexOf(f)>=0;});
  return {
    submissionId:payload.submissionId,
    patient:{name:String(a['Nome completo']||'').trim(),birthDate:String(a['Data de nascimento']||'').trim()},
    instrument:{id:payload.instrumentId,name:meta.name,shortName:meta.shortName,version:meta.version},
    applicationDate:String(a['Data de aplicação do rastreio']||'').trim(),
    generatedAt:new Date().toISOString(),
    result:{
      valid:true,answeredCount:records.filter(function(x){return !x.identity;}).length,totalCount:records.filter(function(x){return !x.identity;}).length,
      rawScore:score.rawScore,normalizedScore:score.normalizedScore,classification:score.classification,
      summary:score.clinicalMeaning||'',subscales:sub,indicators:flags,
      clinicalMeaning:score.clinicalMeaning||'',limitations:(score.caveats||[]).slice(),
      scoringContract:(score.sourceMode||'UNSPECIFIED')+' · '+(score.scoringVersion||SCREENING_SCORING_VERSION),
      technicalNote:'Processamento automatizado após persistência confirmada no Google Forms.',urgent:urgent
    }
  };
}

function screeningSafePostProcessError_(err) {
  const msg=String(err&&err.message?err.message:'POST_PROCESSING_ERROR');
  return msg.split(':')[0].replace(/[^A-Z0-9_-]/gi,'_').slice(0,80);
}
