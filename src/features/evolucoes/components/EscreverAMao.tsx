import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { useId } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import type { Evolucao } from '@/features/evolucoes/api/evolucao.api';
import { CabecalhoDaEvolucao } from '@/features/evolucoes/components/CabecalhoDaEvolucao';
import { OutrosDocumentos } from '@/features/evolucoes/components/OutrosDocumentos';
import { EdicaoDoTexto } from '@/features/evolucoes/components/TextoDaEvolucao';
import {
  importacaoOptions,
  useAlterarEvolucao,
  useGerarRascunho,
} from '@/features/evolucoes/queries';
import {
  type OutrosDocumentos as Documentos,
  useOutrosDocumentos,
} from '@/features/evolucoes/routes/useOutrosDocumentos';
import { ehErroApp } from '@/lib/erroApp';

/** A escrita à mão que ainda não tem texto: é a tela só com o arquivo, a IA e os 5 campos. */
export const escrevendoAMao = (evolucao: Evolucao) =>
  evolucao.origem === 'manual' &&
  evolucao.texto === null &&
  evolucao.editavel &&
  evolucao.situacao === 'em_conferencia';

/** O pedido à IA: ela lê os arquivos carregados e preenche os campos (E26). */
function PreencherComAIA({
  evolucao,
  documentos,
}: Readonly<{ evolucao: Evolucao; documentos: Documentos }>) {
  const gerar = useGerarRascunho(evolucao.id);
  const semArquivo = documentos.documentos.length === 0;
  return (
    <div className="flex flex-col items-start gap-2 border-t border-borda pt-4">
      {documentos.bloqueio !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {documentos.bloqueio}
        </p>
      )}
      <Button
        size="lg"
        disabled={
          semArquivo || documentos.ocupado || documentos.bloqueio !== null || gerar.isPending
        }
        onClick={() => {
          gerar.mutate();
        }}
      >
        <Sparkles aria-hidden="true" />
        {gerar.isPending ? 'Preenchendo…' : 'Preencher com a IA'}
      </Button>
      {semArquivo && !gerar.isPending && (
        <p className="text-sm text-apagado">Carregue um arquivo para a IA preencher os campos.</p>
      )}
      {gerar.isPending && (
        <p role="status" className="text-sm text-apagado">
          Pode levar até um minuto. Não feche esta tela.
        </p>
      )}
      {gerar.isError && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {ehErroApp(gerar.error) ? gerar.error.message : 'Não foi possível preencher os campos.'}
        </p>
      )}
    </div>
  );
}

/**
 * A escrita à mão antes do texto (E26): carregar um arquivo para a IA preencher, ou escrever os 5
 * campos da evolução mensal. Depois de salvar, a evolução segue para a conferência das 4 partes.
 */
export function EscreverAMao({ evolucao }: Readonly<{ evolucao: Evolucao }>) {
  const titulo = useId();
  const navegar = useNavigate();
  const documentos = useOutrosDocumentos(evolucao);
  const importacao = useQuery(importacaoOptions(evolucao.id)).data ?? null;
  const { salvar } = useAlterarEvolucao(evolucao.id);
  const erro = ehErroApp(salvar.error)
    ? salvar.error.message
    : 'Não foi possível salvar agora. Tente de novo em instantes.';
  return (
    <>
      <CabecalhoDaEvolucao
        evolucao={evolucao}
        importacao={importacao}
        documentos={documentos.documentos.length}
      />
      <OutrosDocumentos evolucao={evolucao} estado={documentos} escritaAMao>
        <PreencherComAIA evolucao={evolucao} documentos={documentos} />
      </OutrosDocumentos>
      <section
        aria-labelledby={titulo}
        className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 shadow-md sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 id={titulo}>Evolução mensal</h2>
          <p className="max-w-[72ch] text-sm text-texto-2">
            Descreva o mês em cada campo, do seu jeito. Campo em branco fica em branco. Depois de
            salvar, você confere a evolução e pode aprimorar o texto com a IA.
          </p>
        </div>
        <EdicaoDoTexto
          inicial={null}
          salvando={salvar.isPending}
          erro={salvar.isError ? erro : null}
          aoSalvar={(conteudo) => {
            salvar.mutate({ numero: 2, conteudo });
          }}
          aoCancelar={() => {
            void navegar('/evolucoes');
          }}
        />
      </section>
    </>
  );
}
