import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { useFiltrosDaUrl } from '@/features/evolucoes/routes/useFiltrosDaUrl';

const MESES = ['2026-11-01', '2026-10-01'];

function renderizar(rota: string) {
  const comRotas = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[rota]}>{children}</MemoryRouter>
  );
  return renderHook(() => useFiltrosDaUrl('2026-11-01', MESES), { wrapper: comRotas });
}

describe('useFiltrosDaUrl', () => {
  it('lê os filtros da URL e troca valor inválido pelo padrão', () => {
    const { result } = renderizar('/?mes=2020-01-01&situacao=xyz&q=ana&coordenador=7&unidade=UNA');
    expect(result.current).toMatchObject({
      mes: '2026-11-01',
      situacao: null,
      busca: 'ana',
      unidade: 'UNA',
      coordenadorId: 7,
    });
  });

  it('duas mudanças seguidas, antes da URL atualizar, valem as duas', () => {
    const { result } = renderizar('/?situacao=em_conferencia');
    act(() => {
      // Tirar o filtro do card e digitar na busca logo depois: a segunda não pode trazer a primeira de volta.
      result.current.mudar({ situacao: '' });
      result.current.mudar({ q: 'davi' }, true);
    });
    expect(result.current.situacao).toBeNull();
    expect(result.current.busca).toBe('davi');
  });

  it('a mudança seguinte parte da URL nova depois que ela atualiza', () => {
    const { result } = renderizar('/');
    act(() => {
      result.current.mudar({ unidade: 'UNA' });
    });
    act(() => {
      result.current.mudar({ coordenador: '2' });
    });
    expect(result.current).toMatchObject({ unidade: 'UNA', coordenadorId: 2 });
  });
});
