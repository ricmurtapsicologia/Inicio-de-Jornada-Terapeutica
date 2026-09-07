# Monitoring Bridge v2 — implantação segura

## Estado atual

A interface pública de Humor, Ansiedade e Autoestima já contém suporte ao recibo forte, mas a feature flag permanece desligada enquanto `window.RM_MONITORING_BRIDGE_URL` estiver vazia.

Isso é intencional: nenhum fluxo deve declarar persistência confirmada antes de existir um Web App Apps Script implantado e testado.

## Objetivo

Substituir a confirmação baseada apenas no `load` do iframe por um recibo emitido somente depois de `FormResponse.submit()` retornar sem erro no Google Forms.

O navegador recebe somente:

- `ok`;
- `submissionId`;
- `instrumentId`.

Respostas clínicas não retornam ao frontend e não devem ser registradas em logs.

## Arquivo backend

Use `apps-script/MonitoringBridge.gs` em um projeto Apps Script sob controle do proprietário da clínica.

### Script Properties obrigatórias

Configure no projeto, sem publicar os IDs no GitHub:

- `FORM_ID_HUMOR`
- `FORM_ID_ANSIEDADE`
- `FORM_ID_AUTOESTIMA`

Cada valor deve ser o ID editável do Google Form correspondente, não a URL pública `/viewform` e não o ID do endpoint `/d/e/...`.

## Implantação

1. Crie ou abra o projeto Apps Script destinado aos monitoramentos.
2. Copie integralmente `MonitoringBridge.gs`.
3. Em **Configurações do projeto > Propriedades do script**, configure os três IDs acima.
4. Execute `doGet` no editor uma vez para autorizar os escopos de Forms, se solicitado.
5. Escolha **Implantar > Nova implantação > Aplicativo da Web**.
6. Executar como: proprietário.
7. Quem tem acesso: qualquer pessoa.
8. Implante e copie somente a URL final terminada em `/exec`.
9. Abra `/exec` diretamente e confirme `health:true` e `configured` igual a `true` para os três instrumentos.
10. Faça uma submissão técnica de teste por instrumento e confirme que a resposta aparece no Google Forms/planilha vinculada apenas uma vez.
11. Somente depois dos três testes, coloque a URL `/exec` em `assets/monitoramentos-bridge-config.js`.
12. Rode `node tests/validate-monitoring-bridge-v2.mjs` e a auditoria E2E pública antes de considerar a migração concluída.

## Critérios de aceite

A migração só pode ser marcada como concluída quando:

- o Web App responde ao health check;
- os três Forms estão configurados por Script Properties;
- uma submissão por instrumento é persistida no Google Forms/Sheets;
- duplicação por `submissionId` é bloqueada;
- o frontend só mostra sucesso após receber `RM_MONITORING_SUBMIT_RESULT` com `ok:true` e `submissionId` correspondente;
- o `load` do iframe não confirma entrega quando a ponte v2 está ativa;
- nenhuma resposta clínica aparece em URL, GitHub, localStorage/sessionStorage/indexedDB ou logs;
- a página pública continua sem Google Forms visível;
- o E2E desktop/mobile permanece verde.

## Rollback

Em caso de falha pós-implantação, esvazie `window.RM_MONITORING_BRIDGE_URL`. Isso desativa a ponte v2 sem alterar itens, alternativas ou a estrutura clínica dos instrumentos.

A feature flag vazia não deve ser interpretada como migração concluída; significa apenas compatibilidade temporária com o coletor legado.
