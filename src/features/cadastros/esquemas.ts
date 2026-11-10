import { z } from 'zod';

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

export const esquemaUnidade = z.object({
  // Entra no código da evolução (E16): só letras sem acento, em maiúsculas.
  sigla: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Use de 2 a 5 letras, sem acento e sem número (ex.: BOV).'),
  nome: nome('da unidade'),
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

export type CamposDaUnidade = z.input<typeof esquemaUnidade>;
export type CamposDoPlano = z.input<typeof esquemaPlano>;
export type CamposDaPessoa = z.input<typeof esquemaPessoa>;
