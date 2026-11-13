import { ClipboardList, FileText, Inbox, type LucideIcon, Signature } from 'lucide-react';

import type { Papel } from '@/hooks/useUsuario';

export interface ItemDoMenu {
  rota: string;
  rotulo: string;
  icone: LucideIcon;
}

const EVOLUCOES: ItemDoMenu = { rota: '/evolucoes', rotulo: 'Evoluções', icone: FileText };
const ARQUIVOS: ItemDoMenu = { rota: '/arquivos', rotulo: 'Arquivos recebidos', icone: Inbox };
const CADASTROS: ItemDoMenu = { rota: '/cadastros', rotulo: 'Cadastros', icone: ClipboardList };
const ASSINATURA: ItemDoMenu = { rota: '/assinatura', rotulo: 'Assinatura', icone: Signature };

/**
 * O menu de cada papel mostra só as telas que já existem. Esconder um item é só UX: quem decide o
 * que cada papel lê é o RLS do banco.
 */
export const MENU_DO_PAPEL: Record<Papel, readonly ItemDoMenu[]> = {
  coordenador: [EVOLUCOES, ASSINATURA],
  coordenacao_geral: [EVOLUCOES, CADASTROS],
  contas_medicas: [ARQUIVOS],
};

/** Primeira tela de cada papel, para onde vai quem abre a raiz do sistema. */
export function rotaInicial(papel: Papel): string {
  return MENU_DO_PAPEL[papel][0]?.rota ?? '/evolucoes';
}
