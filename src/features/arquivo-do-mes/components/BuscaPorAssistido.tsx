import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CarteiraDoMes } from '@/features/arquivo-do-mes/api/arquivos.api';
import { LinhaDaEvolucao } from '@/features/arquivo-do-mes/components/EvolucoesDoArquivo';
import { achaAEvolucao, nomeDaCarteira } from '@/features/arquivo-do-mes/logica';
import { evolucoesDoArquivoOptions } from '@/features/arquivo-do-mes/queries';

/** A busca começa com duas letras: antes disso, a lista dos arquivos basta. */
const MINIMO_DA_BUSCA = 2;

interface Props {
  carteiras: readonly CarteiraDoMes[];
  comLink: boolean;
}

/** As evoluções de todos os arquivos que chegaram, com a carteira de cada uma. */
function useEvolucoesDosArquivos(carteiras: readonly CarteiraDoMes[], ligado: boolean) {
  const enviadas = carteiras.filter((c) => c.arquivo !== null);
  const nomes = enviadas.map(nomeDaCarteira);
  return useQueries({
    queries: enviadas.map((c) => ({
      ...evolucoesDoArquivoOptions(c.arquivo?.id ?? 0),
      enabled: ligado,
    })),
    combine: (resultados) => ({
      carregando: resultados.some((r) => r.isPending),
      falhou: resultados.some((r) => r.isError),
      evolucoes: resultados.flatMap((r, i) =>
        (r.data ?? []).map((evolucao) => ({
          evolucao,
          carteira: nomes[i] ?? '',
        })),
      ),
    }),
  });
}

/** O resultado da busca: carregando, a falha, nada achado ou as evoluções achadas. */
function Resultado({ busca, carteiras, comLink }: Readonly<Props & { busca: string }>) {
  const { carregando, falhou, evolucoes } = useEvolucoesDosArquivos(carteiras, true);
  if (falhou) {
    return (
      <p role="alert" className="text-sm font-bold text-bloq-text">
        Não foi possível buscar nas evoluções agora. Tente de novo em instantes.
      </p>
    );
  }
  if (carregando) {
    return (
      <p role="status" className="text-sm text-apagado">
        Buscando nos arquivos…
      </p>
    );
  }
  const achadas = evolucoes
    .filter(({ evolucao }) => achaAEvolucao(evolucao, busca))
    .sort((a, b) => a.evolucao.assistido.localeCompare(b.evolucao.assistido));
  if (achadas.length === 0) {
    return (
      <p role="status" className="text-sm text-apagado">
        Nenhuma evolução nos arquivos que chegaram tem esse nome, código ou plano.
      </p>
    );
  }
  return (
    <ul aria-label="Evoluções achadas" className="divide-y divide-borda">
      {achadas.map(({ evolucao, carteira }) => (
        <LinhaDaEvolucao
          key={evolucao.id}
          evolucao={evolucao}
          comLink={comLink}
          carteira={carteira}
        />
      ))}
    </ul>
  );
}

/**
 * A busca por assistido (E24): acha a evolução em qualquer arquivo que já chegou no mês, pelo
 * nome, pelo código ou pelo plano. Só busca nas evoluções quando há o que procurar.
 */
export function BuscaPorAssistido({ carteiras, comLink }: Readonly<Props>) {
  const [busca, setBusca] = useState('');
  const buscando = busca.trim().length >= MINIMO_DA_BUSCA;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-4 shadow-md">
      <Label htmlFor="busca-por-assistido">Buscar por assistido, código ou plano</Label>
      <Input
        id="busca-por-assistido"
        type="search"
        autoComplete="off"
        value={busca}
        onChange={(evento) => {
          setBusca(evento.target.value);
        }}
      />
      {buscando && <Resultado busca={busca.trim()} carteiras={carteiras} comLink={comLink} />}
    </div>
  );
}
