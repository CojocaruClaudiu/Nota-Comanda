import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can log error info here if needed
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <img src={"/LogoTopaz-1x1.png"} alt="Logo" style={{ width: 120, marginBottom: 24 }} />
          <h2>Ceva nu a mers bine!</h2>
          <p>Încercați să reîncărcați pagina sau contactați administratorul.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
