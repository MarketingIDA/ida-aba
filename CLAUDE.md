# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo. Hoje o repositório tem o protótipo navegável em `prototipo/evolucao-aba.html` (dados fictícios, para aprovação do cliente) e o domínio em `docs/escopo/01-dominio.md`, com as regras E01–E15 e as perguntas abertas P1–P12. Depois da aprovação vira sistema na stack da casa (`docs/arquitetura/00-stack.md`).

## Padrão de engenharia

- O repositório segue o padrão obrigatório da casa em `ENGINEERING_STANDARDS.md` (regras **MUST** bloqueiam o merge; **SHOULD** pede justificativa no PR; **MAY** é opcional) e as instruções para agentes em `AGENTS.md`. Leia os dois antes de escrever ou alterar código.
- Exceção a uma regra MUST exige um ADR em `docs/adr/NNNN-titulo.md` aprovado por outro desenvolvedor.
- O protótipo é descartável: mudança de regra ou de tela entra primeiro em `docs/escopo/01-dominio.md` e depois no protótipo. O código dele não é reaproveitado no sistema.

## Dados sensíveis

- `arquivos/` (documentos reais de crianças: PEIs, folhas de registro, relatórios, avaliações) **nunca** entra no git (está no `.gitignore`); `SENHAS.txt` também fica fora e **não é lido**.
- Nenhum nome de pessoa real em código, documento, seed, log, protótipo ou conversa: só nomes fictícios. Crianças, famílias, aplicadores e supervisores reais são citados de forma genérica. Os registros de conselho (CRP) do protótipo são fictícios.
- Antes de cada commit, conferir que nenhum nome dos arquivos de `arquivos/` aparece nas linhas adicionadas do diff.
- Nenhum dado real em projeto Supabase remoto antes da fase de login.
- O logo vem de arquivo local (`prototipo/assets/`); nunca copiar URL assinada de bucket.

## Regras de interface

Identidade e componentes do design system da casa (`docs/design-system/`), os mesmos do sistema de contas médicas.

- **Todo card é clicável e leva à lista do que ele conta.** Card com número, total, percentual ou status (KPIs do painel, resumo da evolução, caixa de pendências) abre ou filtra a lista dos itens a que pertence, ou rola até ela e destaca. Vale também para card com valor zero: a lista mostra o estado vazio. O card escolhido fica marcado e o filtro se desfaz ali mesmo.
- **Todo campo que aceita imagem também aceita a câmera do dispositivo.** Ao lado de "escolha o arquivo" há sempre "Tirar foto" (foto da folha de registro, por exemplo). No celular abre a câmera nativa (`<input type="file" accept="image/*" capture="environment">`); no computador com webcam, a imagem ao vivo. Sem permissão, a janela explica e oferece "Escolher arquivo".
- **Número da evolução não se digita** (E01). Frequência, independência, alvos e comportamentos saem dos registros das sessões; o supervisor escreve só a interpretação.
- **Registro × corrigido** (E14). O registro original da sessão nunca é apagado: a correção mostra o valor lido, o conferido, quem, quando e por quê.
- **As cores têm significado fixo:** laranja `#FF4C00` bloqueia, amarelo `#FFCF00` alerta, verde `#00CE8B` ok, azul `#006CFF` ação. Gráficos usam a família do azul; cor de status nunca vira cor de série.
- **O registro de sessão é mobile-first.** Alvos de toque grandes, um toque por tentativa, desfazer sempre à mão, sem digitar números.
