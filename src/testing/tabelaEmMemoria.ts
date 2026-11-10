import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { env } from '@/config/env';
import { server } from '@/testing/server';

export interface Escrita {
  metodo: 'POST' | 'PATCH';
  corpo: Record<string, unknown>;
  /** O schema da escrita (`Content-Profile`): `cadastro`, `acesso`... */
  perfil: string | null;
}

/**
 * O que não se repete na tabela: um campo (a `unique` do banco) ou uma regra entre a linha que já
 * existe e a que vai ficar (ex.: um índice único parcial, só entre as ativas).
 */
export type Unicidade<T> = keyof T | ((existente: T, nova: T) => boolean);

const repete = <T>(unico: Unicidade<T>, existente: T, nova: T) =>
  typeof unico === 'function' ? unico(existente, nova) : existente[unico] === nova[unico];

const DUPLICADO = { code: '23505', message: 'duplicate key' };

/**
 * Uma tabela da Data API em memória: lista, cadastra e altera pelo `id`, recusando o que repete
 * (`unico`) como a constraint do banco, no cadastro e na alteração. O que o banco preenche sozinho
 * no cadastro vem em `padrao` (ex.: a pessoa nasce sem conta). Devolve as escritas, para conferir
 * o que foi mandado.
 */
export function tabelaEmMemoria<T extends { id: number }>(
  nome: string,
  inicial: readonly T[],
  unico: Unicidade<T>,
  padrao: Partial<T> = {},
): Escrita[] {
  const url = `${env.SUPABASE_URL}/rest/v1/${nome}`;
  const linhas = [...inicial];
  const escritas: Escrita[] = [];
  const registrar = async (metodo: Escrita['metodo'], request: Request) => {
    const corpo = (await request.json()) as Record<string, unknown>;
    escritas.push({ metodo, corpo, perfil: request.headers.get('content-profile') });
    return corpo as Partial<T>;
  };
  server.use(
    http.get(url, () => HttpResponse.json(linhas)),
    http.post(url, async ({ request }) => {
      const corpo = await registrar('POST', request);
      const nova = { ...padrao, ...corpo, id: linhas.length + 1 } as T;
      if (linhas.some((l) => repete(unico, l, nova))) {
        return HttpResponse.json(DUPLICADO, { status: 409 });
      }
      linhas.push(nova);
      return HttpResponse.json(nova, { status: 201 });
    }),
    http.patch(url, async ({ request }) => {
      const corpo = await registrar('PATCH', request);
      const id = Number(new URL(request.url).searchParams.get('id')?.replace('eq.', ''));
      const indice = linhas.findIndex((l) => l.id === id);
      const alterada = { ...linhas[indice], ...corpo, id } as T;
      if (linhas.some((l) => l.id !== id && repete(unico, l, alterada))) {
        return HttpResponse.json(DUPLICADO, { status: 409 });
      }
      linhas[indice] = alterada;
      return HttpResponse.json(alterada);
    }),
  );
  return escritas;
}

/** O texto de cada linha da lista, na ordem da tela. */
export const itensDa = (lista: string) =>
  within(screen.getByRole('list', { name: lista }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);
