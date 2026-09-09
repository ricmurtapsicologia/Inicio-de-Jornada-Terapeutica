(()=>{
'use strict';
const catalog={
  version:'3.3.0',count:15,
  order:['Geral','Neurodesenvolvimento','Humor','Personalidade','Dimensões clínicas','Terapia do Esquema','Relacionamentos','Monitoramento','Uso clínico restrito'],
  items:[
    {id:'geral',group:'Geral',name:'RAC-5TR',desc:'Rastreio clínico multidimensional para organização inicial de sinais e sintomas.',url:'https://ricmurtapsicologia.github.io/Rastreioclinico/'},
    {id:'tdah',group:'Neurodesenvolvimento',name:'TDAH Adulto — EIR-TDAH-A',desc:'Rastreio dimensional de atenção, hiperatividade/impulsividade, funções executivas, impacto funcional e história do desenvolvimento.',url:'https://ricmurtapsicologia.github.io/rastreioTDAH/'},
    {id:'bipolar',group:'Humor',name:'Bipolaridade — TAB',desc:'Bateria integrada para rastreio de sintomas e curso temporal relacionados ao espectro bipolar.',url:'https://ricmurtapsicologia.github.io/tab-bateria-integrada/'},
    {id:'borderline',group:'Personalidade',name:'Traços Borderline',desc:'Rastreio dimensional de padrões emocionais, relacionais, de autoimagem e impulsividade.',url:'https://ricmurtapsicologia.github.io/Inventario-de-Tracos-Borderline/'},
    {id:'narcisismo',group:'Personalidade',name:'Traços Narcísicos',desc:'Bateria para rastreio dimensional de traços narcisistas e funcionamento interpessoal.',url:'https://ricmurtapsicologia.github.io/bateria.narcisismo/'},
    {id:'impulsividade',group:'Dimensões clínicas',name:'Impulsividade — BIS-11',desc:'Escala de avaliação dimensional da impulsividade.',url:'https://ricmurtapsicologia.github.io/Rastreio-de-Impulsividade/'},
    {id:'esquemas',group:'Terapia do Esquema',name:'Esquemas',desc:'Inventário de padrões de longa duração relevantes à formulação em Terapia do Esquema.',url:'https://ricmurtapsicologia.github.io/rastreio.de.esquemas/'},
    {id:'modos',group:'Terapia do Esquema',name:'Modos Esquemáticos',desc:'Inventário de estados emocionais e modos de enfrentamento na Terapia do Esquema.',url:'https://ricmurtapsicologia.github.io/rastreiomodosesquematicos/'},
    {id:'necessidades',group:'Terapia do Esquema',name:'Necessidades Emocionais',desc:'Escala para avaliação de necessidades emocionais relevantes à formulação clínica.',url:'https://ricmurtapsicologia.github.io/Escala-de-Necessidades-Emocionais/'},
    {id:'codependencia',group:'Relacionamentos',name:'Codependência',desc:'Rastreio de padrões de dependência, codependência, autonomia e limites nas relações.',url:'https://ricmurtapsicologia.github.io/Escala-de-Co-Depenpencia-Emocional/'},
    {id:'icaps',group:'Relacionamentos',name:'ICAPS — Prontidão para Separação',desc:'Inventário clínico estruturado para avaliação do contexto conjugal e da prontidão para separação.',url:'https://ricmurtapsicologia.github.io/ICAPS/'},
    {id:'risco',group:'Uso clínico restrito',name:'Risco Suicida — EIR-RS',desc:'Instrumento de uso clínico mediado para rastreio estruturado de risco de suicídio.',url:'https://ricmurtapsicologia.github.io/TriagemRiscoSuicidio/',restricted:true},
    {id:'humor',group:'Monitoramento',name:'Depressão — BDI-II',desc:'Monitoramento clínico de sintomas depressivos com conteúdo preservado.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=humor'},
    {id:'ansiedade',group:'Monitoramento',name:'Ansiedade',desc:'Monitoramento longitudinal de sintomas ansiosos em estrutura adaptada de autorrelato.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=ansiedade'},
    {id:'autoestima',group:'Monitoramento',name:'Autoestima — RSES',desc:'Monitoramento longitudinal da autoestima pela Escala de Autoestima de Rosenberg.',url:'https://ricmurtapsicologia.github.io/Inicio-de-Jornada-Terapeutica/monitoramento.html?instrument=autoestima'}
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
