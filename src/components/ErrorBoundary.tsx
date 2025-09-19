import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { 
      hasError: true, 
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary a capturé une erreur:', error, errorInfo);
    
    // Vérifier si c'est une erreur insertBefore et forcer la récupération
    if (error.message.includes('insertBefore') || error.name === 'NotFoundError') {
      console.log('🚨 ErrorBoundary: Erreur insertBefore détectée, déclenchement immédiat de la récupération');
      
      // Déclencher immédiatement le redémarrage après 2 secondes
      setTimeout(() => {
        console.log('🔄 Redémarrage forcé par ErrorBoundary');
        window.location.reload();
      }, 2000);
      
      // Afficher un message à l'utilisateur
      document.body.style.backgroundColor = '#ffebee';
      const alertDiv = document.createElement('div');
      alertDiv.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          left: 50%; 
          transform: translateX(-50%); 
          background: #f44336; 
          color: white; 
          padding: 15px 25px; 
          border-radius: 8px; 
          font-family: Arial, sans-serif;
          font-size: 16px;
          font-weight: bold;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        ">
          🔄 Erreur détectée - Redémarrage automatique en cours...
        </div>
      `;
      document.body.appendChild(alertDiv);
    }
    
    this.setState({
      error,
      errorInfo
    });

    // Log l'erreur pour diagnostic
    console.error('Stack trace:', error.stack);
    console.error('Component stack:', errorInfo.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            backgroundColor: '#f5f5f5'
          }}
        >
          <Paper
            sx={{
              p: 4,
              maxWidth: 600,
              textAlign: 'center',
              border: '2px solid #f44336'
            }}
          >
            <Typography variant="h4" sx={{ mb: 2, color: '#f44336' }}>
              ⚠️ Erreur de l'application
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 3 }}>
              Une erreur inattendue s'est produite. L'application ne peut pas continuer.
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={this.handleReload}
                sx={{ minWidth: 120 }}
              >
                🔄 Recharger
              </Button>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                sx={{ minWidth: 120 }}
              >
                🔄 Réessayer
              </Button>
            </Box>

            <details style={{ textAlign: 'left', marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                🔧 Détails techniques
              </summary>
              <Box sx={{ mt: 2 }}>
                {this.state.error && (
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Erreur:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {this.state.error.toString()}
                    </Typography>
                  </Paper>
                )}
                
                {this.state.errorInfo && (
                  <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Stack des composants:
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.7rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 200,
                        overflow: 'auto'
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  </Paper>
                )}
              </Box>
            </details>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
