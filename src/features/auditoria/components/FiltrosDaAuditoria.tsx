import { useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactNode } from 'react';

import { Seletor } from '@/components/Seletor';
import { Input } from '@/components/ui/input';
import type { FiltroDaAuditoria } from '@/features/auditoria/api/auditoria.api';
import { pessoasOptions } from '@/features/auditoria/queries';
import { TIPOS_DO_FILTRO } from '@/features/auditoria/textos';

interface Props {
  filtro: FiltroDaAuditoria;
  aoMudar: (filtro: FiltroDaAuditoria) => void;
}

const OPCOES_DO_TIPO = [
  <option key="" value="">
    Tudo
  </option>,
  ...TIPOS_DO_FILTRO.map((t) => (
    <option key={t.valor} value={t.valor}>
      {t.rotulo}
    </option>
  )),
];

function Campo({ rotulo, children }: Readonly<{ rotulo: string; children: ReactNode }>) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-caption font-bold text-texto-2">
      {rotulo}
      {children}
    </label>
  );
}

function CampoDeTexto({
  rotulo,
  valor,
  aoMudar,
  ...props
}: Readonly<
  { rotulo: string; valor: string; aoMudar: (valor: string) => void } & Pick<
    ComponentProps<'input'>,
    'type' | 'placeholder'
  >
>) {
  return (
    <Campo rotulo={rotulo}>
      <Input
        {...props}
        value={valor}
        onChange={(e) => {
          aoMudar(e.target.value);
        }}
      />
    </Campo>
  );
}

/** A lista de pessoas vem do cadastro (ativas e inativas: quem saiu continua na trilha). */
function CampoDaPessoa({
  valor,
  aoMudar,
}: Readonly<{ valor: number | null; aoMudar: (id: number | null) => void }>) {
  const pessoas = useQuery(pessoasOptions());
  return (
    <Campo rotulo="Pessoa">
      <Seletor
        value={valor ?? ''}
        onChange={(e) => {
          aoMudar(e.target.value === '' ? null : Number(e.target.value));
        }}
      >
        <option value="">Todas</option>
        {(pessoas.data ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </Seletor>
    </Campo>
  );
}

/** Período, pessoa, o quê e o registro. Cada mudança refaz a busca do começo. */
export function FiltrosDaAuditoria({ filtro, aoMudar }: Readonly<Props>) {
  const mudar = (parte: Partial<FiltroDaAuditoria>) => {
    aoMudar({ ...filtro, ...parte });
  };
  const texto = (chave: 'de' | 'ate' | 'registro') => ({
    valor: filtro[chave],
    aoMudar: (valor: string) => {
      mudar({ [chave]: valor });
    },
  });
  return (
    <form
      role="search"
      aria-label="Filtros da auditoria"
      className="grid grid-cols-1 gap-3 rounded-xl border border-borda bg-superficie p-4 shadow-sm min-[600px]:grid-cols-2 min-[1000px]:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <CampoDeTexto rotulo="De" type="date" {...texto('de')} />
      <CampoDeTexto rotulo="Até" type="date" {...texto('ate')} />
      <CampoDaPessoa
        valor={filtro.usuarioId}
        aoMudar={(usuarioId) => {
          mudar({ usuarioId });
        }}
      />
      <Campo rotulo="O quê">
        <Seletor
          value={filtro.tipo}
          onChange={(e) => {
            mudar({ tipo: e.target.value });
          }}
        >
          {OPCOES_DO_TIPO}
        </Seletor>
      </Campo>
      <CampoDeTexto rotulo="Registro (id)" placeholder="Ex.: 42" {...texto('registro')} />
    </form>
  );
}
