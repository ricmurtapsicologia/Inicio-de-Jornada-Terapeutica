(()=>{
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
