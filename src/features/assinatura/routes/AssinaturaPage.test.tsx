import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/config/env';
import { AssinaturaPage } from '@/features/assinatura';
import { usuarioDemo } from '@/testing/factories/usuario';
import { renderWithProviders } from '@/testing/renderWithProviders';
import { server } from '@/testing/server';

const REST = `${env.SUPABASE_URL}/rest/v1`;
const STORAGE = `${env.SUPABASE_URL}/storage/v1/object/assinaturas`;

/** O banco e o Storage em memória: a assinatura gravada é a que a tela lê de volta. */
function servirBanco() {
  const banco = {
    linhas: [] as { caminho: string; criado_em: string }[],
    imagens: new Set<string>(),
  };
  server.use(
    http.get(`${REST}/usuarios`, () => HttpResponse.json([{ crp: '02/00001' }])),
    http.get(`${REST}/assinaturas`, () => HttpResponse.json(banco.linhas.slice(-1))),
    http.post(`${STORAGE}/*`, ({ params }) => {
      banco.imagens.add(String(params[0]));
      return HttpResponse.json({ Key: `assinaturas/${String(params[0])}` });
    }),
    http.post(`${REST}/assinaturas`, async ({ request }) => {
      const { caminho } = (await request.json()) as { caminho: string };
      banco.linhas.push({ caminho, criado_em: '2026-11-11T17:03:00Z' });
      return new HttpResponse(null, { status: 201 });
    }),
    http.get(`${STORAGE}/*`, () =>
      HttpResponse.arrayBuffer(new Uint8Array([137, 80, 78, 71]).buffer, {
        headers: { 'Content-Type': 'image/png' },
      }),
    ),
  );
  return banco;
}

describe('Assinatura do coordenador', () => {
  it('envia a imagem à própria pasta, grava e mostra a assinatura atual', async () => {
    const banco = servirBanco();
    const { user } = renderWithProviders(<AssinaturaPage />, { usuario: usuarioDemo() });

    expect(await screen.findByText('Você ainda não tem assinatura')).toBeInTheDocument();
    await user.upload(
      screen.getByLabelText('Imagem da assinatura'),
      new File([new Uint8Array([137, 80, 78, 71])], 'assinatura.png', { type: 'image/png' }),
    );
    expect(await screen.findByText('Nova assinatura')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar assinatura' }));

    expect(await screen.findByText('Assinatura atual')).toBeInTheDocument();
    expect(screen.getByText('Enviada em 11/11/2026 às 14:03.')).toBeInTheDocument();
    expect(screen.getByText('CRP 02/00001')).toBeInTheDocument();
    const [caminho] = banco.linhas.map((l) => l.caminho);
    expect(caminho).toMatch(/^2\/[0-9a-f-]{36}\.png$/);
    expect(banco.imagens.has(caminho ?? '')).toBe(true);
  });
});
