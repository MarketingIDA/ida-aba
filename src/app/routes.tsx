import { lazy, type ReactNode, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { ExigePapel, InicioDoPapel, PaginaNaoEncontrada } from '@/app/TelasProvisorias';
import { LimiteDaRota } from '@/components/ErrorBoundary';
import { ExigeUsuario } from '@/features/auth';
import { LoginPage } from '@/features/auth/routes/LoginPage';

// Lazy no topo do módulo, com Suspense e limite de erro por rota. O layout também é lazy: a tela
// de login não carrega o menu. O login fica de fora: é a primeira tela de quem chega.
const AppLayout = lazy(() =>
  import('@/app/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
);
const PrimeiroAcessoPage = lazy(() =>
  import('@/features/auth/routes/PrimeiroAcessoPage').then((m) => ({
    default: m.PrimeiroAcessoPage,
  })),
);
const RecuperarSenhaPage = lazy(() =>
  import('@/features/auth/routes/RecuperarSenhaPage').then((m) => ({
    default: m.RecuperarSenhaPage,
  })),
);
const EvolucoesPage = lazy(() =>
  import('@/features/evolucoes').then((m) => ({ default: m.EvolucoesPage })),
);
const EvolucaoPage = lazy(() =>
  import('@/features/evolucoes').then((m) => ({ default: m.EvolucaoPage })),
);
const CadastrosPage = lazy(() =>
  import('@/features/cadastros').then((m) => ({ default: m.CadastrosPage })),
);
const MetasPage = lazy(() =>
  import('@/features/cadastros').then((m) => ({ default: m.MetasPage })),
);
const MetasDoAssistidoPage = lazy(() =>
  import('@/features/cadastros').then((m) => ({ default: m.MetasDoAssistidoPage })),
);
const ProgressoPage = lazy(() =>
  import('@/features/progresso').then((m) => ({ default: m.ProgressoPage })),
);
const AssinaturaPage = lazy(() =>
  import('@/features/assinatura').then((m) => ({ default: m.AssinaturaPage })),
);
const ArquivoDoMesPage = lazy(() =>
  import('@/features/arquivo-do-mes').then((m) => ({ default: m.ArquivoDoMesPage })),
);
const ArquivosPage = lazy(() =>
  import('@/features/arquivo-do-mes').then((m) => ({ default: m.ArquivosPage })),
);
const AuditoriaPage = lazy(() =>
  import('@/features/auditoria').then((m) => ({ default: m.AuditoriaPage })),
);
const OrientacoesPage = lazy(() =>
  import('@/features/orientacoes').then((m) => ({ default: m.OrientacoesPage })),
);

/** Telas sem login: entrar, criar a senha pelo link do e-mail e pedir um link novo. */
const PUBLICAS = [
  { rota: '/login', tela: <LoginPage /> },
  { rota: '/primeiro-acesso', tela: <PrimeiroAcessoPage /> },
  { rota: '/recuperar-senha', tela: <RecuperarSenhaPage /> },
];

/** Telas com login, cada uma com os papéis que a usam. */
const TELAS = [
  {
    rota: '/evolucoes',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <EvolucoesPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/evolucoes/:id',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <EvolucaoPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/metas',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <MetasPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/metas/:assistidoId',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <MetasDoAssistidoPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/progresso/:assistidoId',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <ProgressoPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/arquivo',
    tela: (
      <ExigePapel papeis={['coordenador']}>
        <ArquivoDoMesPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/assinatura',
    tela: (
      <ExigePapel papeis={['coordenador']}>
        <AssinaturaPage />
      </ExigePapel>
    ),
  },
  {
    // O endereço antigo dos assistidos do coordenador: agora é uma aba dos cadastros.
    rota: '/assistidos',
    tela: <Navigate to="/cadastros/assistidos" replace />,
  },
  { rota: '/cadastros', tela: <Navigate to="/cadastros/unidades" replace /> },
  {
    rota: '/cadastros/:aba',
    tela: (
      <ExigePapel papeis={['coordenador', 'coordenacao_geral']}>
        <CadastrosPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/arquivos',
    tela: (
      <ExigePapel papeis={['contas_medicas', 'coordenacao_geral']}>
        <ArquivosPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/orientacoes',
    tela: (
      <ExigePapel papeis={['coordenacao_geral']}>
        <OrientacoesPage />
      </ExigePapel>
    ),
  },
  {
    rota: '/auditoria',
    tela: (
      <ExigePapel papeis={['coordenacao_geral']}>
        <AuditoriaPage />
      </ExigePapel>
    ),
  },
  { rota: '*', tela: <PaginaNaoEncontrada /> },
];

const carregando = (
  <p role="status" className="p-6 text-center text-apagado">
    Carregando…
  </p>
);

/** Cada tela tem o seu limite de erro e o seu carregamento: o menu continua de pé. */
function Tela({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LimiteDaRota>
      <Suspense fallback={carregando}>{children}</Suspense>
    </LimiteDaRota>
  );
}

export function Rotas() {
  return (
    <Suspense fallback={carregando}>
      <Routes>
        {PUBLICAS.map(({ rota, tela }) => (
          <Route key={rota} path={rota} element={<Tela>{tela}</Tela>} />
        ))}
        <Route element={<ExigeUsuario />}>
          <Route element={<AppLayout />}>
            <Route index element={<InicioDoPapel />} />
            {TELAS.map(({ rota, tela }) => (
              <Route key={rota} path={rota} element={<Tela>{tela}</Tela>} />
            ))}
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
