# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo: o coordenador importa o PDF de evoluções diárias do Tita, uma IA escreve o rascunho e o coordenador confere, conclui e envia a contas médicas. Hoje o repositório tem o protótipo navegável em `prototipo/evolucao-aba.html` (dados fictícios, para aprovação do cliente) e o domínio em `docs/escopo/01-dominio.md`, com as regras E01–E17 e as perguntas abertas P1–P14. A evolução de supervisão fica para uma fase posterior. Depois da aprovação vira sistema na stack da casa (`docs/arquitetura/00-stack.md`).

## Padrão de engenharia

- O repositório segue o padrão obrigatório da casa em `ENGINEERING_STANDARDS.md` (regras **MUST** bloqueiam o merge; **SHOULD** pede justificativa no PR; **MAY** é opcional) e as instruções para agentes em `AGENTS.md`. Leia os dois antes de escrever ou alterar código.
- Exceção a uma regra MUST exige um ADR em `docs/adr/NNNN-titulo.md` aprovado por outro desenvolvedor.
- O protótipo é descartável: mudança de regra ou de tela entra primeiro em `docs/escopo/01-dominio.md` e depois no protótipo. O código dele não é reaproveitado no sistema.

## Dados sensíveis

- `arquivos/` (documentos reais de crianças: PDFs do Tita, evoluções, PEIs, relatórios, avaliações) **nunca** entra no git (está no `.gitignore`); `SENHAS.txt` também fica fora e **não é lido**.
- Nenhum nome de pessoa real em código, documento, seed, log, protótipo ou conversa: só nomes fictícios. Crianças, famílias, aplicadores e supervisores reais são citados de forma genérica. Os registros de conselho (CRP) do protótipo são fictícios.
- Antes de cada commit, conferir que nenhum nome dos arquivos de `arquivos/` aparece nas linhas adicionadas do diff.
- Nenhum dado real em projeto Supabase remoto antes da fase de login.
- O logo vem de arquivo local (`prototipo/assets/`); nunca copiar URL assinada de bucket.

## Regras de interface

Identidade e componentes do design system da casa (`docs/design-system/`), os mesmos do sistema de contas médicas.

- **Todo card é clicável e leva à lista do que ele conta.** Card com número, total, percentual ou status (KPIs do painel, resumo da evolução, caixa de pendências) abre ou filtra a lista dos itens a que pertence, ou rola até ela e destaca. Vale também para card com valor zero: a lista mostra o estado vazio. O card escolhido fica marcado e o filtro se desfaz ali mesmo.
- **Todo campo que aceita imagem também aceita a câmera do dispositivo.** Ao lado de "escolha o arquivo" há sempre "Tirar foto" (foto da assinatura, por exemplo). No celular abre a câmera nativa (`<input type="file" accept="image/*" capture="environment">`); no computador com webcam, a imagem ao vivo. Sem permissão, a janela explica e oferece "Escolher arquivo".
- **A IA escreve, o coordenador confere** (E06, E08). Cada frase e cada meta mostram as evoluções diárias de onde saíram; o que a IA não acha vira lacuna, nunca texto inventado. Cada parte é marcada como conferida, e editar reabre a parte.
- **Texto da IA × revisado** (E07). O texto gerado nunca é apagado: cada edição ou "gerar de novo" é uma versão, com quem, quando e a instrução, e as duas podem ser vistas lado a lado.
- **Nome não vai para a IA** (E05). Nome, plano e CRP saem do texto antes do envio e voltam só na emissão do Word.
- **As cores têm significado fixo:** laranja `#FF4C00` bloqueia, amarelo `#FFCF00` alerta, verde `#00CE8B` ok, azul `#006CFF` ação. Gráficos usam a família do azul; cor de status nunca vira cor de série.
