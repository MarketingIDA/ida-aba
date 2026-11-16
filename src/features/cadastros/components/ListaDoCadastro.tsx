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

/** A caixa de marcar de cada linha, para agir em vários de uma vez. */
export interface MarcacaoDaLista {
  marcado: (id: number) => boolean;
  /** Sem poder, a caixa aparece desabilitada (o detalhe da linha diz o que falta). */
  podeMarcar: (id: number) => boolean;
  aoMarcar: (id: number, marcado: boolean) => void;
}

interface Props {
  rotulo: string;
  itens: readonly ItemDoCadastro[];
  /** "Desativada" ou "Desativado", pelo gênero do que a lista mostra. */
  rotuloDoInativo: string;
  aoEditar: (id: number) => void;
  marcacao?: MarcacaoDaLista | undefined;
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
        <b className="truncate text-[0.90625rem] text-marinho">{item.nome}</b>
        {item.marcas?.map((marca) => (
          <Situacao key={marca.rotulo} {...marca} />
        ))}
        {!item.ativo && <Situacao rotulo={item.rotuloDoInativo ?? rotuloDoInativo} tom="neutro" />}
      </span>
      {item.detalhe !== undefined && (
        <span className="text-xs font-semibold [overflow-wrap:anywhere] text-apagado">
          {item.detalhe}
        </span>
      )}
    </span>
  );
}

function CaixaDeMarcar({
  item,
  marcacao,
}: Readonly<{ item: ItemDoCadastro; marcacao: MarcacaoDaLista }>) {
  return (
    <input
      type="checkbox"
      aria-label={`Marcar ${item.nome}`}
      className="size-5 shrink-0 accent-azul disabled:opacity-40"
      checked={marcacao.marcado(item.id)}
      disabled={!marcacao.podeMarcar(item.id)}
      onChange={(evento) => {
        marcacao.aoMarcar(item.id, evento.target.checked);
      }}
    />
  );
}

/** Lista do cadastro: (a caixa de marcar), sigla, nome, marcas, detalhe e "Editar". */
export function ListaDoCadastro({
  rotulo,
  itens,
  rotuloDoInativo,
  aoEditar,
  marcacao,
}: Readonly<Props>) {
  return (
    <ul
      aria-label={rotulo}
      className="divide-y divide-borda overflow-hidden rounded-xl border border-borda bg-superficie shadow-sm"
    >
      {ativosPrimeiro(itens).map((item) => (
        <li key={item.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
          {marcacao !== undefined && <CaixaDeMarcar item={item} marcacao={marcacao} />}
          {item.sigla !== undefined && (
            <span className="grid h-8 min-w-12 place-items-center rounded-md bg-info-soft px-2 font-mono text-caption font-bold text-azul-escuro">
              {item.sigla}
            </span>
          )}
          <Identificacao item={item} rotuloDoInativo={rotuloDoInativo} />
          <Button
            variant="secondary"
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
