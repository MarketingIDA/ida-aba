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
- **Gráficos:** uma família do azul. No protótipo, os níveis de resposta (independente → ajuda física → erro) vão do azul forte ao azul quase branco; cor de status nunca vira cor de série.
- **Layout:** menu lateral azul de 248 px com a onda na borda (vira gaveta abaixo de 1200 px), barra inferior com a faixa de gradiente da marca para as ações da tela, cards com raio de 20 px.

## O que é próprio da Evolução ABA

Componentes que o protótipo criou e que o sistema de contas médicas não tem:

- **Botões de tentativa** (`.tb` no protótipo): grade com "Independente" em destaque e os níveis de dica, alvo de toque de 64 px, para registrar uma tentativa por toque no celular.
- **Fichas de tentativa** (`.t`): a sequência de respostas da sessão, com o independente cheio em azul.
- **Barra de distribuição** (`.dist`): percentual de cada nível de resposta no mês.
- **Calendário de frequência** (`.cal`): o mês com o estado de cada sessão (registrada, sem registro, falta, feriado), clicável.
- **Cartão de pendência** (`.pend`): bloqueio, alerta ou conquista, com as ações que resolvem ali mesmo.
- **Relatório** (`.doc`): documento com faixa azul, campos, seções numeradas e assinaturas, pronto para imprimir.
