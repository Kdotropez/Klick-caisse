// Système de licence Klick Caisse
// Code d'autorisation qui change chaque jour

export interface LicenseInfo {
  isValid: boolean;
  code: string;
  date: string;
  message: string;
}

// Fonction pour générer le code du jour
export function generateDailyCode(): string {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Algorithme de génération du code
  // Format: JJMM (jour-mois) - 4 chiffres seulement
  return `${day.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
}

  // Fonction pour valider un code
  export function validateLicenseCode(inputCode: string): LicenseInfo {
    const today = new Date();
    const expectedCode = generateDailyCode();
    
    // Vérifier si le code correspond
    if (inputCode === expectedCode) {
      return {
        isValid: true,
        code: expectedCode,
        date: today.toLocaleDateString('fr-FR'),
        message: 'Code valide - Accès autorisé'
      };
    }
    
      // Code incorrect - ne jamais révéler le code attendu
  return {
    isValid: false,
    code: '', // Ne pas révéler le code attendu
    date: '', // Ne pas révéler la date non plus
    message: 'Code incorrect - Accès refusé'
  };
  }

// Fonction pour obtenir le code du jour (pour affichage)
export function getTodayCode(): string {
  return generateDailyCode();
}

// Fonction pour vérifier si un code est expiré (code du jour précédent)
export function isCodeExpired(inputCode: string): boolean {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const month = yesterday.getMonth() + 1;
  const day = yesterday.getDate();
  
  const yesterdayCode = `${day.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
  
  return inputCode === yesterdayCode;
}

// Fonction pour afficher le format attendu
export function getExpectedFormat(): string {
  return 'Code à 4 chiffres';
}
