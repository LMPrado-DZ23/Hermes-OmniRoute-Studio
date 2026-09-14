# Auditoria técnica — Hermes OmniRoute Studio

**Repositório:** `LMPrado-DZ23/Hermes-OmniRoute-Studio`
**Branch/commit auditado:** `develop` / `d612ead9f3a0145810525f022836e0502b1807ec`
**Data:** 13 de setembro de 2026
**Escopo:** estrutura, reprodutibilidade, CI/CD, dependências, segurança, testes, lint e documentação de release.

## Resumo executivo

O repositório apresenta uma base tecnicamente madura, com lockfiles, CI extensa, testes de regressão para o OmniRoute e mecanismos explícitos de segurança. Os caminhos auditados de local-only, account usage e bridge OmniRoute passaram nos testes direcionados. Entretanto, o estado atual ainda não deve ser considerado “release clean” sem tratar três pontos: o check JavaScript falha por 26 avisos de ESLint; há dois advisories moderados em dependências de produção; e a execução local com os requisitos declarados não é reproduzível em ambientes com Node 22.13.0, pois o projeto exige Node >=22.22.0.

Também há uma limitação importante de validação: os relatórios internos registram que a validação runtime final depende de executor Windows. Portanto, os resultados abaixo comprovam principalmente a camada de código-fonte e testes automatizados, não o comportamento completo do instalador/desktop em Windows.

## Resultado das verificações

| Verificação | Resultado | Observação |
|---|---:|---|
| `python3 -m compileall` | PASS | Compila, mas emite 6 `SyntaxWarning` por escapes inválidos em docstrings/testes. |
| `uv sync --frozen --python 3.11 --extra dev` | PASS | Lockfile e dependências Python sincronizam. |
| Testes direcionados OmniRoute/local-only | **145 passed** | 11 arquivos de teste, 4,30 s. |
| Metadados/packaging | **14 passed** | `test_project_metadata.py` e `test_packaging_metadata.py`. |
| JavaScript typecheck + Vitest | PASS | 24 testes JS passaram; typecheck passou. |
| JavaScript lint via `npm run check` | **FAIL** | 26 warnings, 0 errors; a configuração do lint trata warnings como falha. |
| `npm ci` no ambiente disponível | FAIL | Node local 22.13.0; manifest exige >=22.22.0. Com engine ignorada, instalou. |
| `npm audit --omit=dev` | **FAIL** | 2 vulnerabilidades moderadas em dependências de produção. |
| `git diff --check` | PASS | Sem whitespace errors. |

## Achados priorizados

### P0 — Nenhum bloqueador crítico confirmado

Não foi encontrada credencial literal conhecida, arquivo `.env` versionado, chave privada ou falha reproduzível nos testes direcionados de egress/local-only. A política de segurança documenta corretamente que plugins e skills executam no mesmo processo e não são sandbox de segurança.

### P1 — O check oficial de JavaScript falha por 26 warnings

**Evidência:** `npm run check` executa typecheck, Vitest e lint. Typecheck e Vitest passam, mas o lint encerra com `26 problems (0 errors, 26 warnings)`, retornando código 1.

Os avisos estão concentrados em `web/src/pages/AnalyticsPage.tsx`, `ChannelsPage.tsx`, `ChatPage.tsx`, `ConfigPage.tsx`, `LogsPage.tsx`, `ModelsPage.tsx`, `SkillsPage.tsx`, `plugins/PluginPage.tsx` e `themes/context.tsx`. As categorias incluem:

- `react-hooks/set-state-in-effect`, com chamadas síncronas de `setState` dentro de effects;
- `react-hooks/exhaustive-deps`, com dependências omitidas de `useEffect`;
- `react-hooks/static-components`, com componente dinâmico criado/usado durante render;
- `react-refresh/only-export-components`.

**Impacto:** o CI pode bloquear alterações mesmo sem erros de compilação/teste, e alguns avisos podem representar renders em cascata, stale closures ou perda de estado em plugin dinâmico.

**Correção recomendada:** tratar cada warning na origem, principalmente os de hooks. Quando a regra não for aplicável, usar uma exceção local documentada, não desabilitar globalmente. Adicionar o lint ao gate de PR com saída explícita e impedir que o projeto publique como “verde” enquanto houver warnings não triados.

### P1 — Duas vulnerabilidades moderadas em dependências de produção

`npm audit --omit=dev` reportou:

| Pacote | Versão observada | Advisory | Risco |
|---|---:|---|---|
| `colord` | 2.9.3 | `GHSA-2wm5-q62r-hmrv` | Rejeição lenta de strings de cor malformadas e oversized; possível DoS de CPU em entrada controlada por usuário. |
| `sanitize-html` | 2.17.6 | `GHSA-g8qq-57p8-ggw5` | Bypass de política via SVG SMIL URI-list; potencial XSS armazenado em contexto aplicável. |

Cadeias observadas: `web -> leva -> colord` e `@hermes/bootstrap-installer -> @nous-research/ui -> sanitize-html`.

**Correção recomendada:** atualizar os pacotes transitivos para versões corrigidas e regenerar `package-lock.json`; depois executar `npm audit --omit=dev`, testes JS e o build do web/installer. Como são dependências transitivas, considerar overrides temporários apenas se a atualização direta não for compatível, registrando a justificativa e uma data de remoção.

### P1 — Reprodutibilidade Node incompatível com versões comuns do ambiente

O `package.json` exige `node >=22.22.0` e `npm <11.10.0 || >=11.17.0`. O ambiente auditado tinha Node `v22.13.0` e npm `10.9.2`; portanto, `npm ci` falhou com `EBADENGINE`. O CI usa Node 26, então o pipeline remoto pode passar, mas o quickstart não é reproduzível para qualquer usuário com Node 22 LTS anterior ao patch exigido.

**Correção recomendada:** decidir entre (a) documentar e reforçar Node 26 como requisito único; ou (b) reduzir o piso se não houver dependência real de APIs >=22.22.0. Em ambos os casos, alinhar `.nvmrc`, README, Dockerfile, instaladores e mensagens de diagnóstico. Se o piso for intencional, informar a razão e adicionar teste que valide a mensagem de incompatibilidade.

### P2 — `compileall` passa com SyntaxWarnings

Foram observados escapes inválidos em `hermes_cli/update_cmd.py` e em testes como `tests/agent/test_credits_tracker.py`, `tests/gateway/test_media_tag_separator.py`, `tests/hermes_cli/test_scan_venv_blockers.py` e `tests/tools/test_fuzzy_match.py`.

**Impacto:** hoje não quebra Python, mas pode virar erro futuro e indica strings/docstrings frágeis.

**Correção recomendada:** usar raw strings (`r"..."`) quando apropriado ou duplicar barras invertidas; rodar `python -W error::SyntaxWarning -m compileall ...` no CI para evitar regressões.

### P2 — A validação runtime de Windows permanece fora desta auditoria

Os próprios relatórios do repositório distinguem `SOURCE_PASS` de `RUNTIME_PASS` e deixam para o executor Windows itens como token em URL, escopo de leitura de filesystem, boot-loop, egress local-only em runtime e fluxo real do instalador.

**Impacto:** não é uma falha comprovada de código, mas é uma lacuna de evidência antes de release público.

**Correção recomendada:** executar no Windows uma matriz mínima: instalação limpa, upgrade, reinstalação, desinstalação, inicialização, shutdown, troca de configuração OmniRoute, local-only com canary de rede, verificação de processos órfãos e logs sem unhandled rejection. Publicar os artefatos de evidência associados ao commit exato.

### P3 — Higiene de repositório e custo de checkout

O clone ocupa aproximadamente 656 MB e contém mais de 10 mil arquivos. Há artefatos grandes versionados, como `default.tar.gz`, imagens de documentação e bundles. O maior arquivo individual tem cerca de 3,7 MB, portanto não há um blob gigante isolado evidente, mas o volume total aumenta clone, cache e superfície de manutenção.

**Correção recomendada:** separar artefatos de distribuição do código-fonte quando possível; hospedar bundles/releases em GitHub Releases; remover duplicações de imagens; manter no Git apenas fontes e assets necessários ao build. Fazer isso em mudança planejada, pois reescrever histórico é uma operação de impacto maior.

## Pontos positivos

1. O repositório usa `uv.lock` e `package-lock.json`, e a sincronização Python travada passou.
2. Actions estão pinadas por SHA em vários workflows, o que reduz risco de supply chain.
3. Há cobertura explícita para local-only, egress, configuração fail-closed, memória, account usage e integração OmniRoute.
4. Os testes direcionados relevantes passaram integralmente: 145/145 e 14/14.
5. A documentação de segurança é honesta sobre os limites de denylist, plugins, skills e isolamento in-process.
6. O script de publicação inclui verificações de arquivos proibidos, secret scan e push sem force, mas ainda depende de validação real no Windows.

## Plano de ação recomendado

### Antes de qualquer release

1. Corrigir os advisories de `colord` e `sanitize-html`; regenerar lockfile e repetir audit.
2. Resolver ou justificar formalmente os 26 warnings de lint; fazer `npm run check` retornar zero.
3. Executar a matriz runtime no Windows e anexar evidências ao commit publicado.
4. Alinhar/documentar a versão mínima de Node e testar o caminho de instalação suportado.

### Próximo ciclo

1. Converter `SyntaxWarning` em falha de CI e corrigir todos os escapes inválidos.
2. Adicionar um job de segurança que execute `npm audit --omit=dev` e reporte exceções com expiração.
3. Adicionar um smoke build real do web e do desktop, não apenas typecheck/testes unitários.
4. Criar uma lista de arquivos gerados/artefatos com política explícita de retenção no Git.

### Melhorias contínuas

1. Medir cobertura por área crítica, sobretudo gateway, auth, installer e runtime de Windows.
2. Manter os relatórios internos vinculados ao SHA auditado para evitar que “final” descreva um estado diferente da branch pública.
3. Reduzir o número de scripts de publicação paralelos (`PUBLICAR-HERMES-FINAL.bat` e variantes) ou documentar claramente quando cada um deve ser usado.

## Conclusão

A base está funcional e os caminhos críticos auditados têm bons sinais de engenharia: os testes direcionados passaram e não foi confirmada exposição direta de segredo. Contudo, o repositório ainda apresenta um gate JS vermelho, advisories moderados de produção e uma lacuna de validação runtime Windows. Minha recomendação é classificar o estado como **pré-release / release candidate**, não como release final, até fechar os itens P1 e registrar o resultado da execução Windows.

## Comandos reproduzidos

```bash
python3 -m compileall -q agent gateway hermes_cli tools providers integrations plugins tests
uv sync --frozen --python 3.11 --extra dev
uv run --no-sync pytest -q \
  tests/agent/test_local_only.py \
  tests/agent/test_local_only_account_usage.py \
  tests/agent/test_local_only_aux_egress.py \
  tests/agent/test_local_only_config_failclosed.py \
  tests/agent/test_local_only_loopback_parser.py \
  tests/agent/test_local_only_memory_dispatch.py \
  tests/agent/test_local_only_memory_egress.py \
  tests/agent/test_local_only_supermemory.py \
  tests/agent/test_provider_omniroute_bridge.py \
  tests/integrations/test_omniroute_daily_health.py \
  tests/hermes_cli/test_nous_account.py
uv run --no-sync pytest -q tests/test_project_metadata.py tests/test_packaging_metadata.py
npm run check
npm audit --omit=dev
```
