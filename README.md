# Evolução ABA · IDA

Evolução mensal da intervenção ABA do Instituto do Autismo: o aplicador registra cada sessão, tentativa a tentativa; no começo do mês o sistema fecha os números de cada criança; o supervisor escreve a análise e o plano; a coordenação aprova; o relatório vai para a família e o convênio.

**Fase atual: protótipo para aprovação.** O repositório tem só o protótipo navegável, com dados fictícios, e a documentação do domínio. Depois da aprovação, ele vira o sistema na stack da casa (ver [Do protótipo ao sistema](#do-protótipo-ao-sistema)).

## Abrir o protótipo

O protótipo é um único arquivo HTML, sem build e sem dependências. Duas formas:

- Abrir `prototipo/evolucao-aba.html` direto no navegador; ou
- Servir a pasta e abrir <http://localhost:4174/evolucao-aba.html>:

```bash
python -m http.server 4174 --bind 127.0.0.1 --directory prototipo
```

No Claude Code, a configuração `prototipo-aba` em `.claude/launch.json` faz o mesmo.

Os dados vivem só na memória da aba. Recarregar a página, ou o botão de reiniciar no rodapé do menu, volta tudo ao estado inicial.

## Roteiro de demonstração (10 minutos)

Hoje na simulação é 04/11/2026: a competência de outubro está aberta e o prazo de entrega é 10/11.

1. **Painel (supervisora Lívia Cordeiro).** Cards de evoluções aprovadas, alvos adquiridos, crianças com alerta e frequência. Todo card e toda barra dos gráficos filtram a lista de baixo; o filtro de mês mostra os meses fechados de maio a setembro.
2. **Evolução do Theo** (Evoluções → Theo Barros Cavalcanti). O lado direito mostra 3 bloqueios: 3 sessões feitas sem registro, um programa sem nenhuma sessão no mês e a análise em branco. Abra um programa na tabela para ver as tentativas de cada sessão e a correção registrada em 13/10.
3. **Pedir o registro** à aplicadora, no primeiro bloqueio.
4. **Trocar para Aplicadora** (botão ao lado do nome, no rodapé do menu). A tela Hoje mostra a agenda e o pedido da supervisora. Registre as 3 sessões tocando no nível de resposta de cada tentativa. Funciona no celular; dá para anexar a foto da folha de papel pela câmera.
5. **Voltar para Supervisora.** O bloqueio das sessões sumiu e os números mudaram com os novos registros. Suspenda ou justifique o programa sem dados, use "Inserir resumo dos números", complete a análise e envie para a revisão.
6. **Trocar para Coordenação.** Em Evoluções → Em revisão, abra o Theo, confira o relatório e devolva com um motivo (vira bloqueio para a supervisora) ou aprove.
7. **Relatório.** Abra o relatório aprovado e use "Imprimir ou salvar PDF". O mesmo relatório existe para os meses anteriores.

## Estrutura

```
ida-aba/
├── prototipo/
│   ├── evolucao-aba.html        # protótipo navegável (HTML, CSS e JS num arquivo só)
│   └── assets/                  # logo e elementos da marca usados pelo protótipo
├── docs/
│   ├── escopo/01-dominio.md     # glossário, perfis, fluxo, regras E01–E15, perguntas P1–P12, telas
│   ├── arquitetura/00-stack.md  # stack-alvo e como o domínio se encaixa nela
│   ├── design-system/           # tokens e assets da casa (o mesmo do sistema de contas médicas)
│   └── adr/                     # decisões e exceções ao padrão (vazio até a F0)
├── ENGINEERING_STANDARDS.md     # padrão obrigatório de engenharia da casa
├── AGENTS.md  CLAUDE.md         # instruções para agentes
└── .claude/launch.json          # servidor local do protótipo
```

## Do protótipo ao sistema

O protótipo é descartável: serve de referência de telas e regras, e o código dele não é reaproveitado. Depois da aprovação:

1. Respostas do cliente às perguntas P1 a P12 de [`docs/escopo/01-dominio.md`](docs/escopo/01-dominio.md), e ajuste do protótipo se mudarem regra ou tela.
2. **F0, fundação:** repositório na stack da casa ([`docs/arquitetura/00-stack.md`](docs/arquitetura/00-stack.md)), CI com os gates do [`ENGINEERING_STANDARDS.md`](ENGINEERING_STANDARDS.md), Supabase local com seed fictício e os ADRs de exceção.
3. Domínio puro primeiro (cálculo da independência, aquisição, alertas e pendências, com testes), depois registro de sessão, evolução, revisão e relatório.

Nenhum dado real entra em projeto Supabase remoto antes da fase de login.
