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

- **Modo da nova evolução** (`.modo-imp`): dois cartões de escolha, "Com o PDF do Tita" e "Escrever à mão" (E26).
- **Leitura do arquivo** (`.leitura`, `.kv`, `.checks`): os Dados do Favorecido lidos do PDF e a lista de conferências da importação, cada uma com ok, bloqueio, alerta ou informação.
- **Calendário dos dias analisados** (`.cal`, `.cal-d`, `.cal-leg`): o mês do período em grade semanal; sessão em azul, falta e texto que cita outra data com marca própria. A legenda conta cada grupo (sessões, faltas, outra data no texto, fora do período) e, tocada, destaca os dias (E18–E20).
- **Outros documentos** (`.doc-lista`, `.doc-li`, `.dz-sm`): área de soltar menor com "Escolher arquivo" e "Tirar foto"; cada documento mostra o ícone do tipo, o tipo editável, a data, as páginas, os trechos lidos sem o nome (`.doc-tr`) e a situação ok, alerta ou bloqueio (E25).
- **Seções em branco** (`.man-sug`): campos de texto por seção da entrada manual e, nas metas, as metas em desenvolvimento do cadastro como chips de um toque; o chip usado fica apagado (E26).
- **Parte do rascunho** (`.parte`): card numerado com a origem (IA ou edição), as tags de bloqueio e alerta e o rodapé com comparar, gerar de novo, editar e marcar como conferida. Conferida, o número vira um visto verde.
- **Frase com fonte** (`.fr`, `.fr.doc`): cada frase do texto é tocável e mostra quantas fontes cita (evoluções diárias e documentos); o grifo amarelo marca o que a coordenação escreveu. A aba **Fontes** destaca a origem: a evolução diária (`.analise`), o documento ou, na entrada manual, a seção escrita pelo coordenador.
- **Lacuna** (`.lacuna`): o que a IA não achou nas análises, tracejado em laranja, com o botão que resolve e "Ignorar".
- **Dica para a IA** (`.dica-btn`, `.dica`): o "i" ao lado do campo abre a sugestão de orientação; na curadoria da coordenação geral, a orientação aprovada (`.ori`) fica numerada, com quem aprovou, e pode ser retirada (E21, E22).
- **Meta do cadastro** (`.meta-c`): meta do assistido com a situação (em desenvolvimento, em manutenção, alcançada, suspensa) e o histórico mês a mês (`.meta-hist`) (E23).
- **Meta** (`.meta`): item com as datas de origem (`.data-chip`), a tag de manutenção e as ações de editar, manter e retirar.
- **Cartão de pendência** (`.pend`): bloqueio ou alerta, com a parte a que pertence e as ações que resolvem ali mesmo, inclusive "Ciente".
- **Comparação** (`.cmp`): dois textos lado a lado, com o grifo do que se repete (mês anterior) ou do que mudou (IA × atual).
- **Folha no formato do Word** (`.folha`): Cambria 12, espaçamento 1,5, cabeçalho, um bloco por assistido e a assinatura no fim, pronta para imprimir. O bloco aberto pela lista "Por assistido" fica destacado (`.bloco.foco`).
- **Envio do arquivo do mês** (`.arq-envio`): lista de conferência do envio (evoluções concluídas, assinatura, prazo), cada item com ok, bloqueio ou alerta, seguida das evoluções que ainda faltam (E24).
