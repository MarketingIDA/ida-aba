import { z } from 'zod';

import { GENEROS } from '@/features/cadastros/api/assistidos.api';
import { cnpjValido, normalizarCnpj } from '@/utils/cnpj';
import { TURNOS } from '@/utils/turno';

/**
 * Regras dos formulários, as mesmas dos `check` do banco (que tem a última palavra). A mensagem
 * diz o que fazer, não o que deu errado.
 */
const nome = (oQue: string) =>
  z
    .string()
    .trim()
    .min(2, `Escreva o nome ${oQue}, com 2 letras ou mais.`)
    .max(80, `O nome ${oQue} pode ter até 80 letras.`);

/** Vazio vira nulo no banco; com texto, tira os espaços das pontas. */
const opcional = (texto: string) => (texto.trim() === '' ? null : texto.trim());

export const esquemaUnidade = z.object({
  // Entra no código da evolução (E16): só letras sem acento, em maiúsculas.
  sigla: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Use de 2 a 5 letras, sem acento e sem número (ex.: BOV).'),
  nome: nome('da unidade'),
  // Obrigatório; vai ao banco sem pontuação.
  cnpj: z
    .string()
    .transform(normalizarCnpj)
    .pipe(
      z
        .string()
        .min(1, { error: 'Escreva o CNPJ da unidade.', abort: true })
        .regex(/^[\dA-Z]{12}\d{2}$/, {
          error: 'Confira o CNPJ: são 14 números, como 12.345.678/0001-95.',
          abort: true,
        })
        .refine(cnpjValido, 'Confira o CNPJ: os dois últimos números não batem com os outros.'),
    ),
  endereco: z
    .string()
    .refine((texto) => {
      const tamanho = texto.trim().length;
      return tamanho === 0 || (tamanho >= 5 && tamanho <= 200);
    }, 'Escreva o endereço com 5 a 200 letras, ou deixe em branco.')
    .transform(opcional),
  ativa: z.boolean(),
});

export const esquemaPlano = z.object({
  nome: nome('do plano'),
  ativo: z.boolean(),
});

export const PAPEIS = ['coordenador', 'coordenacao_geral', 'contas_medicas'] as const;

/**
 * Pessoa: o papel é escolha obrigatória (decide o que ela vê). O CRP só vale para a coordenação
 * de unidade e pode ficar para depois; para os outros papéis, vai vazio ao banco.
 */
export const esquemaPessoa = z
  .object({
    nome: z
      .string()
      .trim()
      .min(2, 'Escreva o nome da pessoa, com 2 letras ou mais.')
      .max(120, 'O nome pode ter até 120 letras.'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email('Escreva o e-mail completo, como nome@clinica.com.br.')),
    papel: z.enum(PAPEIS, 'Escolha o papel da pessoa.'),
    crp: z.string().trim(),
    ativo: z.boolean(),
  })
  .superRefine(({ papel, crp }, contexto) => {
    if (papel === 'coordenador' && crp !== '' && (crp.length < 4 || crp.length > 20)) {
      contexto.addIssue({
        code: 'custom',
        path: ['crp'],
        message: 'Escreva o CRP como no carimbo, com 4 a 20 caracteres (ex.: 06/12345).',
      });
    }
  })
  .transform(({ crp, ...pessoa }) => ({
    ...pessoa,
    crp: pessoa.papel === 'coordenador' && crp !== '' ? crp : null,
  }));

/** O `select` nativo devolve texto; a opção vazia ("Escolha...") não vira 0. */
const escolhaDoSeletor = (mensagem: string) => z.string().min(1, mensagem).transform(Number);

const coordenadorId = escolhaDoSeletor('Escolha quem coordena a carteira.');

/** Carteira nova: unidade, turno e quem coordena. Nasce ativa. */
export const esquemaNovaCarteira = z.object({
  unidadeId: escolhaDoSeletor('Escolha a unidade da carteira.'),
  turno: z.enum(TURNOS, 'Escolha o turno da carteira.'),
  coordenadorId,
});

/** Carteira existente: passa para outra coordenação ou é desativada. */
export const esquemaAlteracaoDaCarteira = z.object({ coordenadorId, ativa: z.boolean() });

/** Hoje em Recife, `AAAA-MM-DD` (o formato do campo de data). */
const hojeEmRecife = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Recife' });

const NOME_COMPLETO = 'Escreva o nome completo, com sobrenome.';

/**
 * Assistido: nome completo (o banco exige sobrenome), como o texto se refere a ele e a carteira.
 * Data de nascimento e plano podem ficar para depois: vazios, vão nulos ao banco.
 */
export const esquemaAssistido = z.object({
  nome: z
    .string()
    .trim()
    // Curto demais já diz o que falta: não repete o aviso do sobrenome.
    .min(5, { error: NOME_COMPLETO, abort: true })
    .max(120, 'O nome pode ter até 120 letras.')
    .regex(/\S\s+\S/, NOME_COMPLETO),
  genero: z.enum(GENEROS, 'Escolha como o texto se refere: a assistida ou o assistido.'),
  dataNascimento: z
    .string()
    .refine(
      (data) => data === '' || (data >= '1990-01-01' && data <= hojeEmRecife()),
      'Confira a data: de 1990 até hoje.',
    )
    .transform((data) => (data === '' ? null : data)),
  planoId: z.string().transform((plano) => (plano === '' ? null : Number(plano))),
  carteiraId: escolhaDoSeletor('Escolha a carteira do assistido.'),
  ativo: z.boolean(),
});

export type CamposDaUnidade = z.input<typeof esquemaUnidade>;
export type CamposDoPlano = z.input<typeof esquemaPlano>;
export type CamposDaPessoa = z.input<typeof esquemaPessoa>;
export type CamposDaNovaCarteira = z.input<typeof esquemaNovaCarteira>;
export type CamposDaAlteracaoDaCarteira = z.input<typeof esquemaAlteracaoDaCarteira>;
export type CamposDoAssistido = z.input<typeof esquemaAssistido>;
