# Ponte da Anamnese para o Google Forms

Destino oficial:

- Formulário: `Antes da nossa primeira sessão`
- Google Form ID: `1fg3ZNgCfkbk4pEJaiNt3xY5vellVGI_129lDx8v-aPI`
- ID interno da Central de Forms: `FORM-2026-0002`

## Objetivo

`anamnese.html` é a interface visível. O paciente não vê Google Forms. O arquivo `AnamneseBridge.gs` recebe as respostas por POST, cria uma `FormResponse` e executa `submit()` no formulário oficial.

## Publicar no Apps Script

1. Abra a planilha `CENTRAL DE FORMS — CHATGPT`.
2. Acesse **Extensões > Apps Script**.
3. No mesmo projeto que contém a Forms Factory, crie um arquivo `AnamneseBridge.gs`.
4. Copie integralmente o conteúdo de `apps-script/AnamneseBridge.gs`.
5. Salve o projeto.
6. Execute `doGet` uma vez no editor para autorizar os escopos de Forms, se solicitado.
7. Escolha **Implantar > Nova implantação > Aplicativo da Web**.
8. Executar como: **você/proprietário**.
9. Quem tem acesso: **qualquer pessoa**.
10. Implante e copie a URL que termina em `/exec`.
11. Em `anamnese-config.js`, defina:

```js
window.ANAMNESE_BRIDGE_URL = 'https://script.google.com/macros/s/SEU_DEPLOYMENT_ID/exec';
```

12. Abra a URL `/exec` diretamente. Ela deve responder com status de saúde da ponte.
13. Faça uma resposta de teste pela página `anamnese.html`.
14. Confirme a nova resposta dentro do Google Forms e na planilha de respostas vinculada.

## Segurança do fluxo

- Respostas não entram em URL.
- A página não grava respostas clínicas em `localStorage`.
- O bridge não registra o payload em logs.
- O backend aceita apenas o Form ID oficial fixado no código.
- `submissionId` + `CacheService` reduzem duplicação por reenvio.
- O sucesso é comunicado ao navegador somente depois de `formResponse.submit()`.
- O iframe de transporte recebe somente `{ ok, submissionId }`; respostas clínicas não retornam ao frontend.

## Gate antes de colocar no main

Execute no repositório:

```bash
node tests/validate-anamnese.mjs
```

Não publicar o botão no `main` enquanto `anamnese-config.js` estiver com URL vazia.
