import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import type { DadosDaMeta } from '@/features/cadastros/api/metas.api';
import { FormularioDeMeta } from '@/features/cadastros/components/FormularioDeMeta';
import { GavetaDoCadastro } from '@/features/cadastros/components/GavetaDoCadastro';
import { metasDoAssistidoOptions, useSalvarMeta } from '@/features/cadastros/metas';
import { normalizarMeta } from '@dominio/metas.ts';

/** A meta cabe no cadastro (5 a 500 letras, como no banco). */
const cabeNoCadastro = (meta: string) => meta.trim().length >= 5 && meta.trim().length <= 500;

/** O botão ao lado da meta: pulsa para chamar a atenção (parado para quem pede menos movimento). */
function BotaoPulsante({ meta, aoClicar }: Readonly<{ meta: string; aoClicar: () => void }>) {
  return (
    <button
      type="button"
      aria-label={`Incluir no cadastro de metas: ${meta}`}
      title="Esta meta ainda não está no cadastro de metas do assistido"
      className="ml-2 inline-flex min-h-7 animate-pulsar cursor-pointer items-center gap-1 rounded-full border-[1.5px] border-info-border bg-info-soft px-2.5 align-middle text-xs font-extrabold whitespace-nowrap text-info-text foco-anel transition-colors duration-150 hover:border-azul hover:bg-azul hover:text-white motion-reduce:animate-none motion-reduce:transition-none"
      onClick={aoClicar}
    >
      <Plus aria-hidden="true" className="size-3.5" />
      Incluir no cadastro
    </button>
  );
}

/**
 * A sugestão de levar ao cadastro de metas do assistido as metas das partes 3 e 4 que ainda não
 * estão lá (E23): um botão pulsante ao lado de cada uma, que abre o formulário de meta com o texto
 * já escrito. A meta alcançada entra como alcançada; a do mês atual, em desenvolvimento. Com a
 * meta no cadastro, o botão some.
 */
export function useSugestaoDeMeta(assistidoId: number | null, alcancada: boolean) {
  const ativa = assistidoId !== null;
  const cadastro = useQuery({ ...metasDoAssistidoOptions(assistidoId ?? 0), enabled: ativa });
  const salvar = useSalvarMeta(assistidoId ?? 0);
  const [sugerida, setSugerida] = useState<string | null>(null);
  const [aberta, setAberta] = useState(false);
  const noCadastro = new Set((cadastro.data ?? []).map((meta) => normalizarMeta(meta.texto)));

  function botao(meta: string): ReactNode {
    if (!ativa || !cadastro.isSuccess) return null;
    if (!cabeNoCadastro(meta) || noCadastro.has(normalizarMeta(meta))) return null;
    return (
      <BotaoPulsante
        meta={meta}
        aoClicar={() => {
          setSugerida(meta);
          setAberta(true);
        }}
      />
    );
  }

  async function aoSalvar(dados: DadosDaMeta) {
    await salvar.mutateAsync({ dados });
    setAberta(false);
  }

  const janela = ativa && (
    <GavetaDoCadastro
      aberta={aberta}
      aoFechar={() => {
        setAberta(false);
      }}
      titulo="Incluir meta no cadastro"
      descricao="A meta veio da evolução mensal. Complete o programa e o critério de alcance."
      chave={sugerida ?? 'nenhuma'}
    >
      <FormularioDeMeta
        meta={null}
        inicial={{
          texto: sugerida?.trim() ?? '',
          situacao: alcancada ? 'alcancada' : 'desenvolvimento',
        }}
        aoSalvar={aoSalvar}
        aoCancelar={() => {
          setAberta(false);
        }}
      />
    </GavetaDoCadastro>
  );

  return { botao, janela };
}
