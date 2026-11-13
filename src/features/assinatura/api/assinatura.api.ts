import { z } from 'zod';

import { erroDoBanco } from '@/lib/erroDoBanco';
import { ErroApp } from '@/lib/erroApp';
import { supabase } from '@/lib/supabase';

/**
 * A assinatura do coordenador (E14): a imagem fica no bucket privado `assinaturas`, na pasta com
 * o id dele, e `acesso.assinaturas` guarda o caminho. Nada se sobrescreve: trocar é enviar outra
 * imagem, e a atual é a última gravada. Quem pode o quê é do banco (RLS no Storage e na tabela).
 */
const BUCKET = 'assinaturas';

export const TIPOS_DE_IMAGEM = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type TipoDeImagem = (typeof TIPOS_DE_IMAGEM)[number];

/** O mesmo limite do bucket. */
export const LIMITE_DA_IMAGEM = 2 * 1024 * 1024;

const EXTENSAO: Record<TipoDeImagem, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface Assinatura {
  enviadaEm: string;
  /** A imagem como `data:` URL, que a CSP aceita e não precisa ser liberada depois. */
  endereco: string;
}

/** A imagem como `data:` URL, para mostrar na tela. */
export function enderecoDaImagem(imagem: Blob): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    const falhou = () => {
      rejeitar(new ErroApp('indisponivel', 'Não foi possível mostrar a imagem.', leitor.error));
    };
    leitor.onload = () => {
      if (typeof leitor.result === 'string') resolver(leitor.result);
      else falhou();
    };
    leitor.onerror = falhou;
    leitor.readAsDataURL(imagem);
  });
}

export interface DadosDaAssinatura {
  assinatura: Assinatura | null;
  crp: string | null;
}

const MENSAGENS = {
  indisponivel: 'Não foi possível carregar a assinatura agora. Tente de novo em instantes.',
  sem_permissao: 'Só quem coordena unidade cadastra a própria assinatura.',
  regras: {
    assinatura_sem_imagem: 'A imagem não chegou ao servidor. Envie de novo.',
    assinatura_fora_da_pasta: 'A imagem não ficou na sua pasta. Envie de novo.',
  },
} as const;

const esquemaLinha = z.object({ caminho: z.string(), criado_em: z.string() });
const esquemaCrp = z.object({ crp: z.string().nullable() });

/** A assinatura atual (a última gravada), com a imagem, e o CRP que vai abaixo dela. */
export async function buscarAssinatura(usuarioId: number): Promise<DadosDaAssinatura> {
  const [linha, usuario] = await Promise.all([
    supabase
      .schema('acesso')
      .from('assinaturas')
      .select('caminho, criado_em')
      .eq('usuario_id', usuarioId)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle<unknown>(),
    supabase
      .schema('acesso')
      .from('usuarios')
      .select('crp')
      .eq('id', usuarioId)
      .maybeSingle<unknown>(),
  ]);
  if (linha.error !== null) throw erroDoBanco(linha.error, MENSAGENS);
  if (usuario.error !== null) throw erroDoBanco(usuario.error, MENSAGENS);
  const crp = usuario.data === null ? null : esquemaCrp.parse(usuario.data).crp;
  if (linha.data === null) return { assinatura: null, crp };

  const { caminho, criado_em } = esquemaLinha.parse(linha.data);
  const download = await supabase.storage.from(BUCKET).download(caminho);
  if (download.error !== null) {
    throw new ErroApp('indisponivel', MENSAGENS.indisponivel, download.error);
  }
  return {
    assinatura: { enviadaEm: criado_em, endereco: await enderecoDaImagem(download.data) },
    crp,
  };
}

/** Mensagem do Storage em português: tamanho e formato têm a sua; o resto é falha de rede. */
function erroDoStorage(erro: {
  message: string;
  statusCode?: string | undefined;
  status?: number | undefined;
}): ErroApp {
  const status = String(erro.statusCode ?? erro.status ?? '');
  if (status === '413' || /size|large/i.test(erro.message)) {
    return new ErroApp('regra_violada', 'A imagem passa de 2 MB. Use uma imagem menor.', erro);
  }
  if (status === '415' || /mime/i.test(erro.message)) {
    return new ErroApp('regra_violada', 'Use uma imagem PNG, JPEG ou WebP.', erro);
  }
  if (status === '403' || /row-level security|unauthorized/i.test(erro.message)) {
    return new ErroApp('sem_permissao', MENSAGENS.sem_permissao, erro);
  }
  return new ErroApp(
    'indisponivel',
    'Não foi possível enviar a imagem agora. Tente de novo em instantes.',
    erro,
  );
}

/** Envia a imagem à pasta do coordenador e grava a assinatura nova. */
export async function enviarAssinatura(
  usuarioId: number,
  imagem: Blob,
  tipo: TipoDeImagem,
): Promise<void> {
  const caminho = `${String(usuarioId)}/${crypto.randomUUID()}.${EXTENSAO[tipo]}`;
  const envio = await supabase.storage
    .from(BUCKET)
    .upload(caminho, imagem, { contentType: tipo, upsert: false });
  if (envio.error !== null) throw erroDoStorage(envio.error);

  const { error } = await supabase.schema('acesso').from('assinaturas').insert({ caminho });
  if (error !== null) throw erroDoBanco(error, MENSAGENS);
}
