# Roteiro de testes à mão

Um passo a passo para testar no site, por perfil, tudo o que está no ar (fatias 1 a 5). Cada item diz o que fazer e o que deve acontecer. Marque `[x]` no que passou. O que falhar, anote com o número do item, o que apareceu na tela e, se der, um print sem dados de criança.

Site: <https://ida-aba.vercel.app>

## 0. Antes de começar

A produção hoje tem só a conta da coordenação geral, os 1.022 assistidos vindos da Tita, nenhuma carteira, nenhuma meta e nenhuma evolução. Por isso o roteiro começa montando uma carteira de teste.

**Cuidados**

- **Os dados são reais.** Os assistidos vieram da Tita. Use uma unidade e um turno de verdade e 2 ou 3 assistidos que essa coordenadora acompanha de fato, para que o teste também sirva de uso real.
- **Nada se apaga.** Evolução, versão, registro de download e envio ficam guardados. O que não vale mais fica desativado ou é reaberto.
- **O envio do arquivo do mês não tem volta.** As evoluções ficam só para leitura, e a carteira não abre outra evolução naquele mês. Deixe o item 4.4 para quando a carteira estiver pronta de verdade, ou faça com a carteira de teste sabendo que o envio fica.
- **E-mail:** o convite e o "esqueci a senha" só chegam a quem é da equipe do projeto no Supabase, porque o SMTP próprio ainda não foi configurado. Para o perfil de coordenador, use um e-mail da equipe. O mesmo vale para contas médicas.
- **Celular:** os itens com 📱 pedem o celular, para a câmera e o "Enviar o PDF".

**O que separar**

- [ ] 0.1 Um segundo e-mail da equipe, para a conta de coordenadora.
- [ ] 0.2 Um terceiro e-mail da equipe, para a conta de contas médicas.
- [ ] 0.3 O PDF do Tita (Relatório de Evoluções Diárias) do mês passado de 2 assistidos da carteira de teste. Ele precisa ser por assistido, sem filtro de profissional e do período 01 a 31 do mês anterior.
- [ ] 0.4 Um PDF ou Word de outro documento de um desses assistidos (escola, outra terapia), e uma foto de um documento impresso.
- [ ] 0.5 Uma imagem da assinatura ou do carimbo (PNG ou JPG).

## 1. Coordenação geral: preparar

- [ ] 1.1 **Unidade.** Abra Cadastros → Unidades, escolha a unidade da carteira de teste e confira o CNPJ e o endereço. Tente salvar um CNPJ com o último dígito trocado: deve recusar.
- [ ] 1.2 **Pessoa.** Em Cadastros → Pessoas, cadastre a coordenadora (papel: coordenação de unidade, com o CRP) com o e-mail do item 0.1. Ela aparece como "Sem conta".
- [ ] 1.3 **Contas médicas.** Cadastre uma pessoa com o papel contas médicas e o e-mail do item 0.2.
- [ ] 1.4 **Carteira.** Em Cadastros → Carteiras, crie a carteira (unidade, turno, coordenadora). Tente criar uma segunda carteira ativa na mesma unidade e turno: deve recusar.
- [ ] 1.5 **Assistidos.** Em Cadastros → Assistidos, filtre por "Rascunhos, sem carteira" e ponha 2 ou 3 na carteira. Escolha o plano de saúde. Busque um nome sem acento: deve achar. Quem está sem plano aparece com aviso.
- [ ] 1.6 **Sincronizar com a Tita.** Em Assistidos, use "Sincronizar com a Tita". Primeiro vêm só os números, sem gravar. Confirme e confira as pendências (unidade não ligada, nome sem sobrenome, possível duplicado).
- [ ] 1.7 **Termos.** Em Cadastros → Termos, inclua um termo inadequado e o substituto técnico (ex.: "birra" → "comportamento de recusa"). A lista começa vazia.
- [ ] 1.8 **Convite.** Confira se o convite chegou ao e-mail da coordenadora e ao de contas médicas.

## 2. Coordenadora: a evolução do mês

Entre com a conta da coordenadora pelo link do convite e crie a senha (no mínimo 15 caracteres).

- [ ] 2.1 **O que ela vê.** Em Evoluções, só os assistidos da carteira dela. No menu: Evoluções, Metas, Arquivo do mês e Assinatura. Não aparece Cadastros.
- [ ] 2.2 **Assinatura.** Em Assinatura, envie a imagem do item 0.5. Se o CRP não estiver no cadastro, aparece o aviso. 📱 Teste também tirar a foto pelo celular.
- [ ] 2.3 **Metas.** Em Metas, abra um assistido e use "Nova meta" 3 ou 4 vezes, com o **programa** igual ao nome usado no Tita. Sem programa, a meta não terá gráfico. Deixe uma meta suspensa. Os cards filtram por situação.
- [ ] 2.4 **Nova evolução.** Em Evoluções, "Nova evolução mensal" lista só quem ainda não tem evolução no mês. Escolha o assistido da meta.
- [ ] 2.5 **PDF do Tita, os bloqueios.** Em "Importar o PDF do Tita", tente o PDF do *outro* assistido: deve recusar e dizer por quê. Se tiver à mão, tente um de outro mês ou com filtro de profissional.
- [ ] 2.6 **PDF do Tita, o certo.** Importe o PDF certo. Confira os Dados do Favorecido, o número de análises e de faltas, e o alerta das datas fora do período, se houver. Clique em "Usar esta leitura".
- [ ] 2.7 **Nível de apoio.** Logo depois, a tela do PDF mostra a leitura dos níveis em andamento e, em 1 a 2 minutos, "lida". Se falhar, use "Ler de novo". Anote quanto tempo levou.
- [ ] 2.8 **Outros documentos.** Em "Juntar documentos", junte o PDF ou Word do item 0.4. Se o nome não estiver no texto, ele espera "É de <nome>". Corrija a data ou o tipo se a sugestão vier errada.
- [ ] 2.9 📱 **Foto.** No celular, "Tirar foto" de um documento impresso. O texto lido sempre espera "Conferi: é de <nome>". Letra de mão é mal lida.
- [ ] 2.10 **Rascunho pela IA.** "Gerar rascunho com a IA" escreve as partes 2 a 4. Confira:
  - o texto não traz o nome da criança onde não deveria;
  - as metas batem com o cadastro;
  - o tempo de resposta (anote).
- [ ] 2.11 **Termo inadequado.** Escreva no texto o termo do item 1.7. Ele fica marcado e vira alerta. Troque pelo substituto com um toque.
- [ ] 2.12 **Dica para a IA.** Num bloco escrito pela IA, use "Dica para a IA" e escreva o que ela deve fazer diferente. O texto da evolução não muda.
- [ ] 2.13 **Trazer metas.** Na parte 4, "Trazer do cadastro de metas" acrescenta as metas em desenvolvimento.
- [ ] 2.13b **Meta já alcançada.** Na parte 4, escreva uma meta que está na parte 3 ou que já está alcançada no cadastro. A conclusão fica bloqueada com o nome da meta. Com menos de 4 metas na parte 3, aparece só um aviso.
- [ ] 2.14 **Conferir e concluir.** "Marcar como conferida" nas 4 partes, e depois "Concluir evolução". Teste "Reabrir" e conclua de novo.
- [ ] 2.15 **Evolução escrita à mão.** No outro assistido, crie a evolução sem o PDF, escreva as 4 partes, confira e conclua.

## 3. Coordenação geral: revisar

- [ ] 3.1 **Evoluções.** A coordenação geral vê a evolução da coordenadora e recorta a lista por unidade e por coordenador.
- [ ] 3.2 **Devolver.** Na evolução concluída, "Devolver com motivo". Na lista, ela aparece como "Devolvida".
- [ ] 3.3 **Orientações da IA.** A dica do item 2.12 aparece pendente. Aprove ajustando a redação. Ela vira orientação e passa a valer para todas as unidades.
- [ ] 3.4 **Gráfico e PDF.** Abra a evolução das metas do assistido (o ícone de gráfico na lista) e use "Baixar PDF". Confira:
  - o arquivo se chama `<código>-METAS.pdf`, sem o nome da criança;
  - toda página diz quem emitiu e quando.

## 4. Coordenadora: devolução, gráfico e arquivo do mês

- [ ] 4.1 **Devolução.** A evolução devolvida mostra o motivo como bloqueio. Corrija, marque a devolução como resolvida e conclua de novo.
- [ ] 4.2 **Evolução das metas em gráfico.** No ícone de gráfico da lista, confira o painel, os destaques, os cards, a escada de cada meta (passe o mouse ou toque num ponto para ver a frase da análise), o mapa de sessões e a aba "Tabela". A mediana da carteira só aparece com 2 ou mais assistidos com os níveis lidos.
- [ ] 4.3 📱 **PDF e compartilhar.** No celular:
  - use "Baixar PDF";
  - no ícone de compartilhar, use "Enviar o PDF": deve abrir o WhatsApp ou o e-mail com o arquivo anexado;
  - use "Copiar o link";
  - o registro da janela mostra as três ações, com o nome e a hora;
  - no computador, "Enviar o PDF" pode baixar o arquivo para anexar, e isso fica registrado como "Baixou o PDF para enviar".
- [ ] 4.4 **Arquivo do mês.** Em Arquivo do mês, confira o que falta: evoluções sem concluir e a assinatura. Use "Baixar a prévia": o Word sai marcado como prévia. Com tudo concluído, "Enviar o arquivo". A confirmação lista o que muda no cadastro de metas: alcançadas, em manutenção, novas (sem programa e com o critério a definir) e as linhas da parte 3 que não acharam meta. ⚠️ Não tem volta (ver os cuidados do item 0).
- [ ] 4.5 **Depois do envio.** As evoluções ficam só para leitura, e a carteira não abre outra evolução no mês. Em Metas, as situações mudaram como a confirmação mostrou; complete o programa e o critério das metas novas.

## 5. Contas médicas

Entre com a conta do item 1.3.

- [ ] 5.1 **O que ela vê.** Só "Arquivos recebidos", com os cards de recebidos e a chegar.
- [ ] 5.2 **O arquivo.** O arquivo da carteira de teste aparece. A lista mostra os assistidos, o código e o plano.
- [ ] 5.3 **Word.** "Baixar Word": Cambria 12, espaçamento 1,5, um bloco por assistido em ordem alfabética, e a assinatura com o nome e o CRP no fim.
- [ ] 5.4 **O que não vê.** Não aparecem rascunhos, devoluções, gráfico das metas nem o registro do PDF. Se colar o endereço `/progresso/<número>`, a tela não abre para esse perfil.

## 6. Acesso

- [ ] 6.1 **Esqueci a senha.** Com um e-mail da equipe, o link chega e troca a senha.
- [ ] 6.2 **Desativar.** Na coordenação geral, desative a pessoa de contas médicas. Ela perde o acesso na hora. Reative depois.
- [ ] 6.3 **Link de outra carteira.** Com a coordenadora, cole o link do gráfico de um assistido de outra carteira: aparece "Assistido não encontrado".
