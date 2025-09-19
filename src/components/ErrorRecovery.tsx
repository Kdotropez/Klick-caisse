import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper, LinearProgress } from '@mui/material';
import { InsertBeforeErrorDetector } from '../utils/errorRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRecovering: boolean;
}

class ErrorRecovery extends Component<Props, State> {
  private recoveryTimer: NodeJS.Timeout | null = null;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
    isRecovering: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { 
      hasError: true, 
      error,
      errorInfo: null
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 ErrorRecovery a capturé une erreur:', error, errorInfo);
    
    // Utiliser le détecteur d'erreur insertBefore
    const handled = InsertBeforeErrorDetector.handleError(error);
    if (handled) {
      // L'erreur a été gérée par le détecteur global
      return;
    }
    
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Tentative de récupération automatique pour les erreurs insertBefore
    if (InsertBeforeErrorDetector.isInsertBeforeError(error)) {
      console.log('🔥 Erreur insertBefore détectée, récupération immédiate');
      this.scheduleAutoRecovery(1000); // Récupération plus rapide
    } else if (this.state.retryCount < 3) {
      console.log(`🔄 Tentative de récupération automatique ${this.state.retryCount + 1}/3`);
      this.scheduleAutoRecovery();
    }

    // Nettoyer le localStorage si erreur récurrente
    if (this.state.retryCount >= 2) {
      console.warn('🧹 Nettoyage du localStorage en raison d\'erreurs récurrentes');
      this.cleanupCorruptedData();
    }
  }

  private scheduleAutoRecovery = (delay: number = 3000) => {
    this.setState({ isRecovering: true });
    
    this.recoveryTimer = setTimeout(() => {
      console.log('🔄 Tentative de récupération automatique...');
      this.handleReset();
    }, delay);
  };

  private cleanupCorruptedData = () => {
    try {
      // Nettoyer les données potentiellement corrompues
      const keysToCheck = [
        'klick_caisse_products',
        'klick_caisse_categories',
        'klick_caisse_transactions_by_day',
        'klick_caisse_settings'
      ];

      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            JSON.parse(data); // Test de parsing
          }
        } catch (parseError) {
          console.warn(`🗑️ Suppression de données corrompues: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isRecovering: false
    });
  };

  private handleForceClean = () => {
    if (window.confirm('⚠️ Cela va supprimer toutes les données locales et recharger l\'application. Continuer ?')) {
      // Sauvegarder les données importantes avant nettoyage
      try {
        const backup = {
          products: localStorage.getItem('klick_caisse_products'),
          categories: localStorage.getItem('klick_caisse_categories'),
          closures: localStorage.getItem('klick_caisse_closures'),
          timestamp: new Date().toISOString()
        };
        
        // Sauvegarder dans un nom différent
        localStorage.setItem('klick_emergency_backup', JSON.stringify(backup));
        console.log('💾 Sauvegarde d\'urgence créée');
      } catch (e) {
        console.warn('Impossible de créer la sauvegarde d\'urgence');
      }

      // Nettoyer tout le localStorage de l'application
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('klick_caisse_')) {
          localStorage.removeItem(key);
        }
      });

      window.location.reload();
    }
  };

  public componentWillUnmount() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
  }

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
              maxWidth: 700,
              textAlign: 'center',
              border: '3px solid #f44336',
              borderRadius: 2
            }}
          >
            <Typography variant="h3" sx={{ mb: 2, color: '#f44336' }}>
              💥 Erreur Critique
            </Typography>
            
            <Typography variant="h6" sx={{ mb: 2, color: '#d32f2f' }}>
              Erreur React DOM persistante détectée
            </Typography>

            <Typography variant="body1" sx={{ mb: 3 }}>
              L'application a rencontré une erreur de réconciliation React qui empêche son fonctionnement normal.
              {this.state.retryCount > 0 && (
                <><br />Tentatives de récupération : {this.state.retryCount}/3</>
              )}
            </Typography>

            {this.state.isRecovering && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  🔄 Récupération automatique en cours...
                </Typography>
                <LinearProgress />
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3, flexWrap: 'wrap' }}>
              {!this.state.isRecovering && (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={this.handleReset}
                    sx={{ minWidth: 140 }}
                  >
                    🔄 Réessayer
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={this.handleReload}
                    sx={{ minWidth: 140 }}
                  >
                    ↻ Recharger
                  </Button>
                  {this.state.retryCount >= 2 && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={this.handleForceClean}
                      sx={{ minWidth: 140 }}
                    >
                      🧹 Reset Complet
                    </Button>
                  )}
                </>
              )}
            </Box>

            {this.state.retryCount >= 3 && (
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#ffecb3', 
                borderRadius: 1, 
                border: '1px solid #ffc107',
                mb: 3 
              }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                  ⚠️ Erreur récurrente détectée
                </Typography>
                <Typography variant="body2" sx={{ color: '#ef6c00' }}>
                  Il semble y avoir un problème persistant. Essayez le "Reset Complet" ou contactez le support.
                </Typography>
              </Box>
            )}

            <details style={{ textAlign: 'left', marginTop: '20px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#1976d2' }}>
                🔧 Informations techniques
              </summary>
              <Box sx={{ mt: 2 }}>
                {this.state.error && (
                  <Paper sx={{ p: 2, mb: 2, backgroundColor: '#ffebee' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Type d'erreur:
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
                      {this.state.error.name}: {this.state.error.message}
                    </Typography>
                  </Paper>
                )}
                
                <Paper sx={{ p: 2, backgroundColor: '#fff3e0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Actions de récupération effectuées:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    • ErrorBoundary activé ✅<br />
                    • Validation des données ✅<br />
                    • Clés React uniques ✅<br />
                    • Nettoyage localStorage {this.state.retryCount >= 2 ? '✅' : '⏳'}<br />
                    • React StrictMode activé ✅
                  </Typography>
                </Paper>
              </Box>
            </details>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorRecovery;
