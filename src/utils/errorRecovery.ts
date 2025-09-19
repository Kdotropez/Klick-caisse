// Utilitaires pour la récupération d'erreurs React DOM

export class InsertBeforeErrorDetector {
  private static errorCount = 0;
  private static lastErrorTime = 0;
  private static readonly MAX_ERRORS = 3;
  private static readonly ERROR_WINDOW = 30000; // 30 secondes

  static isInsertBeforeError(error: Error): boolean {
    return error.message.includes('insertBefore') || 
           error.message.includes('insertBefore on Node') ||
           error.name === 'NotFoundError';
  }

  static handleError(error: Error): boolean {
    const now = Date.now();
    
    // Reset du compteur si plus de 30 secondes depuis la dernière erreur
    if (now - this.lastErrorTime > this.ERROR_WINDOW) {
      this.errorCount = 0;
    }

    if (this.isInsertBeforeError(error)) {
      this.errorCount++;
      this.lastErrorTime = now;

      console.error(`🔥 Erreur insertBefore détectée (#${this.errorCount}):`, error);

      if (this.errorCount >= this.MAX_ERRORS) {
        console.warn('💥 Trop d\'erreurs insertBefore, redémarrage forcé');
        this.forceRestart();
        return true;
      }

      // Tentative de nettoyage automatique
      if (this.errorCount === 2) {
        console.log('🧹 Nettoyage préventif du localStorage');
        this.cleanupLocalStorage();
      }
    }

    return false;
  }

  private static forceRestart(): void {
    // Sauvegarder l'état critique
    try {
      const emergencyBackup = {
        timestamp: new Date().toISOString(),
        products: localStorage.getItem('klick_caisse_products'),
        categories: localStorage.getItem('klick_caisse_categories'),
        closures: localStorage.getItem('klick_caisse_closures'),
        reason: 'insertBefore_error_recovery'
      };
      localStorage.setItem('klick_emergency_recovery', JSON.stringify(emergencyBackup));
    } catch (e) {
      console.warn('Impossible de créer la sauvegarde d\'urgence');
    }

    // Redémarrer après un court délai
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }

  private static cleanupLocalStorage(): void {
    const keysToCheck = [
      'klick_caisse_transactions_by_day',
      'klick_caisse_settings',
      'klick_caisse_auto_backups'
    ];

    keysToCheck.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          JSON.parse(data); // Test de parsing
        }
      } catch (error) {
        console.warn(`🗑️ Suppression de données corrompues: ${key}`);
        localStorage.removeItem(key);
      }
    });
  }

  static reset(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }
}

// Intercepteur global d'erreurs
export function setupGlobalErrorHandler(): void {
  // Intercepter les erreurs non capturées
  window.addEventListener('error', (event) => {
    console.log('🔍 Erreur globale détectée:', event.error);
    if (event.error && InsertBeforeErrorDetector.isInsertBeforeError(event.error)) {
      console.error('🔥 Erreur insertBefore non capturée:', event.error);
      event.preventDefault();
      InsertBeforeErrorDetector.handleError(event.error);
    }
  });

  // Intercepter les promesses rejetées
  window.addEventListener('unhandledrejection', (event) => {
    console.log('🔍 Promise rejetée détectée:', event.reason);
    if (event.reason instanceof Error && InsertBeforeErrorDetector.isInsertBeforeError(event.reason)) {
      console.error('🔥 Promise rejetée avec erreur insertBefore:', event.reason);
      event.preventDefault();
      InsertBeforeErrorDetector.handleError(event.reason);
    }
  });

  // Intercepter spécifiquement les erreurs React DOM
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args.join(' ');
    if (errorMessage.includes('insertBefore') || errorMessage.includes('NotFoundError')) {
      console.log('🔥 Erreur insertBefore détectée dans console.error');
      // Créer un objet Error pour le gestionnaire
      const syntheticError = new Error(errorMessage);
      syntheticError.name = 'NotFoundError';
      InsertBeforeErrorDetector.handleError(syntheticError);
    }
    originalConsoleError.apply(console, args);
  };

  console.log('🛡️ Gestionnaire global d\'erreurs insertBefore activé');
}

// Fonction pour vérifier et restaurer une sauvegarde d'urgence
export function checkEmergencyRecovery(): void {
  try {
    const recovery = localStorage.getItem('klick_emergency_recovery');
    if (recovery) {
      const data = JSON.parse(recovery);
      const timeDiff = Date.now() - new Date(data.timestamp).getTime();
      
      // Si la sauvegarde a moins de 5 minutes
      if (timeDiff < 300000) {
        console.log('🔄 Sauvegarde d\'urgence détectée, restauration...');
        
        if (data.products) {
          localStorage.setItem('klick_caisse_products', data.products);
        }
        if (data.categories) {
          localStorage.setItem('klick_caisse_categories', data.categories);
        }
        if (data.closures) {
          localStorage.setItem('klick_caisse_closures', data.closures);
        }
        
        console.log('✅ Données restaurées depuis la sauvegarde d\'urgence');
      }
      
      // Nettoyer la sauvegarde d'urgence
      localStorage.removeItem('klick_emergency_recovery');
    }
  } catch (error) {
    console.warn('Erreur lors de la vérification de récupération d\'urgence:', error);
  }
}
