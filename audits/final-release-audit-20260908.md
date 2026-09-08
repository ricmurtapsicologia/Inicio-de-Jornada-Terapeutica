# Auditoria final de release — Rastreios Clínicos v3.1

Data: 08/09/2026
Objeto: Jornada Terapêutica + Painel de Rastreios + backend Apps Script + Forms canônicos + scoring + relatório HTML/Gmail
Candidato: branch `rastreios-hub-rc-20260907`

## Veredito executivo

**APROVADO PARA RELEASE.**

Evidências de fechamento:
- catálogo canônico único com 15/15 instrumentos, consumido pela Jornada e pelo Painel;
- Google Forms canônicos 15/15 existentes e não expostos como interface ao paciente;
- Web App `screening-bridge-v3.1` implantado, cliente habilitado e persistência anterior ao pós-processamento;
- E2E vivo pós-saneamento: 15/15 concluídos, 0 falhas e 0 pendências;
- 15 relatórios canônicos confirmados no Gmail no ciclo pós-saneamento;
- ICAPS retestado isoladamente após retirada do processamento legado: resposta `ok:true`, `processing:"complete"` e somente um novo relatório canônico no ciclo final;
- pipeline clínico simplificado para `SUBMITTED → VALIDATED → SCORED → REPORT_GENERATED → EMAIL_SENT → COMPLETE`;
- integração direta Rastreios→Trello removida; Trello permanece fora do backend clínico, na rotina operacional geral;
- GPS removido por inexistência de destino técnico definido;
- BDI-II protegido por content lock/fingerprint e 21 grupos preservados;
- terceira camada em Chromium desktop 1440×1000 e mobile 390×844: 15/15 Jornada, 15/15 Painel, 3 recursos auxiliares, busca/filtros, ausência de overflow horizontal e 0 violações Axe `serious`/`critical`;
- dependência redundante do kit JS Font Awesome removida; CSS CDN único preservado.

## Camada 1 — Auditoria institucional/técnica 30/30

| # | Teste | Status | Evidência sintética |
|---:|---|---|---|
| 1 | Smoke | APROVADO | Jornada, Painel, Web App e Forms respondem; release candidate executável. |
| 2 | Pinpoint | APROVADO | Achados sentinela 12×15, Trello/GPS e ICAPS duplicado foram isolados e saneados. |
| 3 | Deep | APROVADO | Contratos, scoring, pipeline, relatórios, Forms e frontend auditados em profundidade. |
| 4 | Consistency | APROVADO | Jornada e Painel consomem a mesma fonte canônica de 15. |
| 5 | Contradiction | APROVADO | Eliminada contradição entre catálogo legado da Jornada e catálogo do Painel. |
| 6 | Completeness | APROVADO | 15/15 instrumentos presentes; recursos auxiliares separados da contagem. |
| 7 | Traceability | APROVADO | Form IDs, instrument IDs, versões, submission ref e ledger mantêm rastreabilidade técnica. |
| 8 | Compliance | APROVADO COM RESSALVA | Minimização e separação operacional atendidas; instrumentos autorrelatados/custom permanecem declarados como rastreio, não diagnóstico. |
| 9 | Regression | APROVADO | Gates BDI-II, branding, heroes, bridge, scoring, relatório, pipeline e anamnese verdes. |
| 10 | Change-impact | APROVADO | Saneamento Trello/GPS e catálogo compartilhado testados sem regressão do transporte clínico. |
| 11 | Cross-reference | APROVADO | Catálogo central é a referência única para ambas as superfícies. |
| 12 | Link integrity | APROVADO | 15 URLs canônicos distintos; monitoramentos resolvidos pelo host vigente. |
| 13 | Visual QA | APROVADO | Desktop/mobile auditados em navegador; sem overflow horizontal. |
| 14 | Accessibility | APROVADO | Axe: 0 violações serious/critical nas duas superfícies e dois viewports. |
| 15 | Usability | APROVADO | Busca, filtros e abertura dos instrumentos verificadas. |
| 16 | Cognitive-load | APROVADO | Rastreios separados de Anamnese/Guia/Dados; grupos e descrições reduzem mistura semântica. |
| 17 | Narrative-flow | APROVADO | Jornada apresenta acesso simples; Painel oferece exploração por categoria. |
| 18 | Red-team | APROVADO | Respostas clínicas não são enviadas ao Trello; Forms não ficam visíveis; segredos não estão no código público. |
| 19 | Edge-case | APROVADO | Retry de leitura Forms, idempotência, respostas obrigatórias e ICAPS legado tratados. |
| 20 | Scenario stress | APROVADO | E2E sintético 15/15 e reteste isolado do ICAPS concluídos. |
| 21 | Fact-check | APROVADO COM RESSALVA | Implementações e descrições foram reconciliadas com fontes internas; validade psicométrica externa não é inferida para instrumentos custom/descritivos. |
| 22 | Citation | APROVADO COM RESSALVA | Metadados técnicos/versionamento existem; produto web não é artigo científico e não transforma ausência de referência externa em alegação de validação. |
| 23 | Source-to-claim | APROVADO | Scoring source-derived e textos limitam interpretação ao que a implementação suporta. |
| 24 | Legal defensibility | APROVADO COM RESSALVA | Minimização, não diagnóstico, uso clínico restrito e ausência de dados clínicos no Trello reduzem risco; licenças/direitos de instrumentos continuam obrigação de governança do titular. |
| 25 | Decision-readiness | APROVADO | Bloqueadores de release eliminados; cliente habilitado somente após E2E. |
| 26 | Publication preflight | APROVADO | Preflight consolidado e gates permanentes verdes antes da promoção. |
| 27 | Version-drift | APROVADO | Catálogo único e bundle gerado reduzem deriva entre superfícies/backend. |
| 28 | Canonical-template | APROVADO | Design system compartilhado e 15 variantes visuais mantidos. |
| 29 | Duplication/redundancy | APROVADO | Trello/GPS diretos, lista duplicada 12×15, trigger legado do ICAPS e kit JS redundante saneados. |
| 30 | Terminology | APROVADO | Nomes públicos, IDs técnicos e classificação de recursos reconciliados no catálogo canônico. |

**Gate 30/30:** 30 controles executados; 26 aprovados e 4 aprovados com ressalva não bloqueante; 0 reprovados.

## Camada 2 — Auditoria Editorial Profissional 90/90

A taxonomia canônica foi preservada. Controles próprios de livro impresso/PDF são marcados como **NÃO APLICÁVEL AO PRODUTO WEB** em vez de serem substituídos por controles inventados.

| # | Controle | Status |
|---:|---|---|
| 1 | Propósito editorial | APROVADO |
| 2 | Público leitor | APROVADO |
| 3 | Experiência de leitura | APROVADO |
| 4 | Arquitetura global | APROVADO |
| 5 | Partes, unidades e capítulos | NÃO APLICÁVEL AO PRODUTO WEB |
| 6 | Progressão pedagógica | APROVADO |
| 7 | Extensão e densidade editorial | APROVADO |
| 8 | Edição de desenvolvimento | APROVADO |
| 9 | Edição substantiva | APROVADO |
| 10 | Padronização de linguagem e terminologia | APROVADO |
| 11 | Revisão técnico-científica especializada | APROVADO COM RESSALVA |
| 12 | Fontes, referências e atribuições | APROVADO COM RESSALVA |
| 13 | Copyediting/preparação de originais | APROVADO |
| 14 | Revisão gramatical/ortotipográfica | APROVADO |
| 15 | Formato físico | NÃO APLICÁVEL AO PRODUTO WEB |
| 16 | Mancha gráfica | APROVADO |
| 17 | Margens | APROVADO |
| 18 | Medianiz/gutter | NÃO APLICÁVEL AO PRODUTO WEB |
| 19 | Família tipográfica principal | APROVADO |
| 20 | Família tipográfica complementar | APROVADO |
| 21 | Corpo de texto | APROVADO |
| 22 | Entrelinha | APROVADO |
| 23 | Comprimento de linha | APROVADO |
| 24 | Tracking e kerning | APROVADO |
| 25 | Hierarquia tipográfica | APROVADO |
| 26 | Estilos de parágrafo e caractere | APROVADO |
| 27 | Recuos e espaçamentos | APROVADO |
| 28 | Hifenização e justificação | APROVADO |
| 29 | Rios de branco | APROVADO |
| 30 | Viúvas, órfãs e runts | APROVADO |
| 31 | Baseline grid | NÃO APLICÁVEL AO PRODUTO WEB |
| 32 | Alinhamento vertical em páginas confrontantes | NÃO APLICÁVEL AO PRODUTO WEB |
| 33 | Fólios, cabeçalhos e rodapés | NÃO APLICÁVEL AO PRODUTO WEB |
| 34 | Lógica par/ímpar | NÃO APLICÁVEL AO PRODUTO WEB |
| 35 | Aberturas de partes/unidades | NÃO APLICÁVEL AO PRODUTO WEB |
| 36 | Aberturas de capítulos | NÃO APLICÁVEL AO PRODUTO WEB |
| 37 | Identidade iconográfica | APROVADO |
| 38 | Linguagem gráfica para funções didáticas | APROVADO |
| 39 | Relação texto–imagem | APROVADO |
| 40 | Direção de arte fotográfica | APROVADO COM RESSALVA |
| 41 | Seleção e tratamento fotográfico | APROVADO COM RESSALVA |
| 42 | Ilustrações autorais | NÃO APLICÁVEL AO PRODUTO WEB |
| 43 | Infográficos | NÃO APLICÁVEL AO PRODUTO WEB |
| 44 | Fluxogramas e algoritmos | APROVADO |
| 45 | Organogramas, mapas, linhas do tempo e diagramas | NÃO APLICÁVEL AO PRODUTO WEB |
| 46 | Precisão científica dos infográficos | NÃO APLICÁVEL AO PRODUTO WEB |
| 47 | Legendas, fontes e créditos visuais | APROVADO COM RESSALVA |
| 48 | Acessibilidade visual | APROVADO |
| 49 | Paleta cromática | APROVADO |
| 50 | Função semântica da cor | APROVADO |
| 51 | Capa | NÃO APLICÁVEL AO PRODUTO WEB |
| 52 | Lombada | NÃO APLICÁVEL AO PRODUTO WEB |
| 53 | Quarta capa | NÃO APLICÁVEL AO PRODUTO WEB |
| 54 | Coerência capa–miolo | NÃO APLICÁVEL AO PRODUTO WEB |
| 55 | Folhas de rosto, créditos e expediente | NÃO APLICÁVEL AO PRODUTO WEB |
| 56 | Ficha catalográfica/ISBN | NÃO APLICÁVEL AO PRODUTO WEB |
| 57 | Sumário profissional | NÃO APLICÁVEL AO PRODUTO WEB |
| 58 | Índices remissivo/temático/lista de figuras | NÃO APLICÁVEL AO PRODUTO WEB |
| 59 | Boxes e quadros | APROVADO |
| 60 | Conversão de quadros em prosa | APROVADO |
| 61 | Elementos pedagógicos | APROVADO |
| 62 | Ritmo visual | APROVADO |
| 63 | Duplas de páginas/spreads | NÃO APLICÁVEL AO PRODUTO WEB |
| 64 | Espaços negativos | APROVADO |
| 65 | Equilíbrio de massa visual | APROVADO |
| 66 | Imagens x margens/dobras | NÃO APLICÁVEL AO PRODUTO WEB |
| 67 | Revisão de tabelas | NÃO APLICÁVEL AO PRODUTO WEB |
| 68 | Redesenho de tabelas | NÃO APLICÁVEL AO PRODUTO WEB |
| 69 | Resolução de imagens | APROVADO COM RESSALVA |
| 70 | Perfis de cor | NÃO APLICÁVEL AO PRODUTO WEB |
| 71 | CMYK | NÃO APLICÁVEL AO PRODUTO WEB |
| 72 | Sangria | NÃO APLICÁVEL AO PRODUTO WEB |
| 73 | Marcas e especificações de impressão | NÃO APLICÁVEL AO PRODUTO WEB |
| 74 | Fontes incorporadas | NÃO APLICÁVEL AO PRODUTO WEB |
| 75 | Links e QR Codes | APROVADO |
| 76 | Prova após diagramação | APROVADO |
| 77 | Prova visual página a página | NÃO APLICÁVEL AO PRODUTO WEB |
| 78 | Prova de imposição/encadernação | NÃO APLICÁVEL AO PRODUTO WEB |
| 79 | Boneco físico | NÃO APLICÁVEL AO PRODUTO WEB |
| 80 | Avaliação em mão | NÃO APLICÁVEL AO PRODUTO WEB |
| 81 | Soft proof | APROVADO |
| 82 | Preflight técnico do PDF | NÃO APLICÁVEL AO PRODUTO WEB |
| 83 | Bleed, marcas, cores e saída | NÃO APLICÁVEL AO PRODUTO WEB |
| 84 | Capa na lombada final | NÃO APLICÁVEL AO PRODUTO WEB |
| 85 | Sumário x paginação | NÃO APLICÁVEL AO PRODUTO WEB |
| 86 | Referências cruzadas e chamadas de figuras | NÃO APLICÁVEL AO PRODUTO WEB |
| 87 | Consistência títulos/legendas/índices | APROVADO |
| 88 | Correções finais pós-diagramação | APROVADO |
| 89 | Aprovação editorial final | APROVADO |
| 90 | Master e derivados finais | APROVADO |

**Gate 90/90:** 90 controles canônicos executados; controles de produção editorial impressa explicitamente classificados como não aplicáveis ao produto web; nenhum controle aplicável reprovado.

## Camada 3 — Experiência e Qualidade Aplicada

### E2E
- 15/15 instrumentos: PASS no Web App pós-saneamento.
- ICAPS final isolado: persistência e pós-processamento completos; somente um novo relatório canônico no ciclo final.
- ordem: página/cliente → Apps Script → Google Form → scoring → relatório HTML → Gmail → COMPLETE.

### QA
- Jornada: 15 rastreios + 3 recursos auxiliares.
- Painel: 15 cards, 10 filtros derivados do catálogo (`Todos` + 9 grupos).
- Busca `autoestima`: 1 resultado.
- Filtro `Monitoramento`: 3 resultados.
- nenhuma lista paralela de rastreios permanece.

### Acessibilidade
- Chromium desktop e mobile.
- Axe: 0 violações `serious` ou `critical` na Jornada e no Painel.
- foco/semântica básica e ausência de iframe nativo de Forms preservados.

### UX
- acesso simplificado na Jornada;
- exploração por categorias e pesquisa no Painel;
- recursos auxiliares separados semanticamente da contagem dos rastreios;
- risco suicida identificado como uso clínico restrito.

### UI
- sem overflow horizontal em 1440×1000 e 390×844;
- design system e variantes dos 15 instrumentos preservados;
- dependência JS externa redundante do Font Awesome removida.

## Decisão final

**RELEASE AUTORIZADO.**

Critério: 15/15 E2E vivo, gates técnicos permanentes verdes, catálogo único, backend sem dependências operacionais redundantes, Gmail canônico funcional, BDI-II travado e terceira camada aprovada.

Ressalvas não bloqueantes de governança:
1. instrumentos custom/descritivos não devem ser apresentados como testes psicométricos validados quando não houver validação correspondente;
2. direitos/licenças de instrumentos proprietários permanecem responsabilidade do titular do produto;
3. alterações futuras de conteúdo clínico, scoring ou segurança devem reabrir os gates afetados e gerar nova versão.
