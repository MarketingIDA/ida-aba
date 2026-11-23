# Andamento das implementações

Onde está cada regra do escopo ([01-dominio.md](01-dominio.md), E01 a E28) no sistema. Atualizado em 23/11/2026, com o PR #51.

Os testes à mão seguem o [roteiro de testes](../testes/roteiro-de-testes-a-mao.md) e ficam para o fim, depois de todas as implementações.

## Legenda

- **No ar:** está em produção e aguarda o teste à mão.
- **Parcial:** a regra está no ar, mas falta o que a coluna "Falta" diz.
- **Não feito:** ainda não começou.

## Regras E01 a E28

| Regra | O que é | Situação | PRs | Falta |
|---|---|---|---|---|
| E01 | Uma evolução por assistido por mês | No ar | #1, #10 | |
| E02 | Leitura do PDF do Tita | No ar | #14 | |
| E03 | Bloqueios e alertas da importação | No ar | #14 | |
| E04 | Falta e frequência abaixo de 75% | No ar | #14, #42 | |
| E05 | Nome, plano e CRP não vão para a IA | No ar | #15, #23, #41 | |
| E06 | Rascunho em 4 partes, lacunas e fontes por frase | No ar | #15, #33, #35 | |
| E07 | Versões da parte e "Comparar com o texto da IA" | No ar | #40 | |
| E08 | Conferir cada parte e "Gerar de novo" com instrução | No ar | #15, #38 | |
| E09 | Identificação completa | No ar | #15 | |
| E10 | 7 linhas, lacunas, semelhança (P7) e termos inadequados | No ar | #20, #33, #37 | |
| E11 | Metas alcançadas, manutenção e aviso de menos de 4 | No ar | #31 | |
| E12 | Metas para o mês atual: mínimo de 4, meta já alcançada e programa que o texto não cita | No ar | #31, #33, #46 | |
| E13 | Fluxo, reabrir e devolução pela coordenação geral | No ar | #10, #17 | |
| E14 | Word, assinatura, prévia e evolução sozinha para conferência | No ar | #11, #13, #44 | |
| E15 | Prazo do dia 10 e o que falta | No ar | #12 | |
| E16 | Código da evolução | No ar | #1 | |
| E17 | Turno integral num arquivo só | No ar | #6, #12 | A carteira de turno integral é uma carteira só; não há tela própria. |
| E18 | Período analisado | No ar | #14 | |
| E19 | Datas divergentes, calendário e ciência dos alertas | No ar | #14, #43, #48 | |
| E20 | Dias analisados no banco e calendário | No ar | #15, #43 | |
| E21 | Dica para a IA | No ar | #21 | |
| E22 | Curadoria e orientações da IA | No ar | #21 | |
| E23 | Cadastro de metas, atualização no envio e aviso das metas a completar | No ar | #16, #31, #49 | |
| E24 | Envio do arquivo do mês, arquivos recebidos e busca por assistido | No ar | #12, #13, #45 | |
| E25 | Outros documentos (PDF, Word e foto) | No ar | #23, #24, #35 | |
| E26 | Escrita à mão, "Aprimorar com a IA" e a aba Fontes | No ar | #10, #41, #47 | Só o texto (parte 2) é aprimorado; as metas seguem o cadastro. |
| E27 | Evolução das metas em gráfico | No ar | #25, #26, #27 | |
| E28 | Assistidos vindos da Tita | No ar | #18, #22 | A sincronização diária (cron) depende de configuração. |
| E28 | Relatório de metas em PDF e compartilhar | No ar | #28, #29 | |

## Fora das regras

- **Design igual ao protótipo:** no ar (#32, #34, #36, #39, #50). O painel ao lado das partes, com as abas Conferências, Fontes, Mês anterior e Histórico, no PR #51. Com ele, todas as telas seguem o protótipo.
- **Cadastros da coordenação geral** (unidades, planos, pessoas, carteiras e assistidos): no ar (#3 a #9).

## Próximos passos

1. Merge do PR #51 (painel ao lado das partes da evolução).
2. O teste à mão de tudo, pelo roteiro.
