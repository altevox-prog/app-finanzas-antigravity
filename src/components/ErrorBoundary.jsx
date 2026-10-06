import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Crash capturado por ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.replace('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#000000',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '380px',
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '28px 20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 59, 48, 0.15)',
              color: '#FF3B30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              fontSize: '28px',
              fontWeight: 'bold'
            }}>
              ⚠️
            </div>

            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
              Algo ocurrió al cargar la app
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '20px', lineHeight: 1.5 }}>
              La aplicación detectó un inconveniente temporal al procesar los datos guardados.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#007AFF',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Reintentar Cargar
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#FF3B30',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Restablecer aplicación
              </button>
            </div>

            {(this.state.error || this.state.errorInfo) && (
              <details style={{
                marginTop: '16px',
                textAlign: 'left',
                backgroundColor: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '11px',
                color: '#ff8080',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#ffaaaa', marginBottom: '6px' }}>
                  Ver detalle técnico del error
                </summary>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '10px', opacity: 0.9 }}>
                  <strong>{this.state.error?.toString()}</strong>
                  {this.state.errorInfo?.componentStack && (
                    <div style={{ marginTop: '6px', color: '#ccc' }}>
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
