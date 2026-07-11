import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Catches render-phase errors so a failure shows on screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UTDD render error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <pre
          style={{
            color: '#ff8080',
            whiteSpace: 'pre-wrap',
            padding: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {`UTDD render error:\n${this.state.error.message}\n\n${this.state.error.stack ?? ''}`}
        </pre>
      );
    }
    return this.props.children;
  }
}
