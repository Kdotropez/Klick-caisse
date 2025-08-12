import { StorageService } from './StorageService';

export interface License {
  key: string;
  machineId: string;
  issuedDate: string;
  expiryDate: string;
  customerName: string;
  customerEmail: string;
  isActive: boolean;
  maxUsers?: number;
  features: string[];
}

export interface LicenseValidation {
  isValid: boolean;
  message: string;
  daysRemaining: number;
  isExpired: boolean;
}

class LicenseService {
  private static readonly LICENSE_KEY = 'klick_caisse_license';
  private static readonly MACHINE_ID_KEY = 'klick_caisse_machine_id';

  // Générer un identifiant unique pour la machine
  private generateMachineId(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Klick Caisse Machine ID', 2, 2);
      const fingerprint = canvas.toDataURL();
      return this.hashString(fingerprint + navigator.userAgent + window.screen.width + window.screen.height);
    }
    return this.hashString(navigator.userAgent + window.screen.width + window.screen.height + new Date().getTime());
  }

  // Fonction de hachage simple
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }

  // Générer une clé de licence basée sur l'identifiant machine
  generateLicenseKey(machineId: string, customerName: string, customerEmail: string, expiryDate: string, features: string[] = ['basic']): string {
    const data = `${machineId}|${customerName}|${customerEmail}|${expiryDate}|${features.join(',')}`;
    const hash = this.hashString(data + 'KLICK_CAISSE_SECRET_2024');
    return `${hash.substring(0, 8)}-${hash.substring(8, 16)}-${hash.substring(16, 24)}-${hash.substring(24, 32)}`;
  }

  // Obtenir l'identifiant machine (généré ou stocké)
  getMachineId(): string {
    let machineId = localStorage.getItem(LicenseService.MACHINE_ID_KEY);
    if (!machineId) {
      machineId = this.generateMachineId();
      localStorage.setItem(LicenseService.MACHINE_ID_KEY, machineId);
    }
    return machineId;
  }

  // Valider une clé de licence
  validateLicenseKey(licenseKey: string, customerName: string, customerEmail: string, expiryDate: string, features: string[] = ['basic']): boolean {
    const machineId = this.getMachineId();
    const expectedKey = this.generateLicenseKey(machineId, customerName, customerEmail, expiryDate, features);
    return licenseKey.toUpperCase() === expectedKey.toUpperCase();
  }

  // Sauvegarder une licence
  saveLicense(license: License): void {
    localStorage.setItem(LicenseService.LICENSE_KEY, JSON.stringify(license));
  }

  // Charger une licence
  loadLicense(): License | null {
    const licenseData = localStorage.getItem(LicenseService.LICENSE_KEY);
    if (licenseData) {
      try {
        return JSON.parse(licenseData);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Valider la licence actuelle
  validateCurrentLicense(): LicenseValidation {
    const license = this.loadLicense();
    
    if (!license) {
      return {
        isValid: false,
        message: 'Aucune licence trouvée',
        daysRemaining: 0,
        isExpired: true
      };
    }

    if (!license.isActive) {
      return {
        isValid: false,
        message: 'Licence désactivée',
        daysRemaining: 0,
        isExpired: true
      };
    }

    const machineId = this.getMachineId();
    if (license.machineId !== machineId) {
      return {
        isValid: false,
        message: 'Licence non valide pour cette machine',
        daysRemaining: 0,
        isExpired: true
      };
    }

    const now = new Date();
    const expiryDate = new Date(license.expiryDate);
    const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;

    if (isExpired) {
      return {
        isValid: false,
        message: `Licence expirée depuis ${Math.abs(daysRemaining)} jour(s)`,
        daysRemaining: 0,
        isExpired: true
      };
    }

    if (daysRemaining <= 7) {
      return {
        isValid: true,
        message: `Licence expire dans ${daysRemaining} jour(s)`,
        daysRemaining,
        isExpired: false
      };
    }

    return {
      isValid: true,
      message: 'Licence valide',
      daysRemaining,
      isExpired: false
    };
  }

  // Supprimer la licence
  removeLicense(): void {
    localStorage.removeItem(LicenseService.LICENSE_KEY);
  }

  // Générer une licence de démonstration (30 jours)
  generateDemoLicense(): License {
    const machineId = this.getMachineId();
    const issuedDate = new Date().toISOString();
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 jours
    const key = this.generateLicenseKey(machineId, 'DEMO', 'demo@klickcaisse.com', expiryDate, ['basic']);

    return {
      key,
      machineId,
      issuedDate,
      expiryDate,
      customerName: 'DEMO',
      customerEmail: 'demo@klickcaisse.com',
      isActive: true,
      maxUsers: 1,
      features: ['basic']
    };
  }

  // Vérifier si une fonctionnalité est disponible
  hasFeature(feature: string): boolean {
    const license = this.loadLicense();
    if (!license || !license.isActive) return false;
    
    const validation = this.validateCurrentLicense();
    if (!validation.isValid) return false;

    return license.features.includes(feature) || license.features.includes('premium');
  }

  // Obtenir les informations de la licence
  getLicenseInfo(): { customerName: string; customerEmail: string; expiryDate: string; features: string[]; daysRemaining: number } | null {
    const license = this.loadLicense();
    if (!license) return null;

    const validation = this.validateCurrentLicense();
    return {
      customerName: license.customerName,
      customerEmail: license.customerEmail,
      expiryDate: license.expiryDate,
      features: license.features,
      daysRemaining: validation.daysRemaining
    };
  }
}

export const licenseService = new LicenseService();
