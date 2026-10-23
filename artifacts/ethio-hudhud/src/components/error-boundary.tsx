import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  // This fallback also renders outside AppProvider, so it must not require
  // translation, routing, authentication, or query contexts to recover.
  let english = document.documentElement.lang === 'en';
  try { english = localStorage.getItem('hh-lang') === 'en'; } catch { /* Use document language. */ }
  const t = (ar: string, en: string) => english ? en : ar;
  return (
    <div dir={english ? 'ltr' : 'rtl'} lang={english ? 'en' : 'ar'} className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-6 text-foreground">
      <div role="alert" className="max-w-lg w-full rounded-3xl border border-border bg-card p-6 text-center sm:p-10">
        <p className="mb-3 font-bold text-primary">HUDHUD</p>
        <h1 className="font-display text-2xl font-bold">
          {t('تعذّر عرض هذه الصفحة', 'This page could not be displayed')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t('حاول مرة أخرى. إذا استمرت المشكلة، عُد إلى الصفحة الرئيسية.', 'Try again. If the problem continues, return to the home page.')}
        </p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={resetError}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          {t('إعادة المحاولة', 'Try again')}
        </button>
        <a href={import.meta.env.BASE_URL} className="mt-3 flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-primary underline underline-offset-4">
          {t('العودة إلى الرئيسية', 'Back to home')}
        </a>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}
