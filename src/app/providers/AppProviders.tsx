import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router';

import { AuthProvider } from '@/features/auth';
import { queryClient } from '@/lib/queryClient';

/** Ordem fixa: QueryClient → Router → Auth (o AuthProvider navega no logout). */
export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
