import { Component, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { FalhaAoCarregar } from '@/components/FalhaAoCarregar';
import { logger } from '@/lib/logger';

interface Props {
  children: ReactNode;
}

interface Estado {
  erro: Error | null;
}

/** Card de erro da rota: diz o que houve e oferece "Tentar de novo". */
function ErrorCard({ aoTentarDeNovo }: Readonly<{ aoTentarDeNovo: () => void }>) {
  return (
    <FalhaAoCarregar
      titulo="Esta tela não abriu"
      mensagem="Houve um erro ao montar a tela. O resto do sistema continua funcionando."
      aoTentarDeNovo={aoTentarDeNovo}
    />
  );
}

class LimiteDeErro extends Component<Props, Estado> {
  override state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  override componentDidCatch(erro: Error): void {
    // O logger reduz o erro a nome e código: a mensagem pode carregar dado pessoal.
    logger.error('erro ao renderizar a rota', erro);
  }

  private readonly tentarDeNovo = (): void => {
    this.setState({ erro: null });
  };

  override render(): ReactNode {
    if (this.state.erro !== null) return <ErrorCard aoTentarDeNovo={this.tentarDeNovo} />;
    return <>{this.props.children}</>;
  }
}

/**
 * ErrorBoundary por rota: o erro de uma tela não derruba o
 * menu, e trocar de rota limpa o erro (a chave é o caminho).
 */
export function LimiteDaRota({ children }: Readonly<Props>) {
  const { pathname } = useLocation();
  return <LimiteDeErro key={pathname}>{children}</LimiteDeErro>;
}
