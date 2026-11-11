import { useQuery } from '@tanstack/react-query';
import { Signature, TriangleAlert } from 'lucide-react';

import { EmptyState } from '@/components/EmptyState';
import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { Button } from '@/components/ui/button';
import type { DadosDaAssinatura } from '@/features/assinatura/api/assinatura.api';
import { EscolhaDaImagem } from '@/features/assinatura/components/EscolhaDaImagem';
import { dataEHora, PreviaDaAssinatura } from '@/features/assinatura/components/PreviaDaAssinatura';
import { assinaturaOptions } from '@/features/assinatura/queries';
import { useTrocaDaAssinatura } from '@/features/assinatura/routes/useTrocaDaAssinatura';
import { type Usuario, useUsuario } from '@/hooks/useUsuario';
import { ehErroApp } from '@/lib/erroApp';

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

/** A imagem escolhida, em prévia, esperando salvar ou cancelar. */
function AssinaturaNova({
  troca,
  usuario,
  crp,
}: Readonly<{ troca: Troca; usuario: Usuario; crp: string | null }>) {
  if (troca.nova === null) return null;
  return (
    <>
      <PreviaDaAssinatura
        endereco={troca.nova.endereco}
        nome={usuario.nome}
        crp={crp}
        titulo="Nova assinatura"
        legenda="Confira como ela vai sair no arquivo do mês antes de salvar."
      />
      <div className="flex flex-wrap gap-2">
        <Button size="lg" disabled={troca.ocupado} onClick={troca.salvar}>
          {troca.salvando ? 'Salvando…' : 'Salvar assinatura'}
        </Button>
        <Button size="lg" variant="ghost" disabled={troca.ocupado} onClick={troca.cancelar}>
          Cancelar
        </Button>
      </div>
    </>
  );
}

/** A assinatura gravada, ou o convite para enviar a primeira. */
function AssinaturaAtual({
  troca,
  usuario,
  dados,
}: Readonly<{ troca: Troca; usuario: Usuario; dados: DadosDaAssinatura }>) {
  if (dados.assinatura === null) {
    return (
      <EmptyState
        icone={Signature}
        titulo="Você ainda não tem assinatura"
        descricao="Envie a imagem da sua assinatura ou do carimbo: uma foto nítida, em fundo branco, ou o arquivo em PNG, JPEG ou WebP."
        acao={
          <EscolhaDaImagem
            aoEscolher={troca.escolher}
            desabilitado={troca.ocupado}
            rotuloDoArquivo="Escolher imagem"
          />
        }
      />
    );
  }
  return (
    <>
      <PreviaDaAssinatura
        endereco={dados.assinatura.endereco}
        nome={usuario.nome}
        crp={dados.crp}
        titulo="Assinatura atual"
        legenda={`Enviada em ${dataEHora(dados.assinatura.enviadaEm)}.`}
      />
      <EscolhaDaImagem
        aoEscolher={troca.escolher}
        desabilitado={troca.ocupado}
        rotuloDoArquivo="Trocar imagem"
      />
    </>
  );
}

function ConteudoDaAssinatura({
  usuario,
  dados,
}: Readonly<{ usuario: Usuario; dados: DadosDaAssinatura }>) {
  const troca = useTrocaDaAssinatura(usuario.id);
  return (
    <>
      {dados.crp === null && <AvisoDoCrp />}
      {troca.nova === null ? (
        <AssinaturaAtual troca={troca} usuario={usuario} dados={dados} />
      ) : (
        <AssinaturaNova troca={troca} usuario={usuario} crp={dados.crp} />
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
      <div>
        <p className="mb-1.5 rotulo text-azul">Coordenação de unidade</p>
        <h1>Assinatura</h1>
        <p className="mt-2 max-w-[70ch] text-texto-2">
          Vai no fim do arquivo do mês que você envia a contas médicas, acima do seu nome e do CRP.
          Sem ela, o arquivo não pode ser enviado.
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
