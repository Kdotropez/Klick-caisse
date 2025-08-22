// Service de vérification des mises à jour
export interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
  isMandatory: boolean;
  publishedAt: string;
}

export class UpdateService {
  private static readonly UPDATE_CHECK_URL = 'https://api.github.com/repos/Kdotropez/Klick-caisse/releases/latest';
  private static readonly APP_NAME = 'Klick-caisse';
  
  // Vérifier s'il y a une mise à jour disponible
  static async checkForUpdates(currentVersion: string): Promise<UpdateInfo | null> {
    try {
      console.log(`[UPDATE] Vérification des mises à jour... Version actuelle: ${currentVersion}`);
      
      const response = await fetch(this.UPDATE_CHECK_URL);
      if (!response.ok) {
        console.log(`[UPDATE] Erreur lors de la vérification: ${response.status}`);
        return null;
      }
      
      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', '');
      
      console.log(`[UPDATE] Dernière version disponible: ${latestVersion}`);
      
      // Comparer les versions
      if (this.isNewerVersion(latestVersion, currentVersion)) {
        console.log(`[UPDATE] Nouvelle version disponible: ${latestVersion}`);
        
        return {
          version: latestVersion,
          downloadUrl: release.html_url,
          releaseNotes: release.body || 'Mise à jour disponible',
          isMandatory: false, // Pour l'instant, pas de mise à jour obligatoire
          publishedAt: release.published_at
        };
      } else {
        console.log(`[UPDATE] Application à jour (${currentVersion})`);
        return null;
      }
    } catch (error) {
      console.error(`[UPDATE] Erreur lors de la vérification:`, error);
      return null;
    }
  }
  
  // Comparer deux versions (format: "3.22", "3.23", etc.)
  private static isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const newParts = newVersion.split('.').map(Number);
    const currentParts = currentVersion.split('.').map(Number);
    
    // Normaliser les tableaux à la même longueur
    const maxLength = Math.max(newParts.length, currentParts.length);
    while (newParts.length < maxLength) newParts.push(0);
    while (currentParts.length < maxLength) currentParts.push(0);
    
    // Comparer chaque partie
    for (let i = 0; i < maxLength; i++) {
      if (newParts[i] > currentParts[i]) return true;
      if (newParts[i] < currentParts[i]) return false;
    }
    
    return false; // Versions identiques
  }
  
  // Rafraîchir automatiquement l'application
  static refreshApplication(): void {
    console.log(`[UPDATE] Rafraîchissement de l'application...`);
    
    // Afficher un message à l'utilisateur
    if (window.confirm('Une nouvelle version est disponible. Voulez-vous rafraîchir l\'application maintenant ?')) {
      // Rafraîchir la page
      window.location.reload();
    }
  }
  
  // Vérifier les mises à jour en arrière-plan
  static startBackgroundUpdateCheck(currentVersion: string, checkIntervalMinutes: number = 60): void {
    console.log(`[UPDATE] Démarrage de la vérification automatique (toutes les ${checkIntervalMinutes} minutes)`);
    
    // Vérification immédiate
    this.checkForUpdates(currentVersion).then(updateInfo => {
      if (updateInfo) {
        this.showUpdateNotification(updateInfo);
      }
    });
    
    // Vérification périodique
    setInterval(() => {
      this.checkForUpdates(currentVersion).then(updateInfo => {
        if (updateInfo) {
          this.showUpdateNotification(updateInfo);
        }
      });
    }, checkIntervalMinutes * 60 * 1000);
  }
  
  // Afficher une notification de mise à jour
  private static showUpdateNotification(updateInfo: UpdateInfo): void {
    const message = `Nouvelle version disponible : ${updateInfo.version}\n\n${updateInfo.releaseNotes}`;
    
    // Créer une notification native si disponible
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Klick Caisse - Mise à jour', {
        body: `Version ${updateInfo.version} disponible`,
        icon: '/favicon.ico'
      });
    }
    
    // Afficher une alerte
    if (window.confirm(`${message}\n\nVoulez-vous rafraîchir l'application maintenant ?`)) {
      this.refreshApplication();
    }
  }
}
