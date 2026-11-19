import { useQuery } from '@tanstack/react-query';
import { PenLine, TriangleAlert } from 'lucide-react';

import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Button } from '@/components/ui/button';
import type { DadosDaAssinatura } from '@/features/assinatura/api/assinatura.api';
import { EscolhaDaImagem } from '@/features/assinatura/components/EscolhaDaImagem';
import { PreviaDaAssinatura } from '@/features/assinatura/components/PreviaDaAssinatura';
import { assinaturaOptions } from '@/features/assinatura/queries';
import { useTrocaDaAssinatura } from '@/features/assinatura/routes/useTrocaDaAssinatura';
import { type Usuario, useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';
import { dataEHora } from '@/utils/textos';

const SEM_FORMATO =
  'Os dados chegaram num formato inesperado. Tente de novo; se continuar, avise a coordenação geral.';

type Troca = ReturnType<typeof useTrocaDaAssinatura>;

function AvisoDoCrp() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-alerta-border bg-alerta-soft px-4 py-3 text-sm font-semibold text-alerta-text">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Seu CRP não está no cadastro. Ele vai abaixo da assinatura: peça à coordenação geral para
      incluir em Cadastros → Pessoas.
    </p>
  );
}

/** A coluna da direita: a área de trocar, ou salvar e cancelar a imagem nova. */
function Troca({ troca, temAtual }: Readonly<{ troca: Troca; temAtual: boolean }>) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="rotulo text-apagado">
        {temAtual ? 'Trocar a assinatura' : 'Enviar a assinatura'}
      </p>
      {troca.nova === null ? (
        <EscolhaDaImagem
          aoEscolher={troca.escolher}
          desabilitado={troca.ocupado}
          rotuloDoArquivo={temAtual ? 'Trocar imagem' : 'Escolher imagem'}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-info-border bg-info-soft p-4">
          <p className="text-sm font-semibold text-info-text">
            Confira ao lado como ela vai sair no arquivo do mês antes de salvar.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" disabled={troca.ocupado} onClick={troca.salvar}>
              {troca.salvando ? 'Salvando…' : 'Salvar assinatura'}
            </Button>
            <Button size="lg" variant="ghost" disabled={troca.ocupado} onClick={troca.cancelar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
      {troca.preparando && (
        <p role="status" className="text-sm text-apagado">
          Preparando a imagem…
        </p>
      )}
      {troca.erro !== null && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {troca.erro}
        </p>
      )}
    </div>
  );
}

/** O que a coluna da esquerda mostra: a imagem nova, a atual, ou o convite. */
function previa(troca: Troca, dados: DadosDaAssinatura) {
  if (troca.nova !== null) {
    return {
      endereco: troca.nova.endereco,
      titulo: 'Nova assinatura',
      legenda: 'Ainda não salva.',
    };
  }
  if (dados.assinatura === null) {
    return { endereco: null, titulo: 'Como sai no documento', legenda: 'Ainda sem assinatura.' };
  }
  return {
    endereco: dados.assinatura.endereco,
    titulo: 'Assinatura atual',
    legenda: `Enviada em ${dataEHora(dados.assinatura.enviadaEm)}.`,
  };
}

function ConteudoDaAssinatura({
  usuario,
  dados,
}: Readonly<{ usuario: Usuario; dados: DadosDaAssinatura }>) {
  const troca = useTrocaDaAssinatura(usuario.id);
  return (
    <>
      {dados.crp === null && <AvisoDoCrp />}
      <div className="grid gap-6 rounded-xl border border-borda bg-superficie p-5 shadow-md min-[861px]:grid-cols-2 min-[861px]:p-[22px]">
        <PreviaDaAssinatura {...previa(troca, dados)} nome={usuario.nome} crp={dados.crp} />
        <Troca troca={troca} temAtual={dados.assinatura !== null} />
      </div>
      <p className="max-w-[70ch] text-sm text-texto-2">
        Uma assinatura nova vale para os próximos arquivos. Os arquivos já enviados ficam com a
        assinatura da época.
      </p>
    </>
  );
}

/** A assinatura do coordenador, que vai no fim do arquivo do mês (E14). */
export function AssinaturaPage() {
  const usuario = useUsuario();
  const consulta = useQuery({ ...assinaturaOptions(usuario?.id ?? 0), enabled: usuario !== null });
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-xs font-extrabold tracking-[0.1em] text-info-text uppercase">
          <PenLine aria-hidden="true" className="size-3.5" />
          Cadastros
        </p>
        <h1>Minha assinatura</h1>
        <p className="max-w-[72ch] text-apagado">
          Vai no fim do arquivo do mês que você envia a contas médicas, acima do seu nome e do CRP.
          Sem ela, o envio a contas médicas fica bloqueado.
        </p>
      </div>
      {consulta.isPending && (
        <div
          role="status"
          aria-label="Carregando a assinatura"
          className="h-64 animate-pulse rounded-xl bg-neutro-suave"
        />
      )}
      {consulta.isError && (
        <FalhaAoCarregar
          titulo="Não foi possível carregar a assinatura"
          mensagem={ehErroApp(consulta.error) ? consulta.error.message : SEM_FORMATO}
          aoTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {consulta.isSuccess && usuario !== null && (
        <ConteudoDaAssinatura usuario={usuario} dados={consulta.data} />
      )}
    </section>
  );
}
