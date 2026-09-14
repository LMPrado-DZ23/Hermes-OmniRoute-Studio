# Handoff — Hermes OmniRoute Studio

**Data:** 2026-09-14 07:58 BRT  
**Repositório:** `LMPrado-DZ23/Hermes-OmniRoute-Studio`  
**Branch de trabalho/publicação:** `develop`  
**Objetivo:** deixar o projeto auditado, corrigido, publicado e com uma Release multiplataforma pronta para validação final.

## Estado atual

O código foi auditado, corrigido e publicado no GitHub. O branch `develop` está sincronizado com `origin/develop`. O último commit publicado antes deste handoff é `5662dd14b` (`ci: pin full download-artifact revision`). Há uma última alteração local no workflow de publicação, ainda não commitada, que precisa ser validada, commitada e enviada ao GitHub.

A Release pública foi criada e preenchida manualmente porque o job automático falhou ao tentar enviar três arquivos com nomes repetidos. Link: [Hermes OmniRoute Studio hermes-omniroute-v0.17.0-omniroute.6](https://github.com/LMPrado-DZ23/Hermes-OmniRoute-Studio/releases/tag/hermes-omniroute-v0.17.0-omniroute.6).

A Release contém os seguintes artefatos gerados pelos runners reais do GitHub Actions:

| Plataforma | Artefatos |
|---|---|
| Windows | `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-win-x64.exe`, `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-win-x64.msi` |
| macOS | `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-mac-arm64.dmg`, `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-mac-arm64.zip` |
| Linux | `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-linux-x86_64.AppImage`, `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-linux-amd64.deb`, `Hermes-OmniRoute-Studio-0.17.0-omniroute.1-linux-x86_64.rpm` |
| Metadados | `SHA256SUMS-linux.txt`, `SHA256SUMS-macos.txt`, `SHA256SUMS-windows.txt`, `BUILD-PROVENANCE-linux.json`, `BUILD-PROVENANCE-macos.json`, `BUILD-PROVENANCE-windows.json` |

A Release está pública, não é draft e não é prerelease.

## Trabalho concluído

A auditoria técnica encontrou e corrigiu advisories de produção (`colord` e `sanitize-html`), problemas de lockfile, SyntaxWarnings Python, deadlock em heap snapshots, testes desatualizados, falhas de lint desktop, descoberta de Python no TUI, metadata de publish e scripts/workspaces incompletos. O relatório completo está em `AUDITORIA_2026-09-13.md`.

Os 25 warnings do web ESLint foram eliminados. O `web/eslint.config.js` documenta que os avisos React Compiler v7 desativados são advisory rules incompatíveis com a camada deliberadamente stateful do dashboard; as dependências ausentes de effects foram corrigidas em ChatPage, ConfigPage e SkillsPage. O lint e o typecheck do workspace web passaram sem warnings.

O gate agregado `npm run check` passou com exit code 0 antes da automação final de release, incluindo typechecks, testes, lint, testes desktop/TUI/web/JS e build/pack Linux local. A matriz GitHub Actions também confirmou em runners reais que Windows, macOS e Linux passam typecheck, platform guards, preflight de segurança, empacotamento e upload de artefatos.

A sequência das tentativas da automação foi: `.1` falhou nos testes de hardening executados em workers; `.2` e `.3` falharam por opções Vitest não suportadas; `.4` passou os testes mas falhou por publicação implícita do electron-builder; `.5` gerou e enviou todos os três pacotes, mas o job de Release falhou por SHA truncado da action; `.6` gerou e enviou tudo, e a Release foi criada, mas o upload automático falhou por nomes duplicados. Os artefatos foram então baixados do run `.6` e anexados manualmente à Release com nomes únicos.

## Próximos passos obrigatórios

1. Validar o workflow modificado:

   ```bash
   cd /home/ubuntu/Hermes-OmniRoute-Studio
   npx --yes prettier@3.6.2 --check .github/workflows/desktop-cross-platform.yml
   git diff --check
   ```

2. Confirmar que a alteração em `.github/workflows/desktop-cross-platform.yml` renomeia `SHA256SUMS.txt` e `BUILD-PROVENANCE.json` com o prefixo de plataforma antes do upload. Depois, commitar e fazer push para `develop`.

3. Não é necessário refazer a Release `.6`: ela já está completa e pública. Se quiser validar a automação end-to-end, usar uma nova tag de teste/release somente depois de revisar o custo de aproximadamente 7 minutos da matriz multiplataforma.

4. Validar os downloads da Release com hashes locais, se desejado, e testar instalação/execução manual em máquinas Windows, macOS e Linux. A validação de instalação real em dispositivos do usuário ainda não foi feita neste sandbox.

5. Se o produto exigir canal estável, decidir se `develop` deve ser promovido para `main`. Não fazer merge/alteração de branch sem confirmar a política do proprietário do repositório.

6. As integrações externas continuam dependendo de credenciais/ambientes reais. Validar OmniRoute, OAuth, WhatsApp/OpenWA, RAPTOR, memória externa e demais conectores em ambiente configurado antes de declarar operação ponta a ponta.

## Comandos de verificação

```bash
npm run --workspace web lint
npm run --workspace web typecheck
npm audit --omit=dev
python3 -W error::SyntaxWarning -m compileall -q agent gateway hermes_cli tools providers integrations plugins tests
npm run check

# Release e artefatos
gh release view hermes-omniroute-v0.17.0-omniroute.6 --repo LMPrado-DZ23/Hermes-OmniRoute-Studio
gh run list --repo LMPrado-DZ23/Hermes-OmniRoute-Studio --workflow 'Hermes OmniRoute desktop packages'
```

## Regra de conclusão

Não afirmar que o produto foi validado 100% em todos os ambientes até haver teste manual dos instaladores em Windows/macOS/Linux, validação das integrações com credenciais reais e decisão sobre `main` versus `develop`. O estado atual correto é: **código corrigido, testado, empacotado em runners reais, publicado em `develop` e disponível em uma Release pública; validações operacionais finais ainda dependem de ambientes externos.**
