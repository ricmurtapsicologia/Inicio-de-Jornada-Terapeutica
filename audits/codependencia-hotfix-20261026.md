# Codependência — hotfix cirúrgico e gates de liberação (26/10/2026)

## Resultado observado
- PR da página clínica: https://github.com/ricmurtapsicologia/Escala-de-Co-Depenpencia-Emocional/pull/1 (merge em main).
- 40 respostas não são pré-selecionadas; campos explicitamente obrigatórios.
- O formulário não admite submissão GET; botão inicia desabilitado.
- Alerta de privacidade, progresso e associação semântica dos 40 rótulos.
- Suíte estática de segurança da página: PASS em GitHub Actions.
- Backend compartilhado corrigido nesta PR, ainda **não implantado** no Apps Script:
  - mapeamento 1–5 → escolhas textuais do Form canônico;
  - validação de 40 alternativas e tipo LIST no servidor;
  - flag server-side SCREENING_CODEPENDENCIA_ENABLED exige valor true;
  - confirmação postMessage restrita a iframe e origens Google;
  - tentativa com timeout reutiliza submissionId;
  - bundle Apps Script regenerado dos 9 arquivos-fonte.
- Suíte isolada da codependência: **PASS** no workflow "Codependency isolated clinical hotfix" (https://github.com/ricmurtapsicologia/Inicio-de-Jornada-Terapeutica/actions/runs/40425043825).

## Bloqueio identificado no preflight geral
O preflight completo permanece vermelho em um controle de integridade do **BDI-II**: a versão atual do conteúdo diverge do hash clínico de referência.
Não foi alterado o conteúdo clínico nem recalculado o hash para passar artificialmente no teste.
A divergência precisa de comparação versionada e revisão específica.

## Gates que permanecem BLOQUEADOS
- collectorReady=false
- scorerValidated=false
- productionReady=false
- submissionSupported=false
- SCREENING_CODEPENDENCIA_ENABLED ausente ou false no servidor até implantação e autorização.

## Antes de liberar
1. Resolver a divergência do BDI-II sem mascarar a mudança clínica, ou estabelecer um gate que comprova não impacto com aprovação.
2. Implantar bundle corrigido do Apps Script no projeto existente; conferir saúde e configuração.
3. Executar E2E sintético 40/40, conferir Google Form, pontuação e relatório Gmail uma única vez.
4. Verificar credenciais, origens de mensagem, falha de rede, idempotência e LGPD.
5. Rodar regressão dos 15 instrumentos, QA mobile, Axe/Lighthouse.
6. Somente então habilitar no servidor e nas configurações públicas da escala.

**Condição atual:** mitigação de segurança publicada; nova coleta clínica da codependência não liberada.
