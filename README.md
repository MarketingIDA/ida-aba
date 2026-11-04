# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo. Todo mês, cada coordenador de unidade faz a evolução de cada assistido da sua carteira e envia a contas médicas até o dia 10. A evolução nasce das evoluções diárias registradas no Tita: o coordenador importa o PDF do assistido, uma IA escreve o rascunho no formato do modelo da clínica e o coordenador confere parte por parte, conclui e envia.

**Fase atual: protótipo para aprovação.** O repositório tem só o protótipo navegável, com dados fictícios, e a documentação do domínio. Depois da aprovação, ele vira o sistema na stack da casa (ver [Do protótipo ao sistema](#do-protótipo-ao-sistema)). A evolução de supervisão é outro relatório e fica para uma fase posterior.

## Abrir o protótipo

O protótipo é um único arquivo HTML, sem build e sem dependências. Duas formas:

- Abrir `prototipo/evolucao-aba.html` direto no navegador; ou
- Servir a pasta e abrir <http://localhost:4174/evolucao-aba.html>:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo
```

No Claude Code, a configuração `prototipo-aba` em `.claude/launch.json` faz o mesmo.

Os dados vivem só na memória da aba. Recarregar a página, ou o botão de reiniciar no rodapé do menu, volta tudo ao estado inicial. A IA é simulada e o PDF escolhido não é lido: a importação usa arquivos de exemplo fictícios.

## Roteiro de demonstração (10 minutos)

Hoje na simulação é 04/11/2026: a competência de outubro está aberta e o prazo de envio é 10/11.

1. **Evoluções do mês (coordenadora Lívia Cordeiro).** A tabela mostra os 18 assistidos da carteira. Os cards (sem evolução, em conferência, concluídas, enviadas) filtram a tabela; tocar de novo desfaz o filtro. A competência de setembro está fechada e abre o documento enviado.
2. **Nova evolução mensal → Theo Barros Cavalcanti.** Na importação, os arquivos de exemplo "De outro assistido", "De setembro" e "Só de uma profissional" são recusados e dizem o porquê. "Arquivo certo" mostra os Dados do Favorecido e a leitura conferida: 15 de 15 análises, 1 falta, nome trocado por "o assistido" antes da IA e 1 quebra de página removida.
3. **Gerar rascunho com a IA.** O rascunho vem em 4 partes. Toque numa frase: a aba Tita destaca as evoluções diárias de onde ela saiu. As conferências mostram uma lacuna (tato de objetos não aparece em outubro), 3 metas alcançadas e uma meta sem programa citado. Resolva a lacuna como "não trabalhado": a frase entra no texto e o alerta da meta some. Marque as 4 partes como conferidas, conclua, veja o documento no formato do Word e envie a contas médicas.
4. **Os outros casos da carteira**, em Em conferência:
   - **Helena:** texto com 6 linhas (bloqueia) e "comportamento agressivo" (troca pelo termo técnico em um toque). Edite o texto até 7 linhas.
   - **Isis:** plano em branco (corrija no cadastro), meta em manutenção há 2 meses e a frequência baixa citada na abertura.
   - **Alice:** texto 90% igual ao de setembro (Comparar, Gerar de novo) e uma meta já alcançada entre as metas do mês.
   - **Benício:** devolvido pela coordenação geral com o motivo.
5. **Trocar para Coordenação geral** (botão ao lado do nome, no rodapé do menu). O painel tem 4 cards que filtram a lista, entre eles "Parecidas com setembro". Toque num coordenador para ver as evoluções dele; abra uma concluída e devolva com um motivo.
6. **Trocar para Contas médicas.** Evoluções recebidas, com filtro por plano e unidade. "Arquivos completos" leva ao arquivo do mês de Camila Nunes, com os 14 assistidos em ordem alfabética e uma assinatura no fim. "Ainda não chegaram" mostra o que falta. O documento baixa em Word.
7. **Assinatura e termos.** Sem assinatura cadastrada, o envio bloqueia; a assinatura entra por arquivo ou foto pela câmera. A lista de termos inadequados é mantida pela coordenação geral.

## Estrutura

```
ida-aba/
├── prototipo/
│   ├── evolucao-aba.html        # protótipo navegável (HTML, CSS e JS num arquivo só)
│   └── assets/                  # logo e elementos da marca usados pelo protótipo
├── docs/
│   ├── escopo/01-dominio.md     # glossário, perfis, fluxo, regras E01–E17, perguntas P1–P14, telas
│   ├── arquitetura/00-stack.md  # stack-alvo e como o domínio se encaixa nela
│   ├── design-system/           # tokens e assets da casa (o mesmo do sistema de contas médicas)
│   └── adr/                     # decisões e exceções ao padrão (vazio até a F0)
├── ENGINEERING_STANDARDS.md     # padrão obrigatório de engenharia da casa
├── AGENTS.md  CLAUDE.md         # instruções para agentes
└── .claude/launch.json          # servidor local do protótipo
```

Os documentos reais do cliente (PDF do Tita, modelo e manual) têm dados de crianças e ficam em `arquivos/`, fora do git.

## Do protótipo ao sistema

O protótipo é descartável: serve de referência de telas e regras, e o código dele não é reaproveitado. Depois da aprovação:

1. Respostas do cliente às perguntas P1 a P14 de [`docs/escopo/01-dominio.md`](docs/escopo/01-dominio.md), e ajuste do protótipo se mudarem regra ou tela.
2. **F0, fundação:** repositório na stack da casa ([`docs/arquitetura/00-stack.md`](docs/arquitetura/00-stack.md)), CI com os gates do [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md), Supabase local com seed fictício e os ADRs de exceção.
3. Domínio puro primeiro (leitura do texto do Tita, pseudonimização, conferências, semelhança de textos, com testes), depois importação, rascunho com a IA, conferência, emissão do Word e envio.

Nenhum dado real entra em projeto Supabase remoto antes da fase de login, e nenhum texto de assistido vai para a IA sem a pseudonimização (E05).
