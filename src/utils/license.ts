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
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Algorithme de génération du code
  // Format: YYYYMMDD + checksum
  const baseCode = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  
  // Calcul du checksum simple
  let checksum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    checksum += parseInt(baseCode[i]) * (i + 1);
  }
  checksum = checksum % 100;
  
  // Code final: YYYYMMDD-XX (XX = checksum)
  return `${baseCode}-${checksum.toString().padStart(2, '0')}`;
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
  
  // Code incorrect
  return {
    isValid: false,
    code: expectedCode,
    date: today.toLocaleDateString('fr-FR'),
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
  
  const year = yesterday.getFullYear();
  const month = yesterday.getMonth() + 1;
  const day = yesterday.getDate();
  
  const baseCode = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  
  let checksum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    checksum += parseInt(baseCode[i]) * (i + 1);
  }
  checksum = checksum % 100;
  
  const yesterdayCode = `${baseCode}-${checksum.toString().padStart(2, '0')}`;
  
  return inputCode === yesterdayCode;
}

// Fonction pour afficher le format attendu
export function getExpectedFormat(): string {
  return 'Format: YYYYMMDD-XX (ex: 20250815-45)';
}
