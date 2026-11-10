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

export type CamposDaUnidade = z.input<typeof esquemaUnidade>;
export type CamposDoPlano = z.input<typeof esquemaPlano>;
