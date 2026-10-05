import React from 'react';

interface State { hasError: boolean }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return <main role="alert" className="grid min-h-screen place-items-center p-8 text-center"><section><h1 className="text-xl font-semibold">This page could not be displayed</h1><p className="mt-2">Reload the application to try again.</p><button className="btn-primary mt-4" onClick={() => window.location.reload()}>Reload</button></section></main>;
    }
    return this.props.children;
  }
}
