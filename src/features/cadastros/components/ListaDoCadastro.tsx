import { Pencil } from 'lucide-react';

import { Situacao } from '@/components/Situacao';
import { Button } from '@/components/ui/button';

export interface MarcaDoItem {
  rotulo: string;
  tom: 'info' | 'alerta';
}

export interface ItemDoCadastro {
  id: number;
  nome: string;
  /** A sigla da unidade; o plano e a pessoa não têm. */
  sigla?: string;
  /** Linha de baixo, em letra menor (ex.: o papel e o e-mail da pessoa). */
  detalhe?: string;
  /** Pílulas ao lado do nome (ex.: "Você", "Sem conta"), sempre com texto. */
  marcas?: readonly MarcaDoItem[];
  ativo: boolean;
  /** "Desativada" ou "Desativado" deste item, quando o gênero muda de um para outro. */
  rotuloDoInativo?: string;
  /** Nome do botão "Editar" quando o nome do item pode repetir (padrão: `Editar <nome>`). */
  rotuloDaEdicao?: string;
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

/** Nome, as marcas, a de desativado (só quando é) e o detalhe embaixo. */
function Identificacao({
  item,
  rotuloDoInativo,
}: Readonly<{ item: ItemDoCadastro; rotuloDoInativo: string }>) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
        <b className="truncate text-[0.90625rem] font-extrabold text-marinho">{item.nome}</b>
        {item.marcas?.map((marca) => (
          <Situacao key={marca.rotulo} {...marca} pequena />
        ))}
        {!item.ativo && (
          <Situacao rotulo={item.rotuloDoInativo ?? rotuloDoInativo} tom="neutro" pequena />
        )}
      </span>
      {item.detalhe !== undefined && (
        <span className="text-[0.78rem] font-semibold [overflow-wrap:anywhere] text-apagado">
          {item.detalhe}
        </span>
      )}
    </span>
  );
}

/** Lista do cadastro: sigla, nome, marcas, detalhe e "Editar". */
export function ListaDoCadastro({ rotulo, itens, rotuloDoInativo, aoEditar }: Readonly<Props>) {
  return (
    <ul
      aria-label={rotulo}
      className="overflow-hidden rounded-xl border border-borda bg-superficie shadow-md"
    >
      {ativosPrimeiro(itens).map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3.5 border-b border-borda px-4 py-[13px] transition-colors duration-150 last:border-b-0 hover:bg-superficie-2 min-[861px]:px-[22px]"
        >
          {item.sigla !== undefined && (
            <span className="grid h-8 min-w-12 place-items-center rounded-full bg-info-soft px-2.5 text-[0.78rem] font-extrabold text-azul-escuro">
              {item.sigla}
            </span>
          )}
          <Identificacao item={item} rotuloDoInativo={rotuloDoInativo} />
          <Button
            variant="ghost"
            size="sm"
            aria-label={item.rotuloDaEdicao ?? `Editar ${item.nome}`}
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
