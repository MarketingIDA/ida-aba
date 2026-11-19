import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Link2, Send, Share2, TriangleAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { RegistroDoRelatorio } from '@/features/progresso/components/RegistroDoRelatorio';
import { montarArquivo } from '@/features/progresso/pdf/baixarRelatorio';
import { copiarLink, enviarRelatorio } from '@/features/progresso/pdf/compartilharRelatorio';
import { progressoKeys } from '@/features/progresso/queries';
import {
  type PropsDoRelatorio,
  useDadosDoRelatorio,
} from '@/features/progresso/useDadosDoRelatorio';
import { ehErroApp } from '@/lib/erroApp';

type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null;

const ENVIO = {
  enviou: 'PDF enviado. O envio ficou registrado.',
  baixou_para_enviar:
    'Este navegador não envia arquivo direto: o PDF foi baixado para você anexar no WhatsApp ou no e-mail.',
  cancelou: null,
} as const;

const mensagem = (erro: unknown) =>
  ehErroApp(erro) ? erro.message : 'Não foi possível concluir agora. Tente de novo.';

function Saida({
  Icone,
  titulo,
  detalhe,
  ...botao
}: Readonly<{
  Icone: typeof Send;
  titulo: string;
  detalhe: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-md border border-borda bg-superficie px-3 py-2.5 text-left foco-anel enabled:hover:border-azul disabled:opacity-60"
      {...botao}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-info-soft text-azul-escuro">
        <Icone aria-hidden="true" className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-sm text-marinho">{titulo}</b>
        <small className="text-caption font-semibold text-apagado">{detalhe}</small>
      </span>
      <ChevronRight aria-hidden="true" className="size-4 text-apagado" />
    </button>
  );
}

/**
 * O PDF começa a ser montado quando a janela abre, para o envio sair no mesmo toque; o envio e o
 * link põem a linha no registro, que se atualiza.
 */
function useSaidas(props: Readonly<PropsDoRelatorio>) {
  const { assistidoId } = props;
  const { codigo, dados } = useDadosDoRelatorio(props);
  const cliente = useQueryClient();
  const [aviso, setAviso] = useState<Aviso>(null);
  const pdf = useQuery(
    queryOptions({
      // Fora da chave do registro: registrar não monta o PDF de novo.
      queryKey: ['relatorio-pdf', assistidoId],
      queryFn: () => montarArquivo(dados()),
      gcTime: 0,
      staleTime: Infinity,
      retry: false,
    }),
  );
  const depois = (novo: Aviso) => {
    if (novo !== null) setAviso(novo);
    void cliente.invalidateQueries({ queryKey: progressoKeys.registro(assistidoId) });
  };
  const falhar = (erro: unknown) => {
    depois({ tipo: 'erro', texto: mensagem(erro) });
  };
  return {
    pdf,
    aviso,
    enviar: () => {
      if (pdf.data === undefined) return;
      setAviso(null);
      // Sem nada esperado antes: o navegador só envia no mesmo toque.
      enviarRelatorio(assistidoId, pdf.data, codigo).then((r) => {
        const texto = ENVIO[r];
        depois(texto === null ? null : { tipo: 'ok', texto });
      }, falhar);
    },
    copiar: () => {
      setAviso(null);
      copiarLink(assistidoId).then(() => {
        depois({
          tipo: 'ok',
          texto: 'Link copiado. Ele abre só para quem tem acesso a este assistido.',
        });
      }, falhar);
    },
  };
}

function Saidas(props: Readonly<PropsDoRelatorio>) {
  const { pdf, aviso, enviar, copiar } = useSaidas(props);
  let detalheDoEnvio = 'WhatsApp, e-mail ou outro aplicativo do aparelho.';
  if (pdf.isPending) detalheDoEnvio = 'Preparando o PDF…';
  if (pdf.isError) detalheDoEnvio = 'Não foi possível montar o PDF. Feche e abra de novo.';
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="flex items-start gap-2 rounded-xl border border-alerta-border bg-alerta-soft px-4 py-3 text-sm font-semibold text-alerta-text">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />O relatório tem o
        nome e dados de saúde de uma criança. Envie só para quem acompanha o caso: cada envio fica
        registrado.
      </p>
      <div className="flex flex-col gap-2">
        <Saida
          Icone={Send}
          titulo="Enviar o PDF"
          detalhe={detalheDoEnvio}
          disabled={pdf.data === undefined}
          onClick={enviar}
        />
        <Saida
          Icone={Link2}
          titulo="Copiar o link"
          detalhe="Abre esta tela só para quem já tem acesso: o coordenador da carteira e a coordenação geral."
          onClick={copiar}
        />
      </div>
      {aviso?.tipo === 'ok' && (
        <p role="status" className="text-sm font-bold text-ok-text">
          {aviso.texto}
        </p>
      )}
      {aviso?.tipo === 'erro' && (
        <p role="alert" className="text-sm font-bold text-bloq-text">
          {aviso.texto}
        </p>
      )}
      <RegistroDoRelatorio assistidoId={props.assistidoId} />
    </div>
  );
}

/** O ícone de compartilhar, ao lado do "Baixar PDF", e a janela com o envio, o link e o registro. */
export function CompartilharRelatorio(props: Readonly<PropsDoRelatorio>) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label="Compartilhar"
        title="Compartilhar"
        onClick={() => {
          setAberta(true);
        }}
      >
        <Share2 aria-hidden="true" />
      </Button>
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent
          side="right"
          className="gap-0 bg-background p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]"
        >
          <SheetHeader className="gap-1 border-b border-borda bg-superficie py-5 pr-12 pl-5">
            <SheetTitle className="font-display text-xl font-bold text-marinho">
              Compartilhar a evolução das metas
            </SheetTitle>
            <SheetDescription className="text-sm font-semibold text-texto-2">
              {props.nome}
            </SheetDescription>
          </SheetHeader>
          {aberta && <Saidas {...props} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
