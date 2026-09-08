# Screening Bridge v3 — contrato unificado dos 15 rastreios

## Função

`ScreeningBridgeV3.gs` substitui a ponte v2 limitada a Humor, Ansiedade e Autoestima. Ele recebe a submissão da página clínica, valida o contrato contra o Google Form correspondente e só devolve sucesso depois que `FormResponse.submit()` conclui sem erro.

O Google Form é persistência técnica. Ele não deve aparecer como interface principal da página clínica.

## Instrumentos

`geral`, `tdah`, `bipolar`, `borderline`, `narcisismo`, `impulsividade`, `esquemas`, `modos`, `necessidades`, `codependencia`, `icaps`, `humor`, `ansiedade`, `autoestima`, `risco`.

## Script Properties

Os IDs editáveis dos Forms ficam somente em Script Properties:

- `FORM_ID_GERAL`
- `FORM_ID_TDAH`
- `FORM_ID_BIPOLAR`
- `FORM_ID_BORDERLINE`
- `FORM_ID_NARCISISMO`
- `FORM_ID_IMPULSIVIDADE`
- `FORM_ID_ESQUEMAS`
- `FORM_ID_MODOS`
- `FORM_ID_NECESSIDADES`
- `FORM_ID_CODEPENDENCIA`
- `FORM_ID_ICAPS`
- `FORM_ID_HUMOR`
- `FORM_ID_ANSIEDADE`
- `FORM_ID_AUTOESTIMA`
- `FORM_ID_RISCO`

Nenhum ID, token ou credencial deve ser colocado no JavaScript público.

## Envelope do navegador

```json
{
  "version": "screening-bridge-v3",
  "instrumentId": "tdah",
  "submissionId": "uuid-gerado-no-cliente",
  "startedAt": 0,
  "submittedAt": 0,
  "answers": {
    "Título exato do item no Form": "Resposta"
  }
}
```

O backend devolve somente recibo técnico. Não devolve respostas clínicas ao frontend e não registra payload em log.

## Gates de implantação

1. Os 15 conteúdos precisam estar congelados e reconciliados página ↔ Form.
2. Todos os Forms precisam existir com contagem correta.
3. Durante staging, `PUBLICAR=FALSE`; a ponte não é ativada no frontend.
4. Para E2E privado, o Form pode ser publicado/aceitar respostas sem que sua URL seja exposta na página pública.
5. Configurar os 15 IDs em Script Properties.
6. Implantar o Web App executando como proprietário.
7. Health check precisa retornar os 15 instrumentos como `configured:true`.
8. Rodar uma submissão sintética por instrumento e confirmar persistência única na planilha vinculada.
9. Só então ligar a feature flag do frontend.

## Separação de responsabilidades

A ponte v3 executa somente transporte, validação e persistência confirmada. O pipeline clínico posterior deve ser separado:

`SUBMITTED → VALIDATED → SCORED → REPORT_GENERATED → EMAIL_SENT → TRELLO_UPDATED → GPS_NOTIFIED → COMPLETE`.

Falha de e-mail, Trello ou GPS não pode apagar nem duplicar a resposta já persistida.

## Risco suicida

A EIR-RS mantém sua própria regra de completude/scoring. O espelho em Forms aceita itens clínicos não obrigatórios porque a validade depende de limite de omissões e de itens críticos. Essa regra deve ser implementada no módulo de scoring, não convertida em obrigatoriedade cega no Google Forms.

## BDI-II

O BDI-II permanece com os 21 grupos já existentes na plataforma. A migração deve preservar literalmente o conteúdo vigente, ordem e alternativas; qualquer alteração de redação é mudança clínica/versionamento, não ajuste de layout.

## Rollback

A feature flag pública da ponte deve permanecer desligável. Desativar a URL da ponte interrompe novas submissões pela v3 sem alterar o conteúdo dos instrumentos ou os Forms existentes.
