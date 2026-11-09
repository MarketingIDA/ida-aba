import type { RequestHandler } from 'msw';

import { handlersDeAuth } from '@/testing/handlers/auth';
import { handlersDeRest } from '@/testing/handlers/rest';

/**
 * Handlers padrão do MSW, um arquivo por serviço do Supabase (auth e rest; functions e storage
 * chegam com as features que os usam). Cada teste acrescenta os seus com `server.use`.
 */
export const handlers: RequestHandler[] = [...handlersDeAuth, ...handlersDeRest];
