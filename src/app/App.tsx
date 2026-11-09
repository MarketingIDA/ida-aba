import { AppProviders } from '@/app/providers/AppProviders';
import { Rotas } from '@/app/routes';

export function App() {
  return (
    <AppProviders>
      <Rotas />
    </AppProviders>
  );
}
