import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Global error boundary: without it a render crash leaves a blank page.
 * Data is safe regardless — every mutation is already persisted before render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error no capturado en la UI:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground">
        <div className="text-4xl">😵</div>
        <h1 className="text-lg font-semibold">Algo salió mal</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado en la interfaz. Tus datos están a salvo: cada cambio se
          guarda en tu carpeta local antes de mostrarse en pantalla.
        </p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          onClick={() => window.location.reload()}
        >
          Recargar la aplicación
        </button>
        <details className="max-w-md text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer">Detalle técnico</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-2">
            {this.state.error.message}
          </pre>
        </details>
      </div>
    );
  }
}
