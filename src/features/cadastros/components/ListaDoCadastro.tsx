import { Pencil } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import { Button } from '@/components/ui/button';

export interface ItemDoCadastro {
  id: number;
  nome: string;
  /** A sigla da unidade; o plano não tem. */
  sigla?: string;
  ativo: boolean;
}

interface Props {
  rotulo: string;
  itens: readonly ItemDoCadastro[];
  /** "Desativada" ou "Desativado", pelo gênero do que a lista mostra. */
  rotuloDoInativo: string;
  aoEditar: (id: number) => void;
}

/** Os ativos primeiro, cada grupo na ordem que o banco mandou (sigla ou nome). */
const ativosPrimeiro = (itens: readonly ItemDoCadastro[]) =>
  [...itens].sort((a, b) => Number(b.ativo) - Number(a.ativo));

/** Lista do cadastro: sigla, nome, a marca de desativado (só quando é) e "Editar". */
export function ListaDoCadastro({ rotulo, itens, rotuloDoInativo, aoEditar }: Readonly<Props>) {
  return (
    <ul
      aria-label={rotulo}
      className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
    >
      {ativosPrimeiro(itens).map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          {item.sigla !== undefined && (
            <span className="grid h-8 min-w-12 place-items-center rounded-md bg-info-soft px-2 font-mono text-caption font-bold text-azul-escuro">
              {item.sigla}
            </span>
          )}
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
            <b className="truncate text-[0.90625rem] text-marinho">{item.nome}</b>
            {!item.ativo && <Situacao rotulo={rotuloDoInativo} tom="neutro" />}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Editar ${item.nome}`}
            onClick={() => {
              aoEditar(item.id);
            }}
          >
            <Pencil aria-hidden="true" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
