# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo. Todo mês, cada coordenador de unidade faz a evolução de cada assistido da sua carteira e, até o dia 10, envia a contas médicas o **arquivo do mês**, com as evoluções da carteira toda. A evolução nasce das evoluções diárias registradas no Tita: o coordenador importa o PDF do assistido e, se quiser, outros documentos (escola, outras terapias, família); uma IA escreve o rascunho no formato do modelo da clínica e o coordenador confere parte por parte e conclui. Sem o PDF, ele escreve o mês à mão e a IA aprimora o texto.

**Fase atual: protótipo para aprovação.** O repositório tem só o protótipo navegável, com dados fictícios, e a documentação do domínio. Depois da aprovação, ele vira o sistema na stack da casa (ver [Do protótipo ao sistema](#do-protótipo-ao-sistema)). A evolução de supervisão é outro relatório e fica para uma fase posterior.

## Abrir o protótipo

O protótipo é um único arquivo HTML, sem build e sem dependências. Duas formas:

- Abrir `prototipo/evolucao-aba.html` direto no navegador; ou
- Servir a pasta e abrir <http://localhost:4174/evolucao-aba.html>:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo
```

No Claude Code, a configuração `prototipo-aba` em `.claude/launch.json` faz o mesmo.

Os dados vivem só na memória da aba. Recarregar a página, ou o botão de reiniciar no rodapé do menu, volta tudo ao estado inicial. A IA é simulada e nenhum arquivo escolhido é lido: o PDF do Tita e os outros documentos usam exemplos fictícios.

## Roteiro de demonstração (15 minutos)

Hoje na simulação é 04/11/2026: está aberta a evolução de novembro, que analisa as sessões de 01/10 a 31/10 (E18), e o arquivo do mês vai a contas médicas até 10/11.

1. **Evoluções do mês (coordenadora Lívia Cordeiro).** A tabela mostra os 18 assistidos da carteira. Os cards filtram a tabela; tocar de novo desfaz o filtro. O mês anterior está fechado e abre o arquivo enviado.
2. **Nova evolução mensal → Theo Barros Cavalcanti, com o PDF do Tita.** Os exemplos "De outro assistido", "De setembro" e "Só de uma profissional" são recusados e dizem o porquê; "Com datas fora do período" mostra os dias que ficam de fora da análise (E19). "Arquivo certo" mostra os Dados do Favorecido e a leitura conferida: 15 de 15 análises, 1 falta, nome trocado por "o assistido" antes da IA e 1 quebra de página removida.
3. **Outros documentos.** No mesmo passo, junte os exemplos: o relatório da escola entra com alerta (data fora do período), o da fonoaudiologia e a foto do registro da família entram; "De outro assistido" bloqueia a geração até sair da lista. "Tirar foto" abre a câmera.
4. **Gerar rascunho com a IA.** O rascunho vem em 4 partes e lê o Tita e os documentos. Toque numa frase: a aba Fontes destaca as evoluções diárias ou o documento de onde ela saiu. As conferências mostram uma lacuna (tato de objetos não aparece em outubro), 3 metas alcançadas e uma meta sem programa citado. A lacuna se resolve como "não trabalhado" (a frase entra no texto e o alerta da meta some) ou "Ignorar" (nada entra no texto). O botão "i" sugere uma orientação para a IA, que a coordenação geral aprova. Marque as 4 partes como conferidas, conclua e veja o documento no formato do Word. A evolução concluída não vai sozinha a contas médicas: ela entra no arquivo do mês.
5. **Escrever à mão.** Em Nova evolução, escolha outro assistido e "Escrever à mão": as seções da evolução abrem em branco. "Preencher com um exemplo" escreve um mês em linguagem do dia a dia, e as metas do cadastro entram com um toque. "Aprimorar com a IA" melhora a linguagem sem acrescentar fato, abre lacuna para o programa do cadastro que o texto não cita e guarda as duas versões (Comparar). A aba Fontes mostra o que foi escrito.
6. **Os outros casos da carteira**, em Em conferência:
   - **Helena:** texto com 6 linhas (bloqueia) e "comportamento agressivo" (troca pelo termo técnico em um toque). Edite o texto até 7 linhas.
   - **Isis:** plano em branco (corrija no cadastro), meta em manutenção há 2 meses e a frequência baixa citada na abertura.
   - **Alice:** texto 90% igual ao do mês anterior (Comparar, Gerar de novo) e uma meta já alcançada entre as metas do mês.
   - **Benício:** devolvido pela coordenação geral com o motivo.
7. **Arquivo do mês** (menu). A lista do envio mostra o que falta: assistidos sem evolução, evoluções em conferência e a assinatura. "Enviar o arquivo do mês" bloqueia e leva às pendências; com a carteira toda concluída, envia todas as evoluções de uma vez e o arquivo fica só leitura (E24).
8. **Trocar para Coordenação geral** (botão ao lado do nome, no rodapé do menu). O painel tem 4 cards que filtram a lista, entre eles "Parecidas com a anterior", e cada coordenador mostra se o arquivo do mês já foi enviado (Camila Nunes e Júlia Prado já enviaram). Toque num coordenador para ver as evoluções dele; abra uma concluída e devolva com um motivo (só antes do envio do arquivo). Em Metas dos assistidos fica o cadastro de metas de cada um (E23); em Configurações, as orientações da IA sugeridas pelos coordenadores, para aprovar ou recusar (E21, E22).
9. **Trocar para Contas médicas.** Chegam arquivos, não evoluções soltas: os cards "Arquivos recebidos" (2 de 6) e "Arquivos a chegar" filtram a lista, com filtro por plano e unidade. "Por arquivo" abre o arquivo do mês de Camila Nunes, com os 14 assistidos em ordem alfabética e a assinatura no fim; "Por assistido" leva ao bloco do assistido dentro do arquivo. O documento baixa em Word.
10. **Assinatura e termos.** Sem assinatura cadastrada, o envio do arquivo bloqueia; a assinatura entra por arquivo ou foto pela câmera. A lista de termos inadequados é mantida pela coordenação geral.

## Estrutura

```
ida-aba/
├── prototipo/
│   ├── evolucao-aba.html        # protótipo navegável (HTML, CSS e JS num arquivo só)
│   └── assets/                  # logo e elementos da marca usados pelo protótipo
├── docs/
│   ├── escopo/01-dominio.md     # glossário, perfis, fluxo, regras E01–E26, perguntas P1–P21, telas
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

1. Respostas do cliente às perguntas P1 a P21 de [`docs/escopo/01-dominio.md`](docs/escopo/01-dominio.md), e ajuste do protótipo se mudarem regra ou tela.
2. **F0, fundação:** repositório na stack da casa ([`docs/arquitetura/00-stack.md`](docs/arquitetura/00-stack.md)), CI com os gates do [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md), Supabase local com seed fictício e os ADRs de exceção.
3. Domínio puro primeiro (leitura do texto do Tita, período analisado, pseudonimização, conferências, semelhança de textos, com testes), depois importação do PDF do Tita e dos outros documentos, entrada manual, rascunho e aprimoramento com a IA, conferência, emissão do Word e envio do arquivo do mês.

Nenhum dado real entra em projeto Supabase remoto antes da fase de login, e nenhum texto de assistido vai para a IA sem a pseudonimização (E05).
