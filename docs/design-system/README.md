# Design system · Evolução ABA

A Evolução ABA usa o design system da casa, o mesmo do sistema de contas médicas do Instituto do Autismo. O descritivo completo (identidade, tokens, componentes, padrões de interação, acessibilidade e a tradução para Tailwind 4 + shadcn/ui) está no repositório de contas médicas, em `docs/design-system/README.md`. Este pacote traz só o necessário para este projeto.

| Arquivo | O que é |
|---|---|
| [`tokens.css`](tokens.css) | Tokens prontos para Tailwind CSS 4 + shadcn/ui. Substitui o `src/index.css` gerado pelo `shadcn init` na F0 |
| [`assets/burst.png`](assets/burst.png), [`flower.png`](assets/flower.png), [`squares.png`](assets/squares.png) | Raios, flor e fileira de quadrados da marca |
| [`assets/onda-topo.svg`](assets/onda-topo.svg), [`onda-menu.svg`](assets/onda-menu.svg), [`onda-faixa.svg`](assets/onda-faixa.svg) | As ondas azuis da barra do topo, da borda do menu e da faixa do relatório |

## Resumo da identidade

- **Fontes:** Baloo 2 (títulos e números grandes) e Nunito (texto).
- **Cores com significado fixo:** azul `#006CFF` ação, marinho `#0E2A47` texto e títulos, laranja `#FF4C00` bloqueia, amarelo `#FFCF00` alerta, verde `#00CE8B` ok. Cada uma tem as variantes `-soft`, `-text` e `-border` em `tokens.css`.
- **Gráficos:** uma família do azul; cor de status nunca vira cor de série.
- **Layout:** menu lateral azul de 248 px com a onda na borda (vira gaveta abaixo de 1200 px), barra inferior com a faixa de gradiente da marca para as ações da tela, cards com raio de 20 px.

## O que é próprio da Evolução ABA

Componentes que o protótipo criou e que o sistema de contas médicas não tem:

- **Leitura do arquivo** (`.leitura`, `.kv`, `.checks`): os Dados do Favorecido lidos do PDF e a lista de conferências da importação, cada uma com ok, bloqueio, alerta ou informação.
- **Parte do rascunho** (`.parte`): card numerado com a origem (IA ou edição), as tags de bloqueio e alerta e o rodapé com comparar, gerar de novo, editar e marcar como conferida. Conferida, o número vira um visto verde.
- **Frase com fonte** (`.fr`): cada frase do texto é tocável e mostra quantas evoluções diárias cita; o grifo amarelo marca o que a coordenação escreveu. A evolução diária de origem aparece destacada em **Análise do Tita** (`.analise`).
- **Lacuna** (`.lacuna`): o que a IA não achou nas análises, tracejado em laranja, com o botão que resolve.
- **Meta** (`.meta`): item com as datas de origem (`.data-chip`), a tag de manutenção e as ações de editar, manter e retirar.
- **Cartão de pendência** (`.pend`): bloqueio ou alerta, com a parte a que pertence e as ações que resolvem ali mesmo, inclusive "Ciente".
- **Comparação** (`.cmp`): dois textos lado a lado, com o grifo do que se repete (mês anterior) ou do que mudou (IA × atual).
- **Folha no formato do Word** (`.folha`): Cambria 12, espaçamento 1,5, cabeçalho, um bloco por assistido e a assinatura no fim, pronta para imprimir.
