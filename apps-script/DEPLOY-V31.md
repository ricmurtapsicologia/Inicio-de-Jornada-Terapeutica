# Screening Backend v3.1 — implantação única

Estado: RC certificada; transporte público permanece desligado até o Web App responder ao health check e ao E2E controlado.

## Arquivos do projeto Apps Script

Importar todos os arquivos `.gs` deste diretório e o `appsscript.json` no mesmo projeto Apps Script:

- `ScreeningBridgeV3.gs`
- `ScreeningOrderedRecordsV31.gs`
- `ScreeningScoringV3.gs`
- `ScreeningScoringConfigV3.gs`
- `ScreeningOrchestratorV3.gs`
- `ScreeningReportV3.gs`
- `ScreeningPipelineV3.gs`
- `ScreeningIntegrationsV3.gs`
- `ScreeningSetupV3.gs`

## Setup único

Executar uma única vez:

`setupScreeningBridgeV3FromFactory()`

A função lê a aba `FORMULARIOS` da Forms Factory e configura automaticamente os 15 `FORM_ID_*`, além de `REPORT_EMAIL` e `TRELLO_CARD_ID`. Também torna `Data de nascimento` opcional apenas nos três monitoramentos longitudinais que hoje não coletam esse dado no frontend.

O setup não grava respostas clínicas em Script Properties.

## Segredos

Somente se a atualização automática do Trello for desejada, definir em Script Properties:

- `TRELLO_KEY`
- `TRELLO_TOKEN`

Nunca inserir essas credenciais no repositório público.

Sem essas duas propriedades, o relatório por e-mail continua independente e a etapa Trello é marcada como não configurada.

## Verificação antes do deploy

Executar:

`verifyScreeningBridgeV31Contracts()`

Critérios:

- 15 instrumentos configurados;
- contagem clínica compatível com o Form canônico;
- Forms continuam não publicados ao paciente;
- nenhum `FORM_ID_*` ausente.

## Web App

Criar uma única implantação Web App usando o manifesto do projeto. A execução deve ocorrer como o usuário que implanta. O endpoint `/exec` é o único valor que posteriormente entra em `assets/screening-transport-v3.json`.

Antes da ativação pública, `enabled` deve permanecer `false`.

## Health check

Abrir o `/exec` por GET. A resposta deve informar:

- `ok: true`
- `health: true`
- `version: screening-bridge-v3.1`
- os 15 instrumentos como configurados.

## Gate de ativação

Somente após o E2E controlado dos 15:

1. atualizar `assets/screening-transport-v3.json` com o `/exec` e `enabled: true`;
2. alterar `collectorReady/scorerValidated/productionReady` somente para instrumentos que passaram no E2E;
3. atualizar `submissionSupported` para os 15 no adapter canônico;
4. executar auditoria consolidada 30/30 + 90/90 + E2E/QA/A11y/UX/UI;
5. saneamento único;
6. regressão;
7. merge final.

Não realizar microdeploys entre esses gates.
