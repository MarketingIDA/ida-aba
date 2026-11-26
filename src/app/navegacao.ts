import {
  FileText,
  FolderOpen,
  History,
  Inbox,
  type LucideIcon,
  PenLine,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

import type { Papel } from '@/hooks/useUsuario';

export interface ItemDoMenu {
  rota: string;
  rotulo: string;
  icone: LucideIcon;
  /** Título de seção que vem antes do item no menu ("Cadastros"). */
  secao?: string;
  /** O número ao lado: assistidos do mês ou arquivos enviados. */
  contador?: 'assistidos' | 'arquivos';
  /** Abaixo do item, um subitem por situação da evolução, cada um com o seu número. */
  situacoes?: boolean;
  /** Outras telas que ficam dentro deste item (o gráfico das metas fica em Evoluções). */
  inclui?: readonly string[];
}

const EVOLUCOES: ItemDoMenu = {
  rota: '/evolucoes',
  rotulo: 'Evoluções',
  icone: FileText,
  contador: 'assistidos',
  situacoes: true,
  inclui: ['/progresso'],
};
const ARQUIVO: ItemDoMenu = { rota: '/arquivo', rotulo: 'Arquivo do mês', icone: FolderOpen };
// A mesma tela, com o nome de cada lado: contas médicas recebe, a coordenação geral acompanha.
const RECEBIDOS: ItemDoMenu = {
  rota: '/arquivos',
  rotulo: 'Arquivos recebidos',
  icone: Inbox,
  contador: 'arquivos',
};
const ENVIADOS: ItemDoMenu = { ...RECEBIDOS, rotulo: 'Arquivos enviados' };
const METAS: ItemDoMenu = {
  rota: '/metas',
  rotulo: 'Metas dos assistidos',
  icone: Target,
  secao: 'Cadastros',
};
const ASSINATURA: ItemDoMenu = { rota: '/assinatura', rotulo: 'Minha assinatura', icone: PenLine };
// Todos os cadastros, em abas: o coordenador e a coordenação geral cadastram e alteram.
const PESSOAS: ItemDoMenu = { rota: '/cadastros', rotulo: 'Unidades e pessoas', icone: Users };
// A curadoria das dicas dos coordenadores e as orientações que a IA lê (E22).
const ORIENTACOES: ItemDoMenu = {
  rota: '/orientacoes',
  rotulo: 'Orientações da IA',
  icone: Sparkles,
};

// A trilha de quem fez o quê e quando. Só a coordenação geral vê.
const AUDITORIA: ItemDoMenu = { rota: '/auditoria', rotulo: 'Auditoria', icone: History };

/**
 * O menu de cada papel mostra só as telas que já existem, na ordem do protótipo. Esconder um item
 * é só UX: quem decide o que cada papel lê é o RLS do banco.
 */
export const MENU_DO_PAPEL: Record<Papel, readonly ItemDoMenu[]> = {
  coordenador: [EVOLUCOES, ARQUIVO, METAS, PESSOAS, ASSINATURA],
  coordenacao_geral: [EVOLUCOES, ENVIADOS, METAS, PESSOAS, ORIENTACOES, AUDITORIA],
  contas_medicas: [RECEBIDOS],
};

/** Primeira tela de cada papel, para onde vai quem abre a raiz do sistema. */
export function rotaInicial(papel: Papel): string {
  return MENU_DO_PAPEL[papel][0]?.rota ?? '/evolucoes';
}
