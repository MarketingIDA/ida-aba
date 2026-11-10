import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { buscarPessoas, salvarPessoa } from '@/features/cadastros/api/pessoas.api';
import { server } from '@/testing/server';

const USUARIOS = `${env.SUPABASE_URL}/rest/v1/usuarios`;
const VALORES = {
  nome: 'Dora Fictícia',
  email: 'dora.demo@evolucao-aba.test',
  papel: 'coordenador',
  crp: null,
  ativo: true,
} as const;

const regraDoBanco = (hint: string) =>
  HttpResponse.json({ code: '23514', hint, message: 'regra' }, { status: 400 });

describe('API das pessoas', () => {
  it('lê do schema acesso e diz se a pessoa tem conta, sem expor o id da conta', async () => {
    const pessoas = await buscarPessoas();
    expect(pessoas[0]).toEqual({
      id: 4,
      nome: 'Bruno Fictício Novo',
      email: 'novo.demo@evolucao-aba.test',
      papel: 'coordenador',
      crp: null,
      ativo: true,
      temConta: false,
    });
    expect(pessoas.every((pessoa) => !('auth_user_id' in pessoa))).toBe(true);
    expect(pessoas.find((pessoa) => pessoa.id === 1)?.temConta).toBe(true);
  });

  it.each([
    ['ultima_coordenacao_geral', 'O sistema precisa de ao menos uma coordenação geral ativa.'],
    ['email_com_conta', 'Esta pessoa já tem conta e entra com este e-mail.'],
    ['coordenador_com_carteira', 'Esta pessoa tem carteira ativa.'],
  ])('a regra "%s" do banco vira mensagem própria', async (hint, comeco) => {
    server.use(http.patch(USUARIOS, () => regraDoBanco(hint)));
    const falha = salvarPessoa(VALORES, 2);
    await expect(falha).rejects.toMatchObject({ codigo: 'regra_violada' });
    await expect(falha).rejects.toThrow(comeco);
  });

  it('quem não é da coordenação geral recebe a recusa do RLS em português', async () => {
    server.use(
      http.post(USUARIOS, () =>
        HttpResponse.json({ code: '42501', message: 'row-level security' }, { status: 403 }),
      ),
    );
    await expect(salvarPessoa(VALORES)).rejects.toMatchObject({
      codigo: 'sem_permissao',
      message: 'Só a coordenação geral cadastra e altera pessoas.',
    });
  });

  it('resposta fora do formato não vira dado na tela', async () => {
    server.use(http.get(USUARIOS, () => HttpResponse.json([{ id: 1, papel: 'dono' }])));
    await expect(buscarPessoas()).rejects.toThrow();
  });
});
