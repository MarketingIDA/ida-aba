import { useEffect } from 'react';

import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

/**
 * Ações que não gravam nada no banco, mas ficam na auditoria (abrir uma ficha, baixar um PDF). O
 * banco aceita só esta lista e grava o autor pelo login. Falhar aqui não atrapalha quem usa: o
 * erro só vai para o log.
 */
export type AcaoAuditada =
  | 'abriu_evolucao'
  | 'abriu_progresso'
  | 'abriu_metas'
  | 'baixou_evolucao_word'
  | 'baixou_arquivo_word'
  | 'baixou_evolucao_pdf'
  | 'baixou_arquivo_pdf';

export function registrarAcao(
  acao: AcaoAuditada,
  registro: string,
  detalhes?: Record<string, string>,
): void {
  void supabase
    .schema('evolucao')
    .rpc('registrar_acao', { p_acao: acao, p_registro: registro, p_detalhes: detalhes ?? null })
    .then(({ error }) => {
      if (error !== null) logger.warn('auditoria: ação não registrada', error);
    });
}

/** Registra uma vez cada abertura da ficha (de novo só se o registro mudar). */
export function useRegistrarAbertura(acao: AcaoAuditada, registro: string): void {
  useEffect(() => {
    if (registro !== '' && registro !== 'NaN') registrarAcao(acao, registro);
  }, [acao, registro]);
}
