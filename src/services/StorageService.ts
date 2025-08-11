import { Product, Category } from '../types/Product';
import type { Transaction } from '../types/Product';
import { Cashier } from '../types/Cashier';
import { defaultSubcategoriesRegistry } from '../data/subcategoriesRegistry';

export class StorageService {
  private static readonly PRODUCTS_KEY = 'klick_caisse_products';
  private static readonly CATEGORIES_KEY = 'klick_caisse_categories';
  private static readonly SETTINGS_KEY = 'klick_caisse_settings';
  private static readonly SUBCATEGORIES_KEY = 'klick_caisse_subcategories';
  private static readonly TRANSACTIONS_BY_DAY_KEY = 'klick_caisse_transactions_by_day';
  private static readonly CLOSURES_KEY = 'klick_caisse_closures';
  private static readonly Z_COUNTER_KEY = 'klick_caisse_z_counter';
  private static readonly CASHIERS_KEY = 'klick_caisse_cashiers';
  private static readonly AUTO_BACKUPS_KEY = 'klick_caisse_auto_backups';

  // Sauvegarder les produits
  static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des produits:', error);
    }
  }

  // Charger les produits
  static loadProducts(): Product[] {
    try {
      const data = localStorage.getItem(this.PRODUCTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      return [];
    }
  }

  // Sauvegarder les catégories
  static saveCategories(categories: Category[]): void {
    try {
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des catégories:', error);
    }
  }

  // Charger les catégories
  static loadCategories(): Category[] {
    try {
      const data = localStorage.getItem(this.CATEGORIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
      return [];
    }
  }

  // Sauvegarder les paramètres
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  }

  // Charger les paramètres
  static loadSettings(): any {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      return {};
    }
  }

  // Sous-catégories globales (registre)
  static sanitizeLabel(input: string): string {
    const map: Array<[RegExp, string]> = [
      [/[^\S\r\n]+/g, ' '],
      //[control chars]\x00-\x1F, \x7F
      // eslint-disable-next-line no-control-regex
      [/[^\x20-\x7E]/g, ' '],
      [/\uFFFD/g, ''],
      // Common mojibake (UTF-8 read as CP1252)
      [/â‚¬/g, '€'],
      [/Â°/g, '°'],
      [/Â /g, ''],
      [/Ã©/g, 'é'],
      [/Ã¨/g, 'è'],
      [/Ã€/g, 'È'],
      [/Ãª/g, 'ê'],
      [/Ã«/g, 'ë'],
      [/Ã®/g, 'î'],
      [/Ã¯/g, 'ï'],
      [/Ã´/g, 'ô'],
      [/Ã¶/g, 'ö'],
      [/Ã¹/g, 'ù'],
      [/Ã»/g, 'û'],
      [/Ã¼/g, 'ü'],
      [/Ã§/g, 'ç'],
      [/Ã /g, 'à'],
      [/Ã¡/g, 'á'],
      [/Ãª/g, 'ê'],
      [/Ã’/g, 'Ò'],
      [/Ã“/g, 'Ó'],
      [/Ã”/g, 'Ô'],
      [/Ã‰/g, 'É'],
      [/Ã‹/g, 'Ë'],
      [/Ã‰/g, 'É'],
      [/Ãœ/g, 'Ü'],
      [/Ã±/g, 'ñ'],
      // Smart quotes
      [/“|”/g, '"'],
      [/‘|’/g, "'"],
    ];
    let s = (input || '').toString();
    for (const [re, rep] of map) s = s.replace(re, rep);
    // Prix suivis d'un caractère remplacé -> ajouter 
    s = s.replace(/(\d+[.,]\d{1,2})\s*$/g, '$1');
    return s.replace(/\s+/g, ' ').trim();
  }

  // Normaliser pour comparaisons/recherches (insensible à la casse/accents/espace multiple)
  static normalizeLabel(input: string): string {
    try {
      const cleaned = this.sanitizeLabel(String(input || ''))
        .toLowerCase()
        // Décomposer les accents puis supprimer les diacritiques
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return cleaned;
    } catch {
      return String(input || '').toLowerCase();
    }
  }

  static saveSubcategories(subcategories: string[]): void {
    try {
      const unique = Array.from(new Set(subcategories
        // eslint-disable-next-line no-control-regex
        .map(s => this.sanitizeLabel(s))
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false;
          const norm = this.normalizeLabel(s);
          const alnum = norm.replace(/[^a-z0-9]/g, '');
          return alnum.length >= 2; // ignorer \u0000S, 'c', 'b', etc.
        })))
        .sort();
      localStorage.setItem(this.SUBCATEGORIES_KEY, JSON.stringify(unique));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des sous-catégories:', error);
    }
  }

  static loadSubcategories(): string[] {
    try {
      const data = localStorage.getItem(this.SUBCATEGORIES_KEY);
      const parsed: unknown = data ? JSON.parse(data) : [];
      const fromStorage = Array.isArray(parsed) ? (parsed as string[]) : [];
      // Fusionner avec le registre par défaut (restauré)
      const merged = Array.from(new Set([
        ...defaultSubcategoriesRegistry,
        ...fromStorage
      ]
        .map((s: string) => this.sanitizeLabel(s))
        .map((s: string) => s.trim())
        .filter((s: string) => {
          if (!s) return false;
          const norm = this.normalizeLabel(s);
          const alnum = norm.replace(/[^a-z0-9]/g, '');
          return alnum.length >= 2;
        })
      )).sort();
      return merged;
    } catch (error) {
      console.error('Erreur lors du chargement des sous-catégories:', error);
      return [];
    }
  }

  // ---------- Transactions du jour ----------
  private static getTodayKey(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  static addDailyTransaction(tx: Transaction): void {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      // Sérialiser Date -> ISO
      const serialized = { ...tx, timestamp: new Date(tx.timestamp).toISOString() };
      list.push(serialized);
      map[key] = list;
      localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la transaction du jour:', error);
    }
  }

  static loadTodayTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      if (!raw) return [];
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      // Désérialiser ISO -> Date et filtrer les entrées invalides
      return list
        .filter((t: any) => t && Array.isArray(t.items) && typeof t.total === 'number' && t.id)
        .map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })) as Transaction[];
    } catch (error) {
      console.error('Erreur lors du chargement des transactions du jour:', error);
      return [];
    }
  }

  static clearTodayTransactions(): void {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      delete map[key];
      localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de l\'effacement des transactions du jour:', error);
    }
  }

  // ---------- Clôture (archives) ----------
  static loadClosures(): any[] {
    try {
      const raw = localStorage.getItem(this.CLOSURES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveClosure(closure: any): void {
    try {
      const all = this.loadClosures();
      all.push(closure);
      localStorage.setItem(this.CLOSURES_KEY, JSON.stringify(all));
    } catch (error) {
      console.error('Erreur lors de l\'archivage de la clôture:', error);
    }
  }

  static saveAllClosures(closures: any[]): void {
    try {
      localStorage.setItem(this.CLOSURES_KEY, JSON.stringify(closures || []));
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des clôtures:', error);
    }
  }

  static getCurrentZNumber(): number {
    const raw = localStorage.getItem(this.Z_COUNTER_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  static incrementZNumber(): number {
    const current = this.getCurrentZNumber();
    const next = current + 1;
    localStorage.setItem(this.Z_COUNTER_KEY, String(next));
    return next;
  }

  static updateDailyTransaction(updated: Transaction): void {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      const idx = list.findIndex((t: any) => t.id === updated.id);
      if (idx >= 0) {
        map[key][idx] = { ...updated, timestamp: new Date(updated.timestamp).toISOString() };
        localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(map));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du ticket:', error);
    }
  }

  static deleteDailyTransaction(transactionId: string): void {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      map[key] = list.filter((t: any) => t.id !== transactionId);
      localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de la suppression du ticket:', error);
    }
  }

  // Exporter les données
  static exportData(): { products: Product[], categories: Category[], settings: any } {
    return {
      products: this.loadProducts(),
      categories: this.loadCategories(),
      settings: this.loadSettings()
    };
  }

  // Importer les données
  static importData(data: { products: Product[], categories: Category[], settings?: any }): void {
    this.saveProducts(data.products);
    this.saveCategories(data.categories);
    if (data.settings) {
      this.saveSettings(data.settings);
    }
  }

  // Effacer toutes les données
  static clearAllData(): void {
    try {
      localStorage.removeItem(this.PRODUCTS_KEY);
      localStorage.removeItem(this.CATEGORIES_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
    }
  }

  // Vérifier si des données existent
  static hasData(): boolean {
    return !!(localStorage.getItem(this.PRODUCTS_KEY) || localStorage.getItem(this.CATEGORIES_KEY));
  }

  // === GESTION DES CAISSIERS ===

  // Sauvegarder les caissiers
  static saveCashiers(cashiers: Cashier[]): void {
    try {
      localStorage.setItem(this.CASHIERS_KEY, JSON.stringify(cashiers));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des caissiers:', error);
    }
  }

  // Charger les caissiers
  static loadCashiers(): Cashier[] {
    try {
      const data = localStorage.getItem(this.CASHIERS_KEY);
      if (data) {
        const cashiers = JSON.parse(data);
        // Convertir les dates string en objets Date
        return cashiers.map((cashier: any) => ({
          ...cashier,
          createdAt: new Date(cashier.createdAt),
          lastLogin: cashier.lastLogin ? new Date(cashier.lastLogin) : undefined
        }));
      }
      return [];
    } catch (error) {
      console.error('Erreur lors du chargement des caissiers:', error);
      return [];
    }
  }

  // Créer un caissier par défaut si aucun n'existe
  static initializeDefaultCashier(): Cashier[] {
    const existingCashiers = this.loadCashiers();
    if (existingCashiers.length === 0) {
      const defaultCashier: Cashier = {
        id: 'cashier_default',
        name: 'Admin',
        firstName: 'Administrateur',
        pin: '0000',
        isActive: true,
        createdAt: new Date(),
        totalSales: 0,
        totalTransactions: 0
      };
      this.saveCashiers([defaultCashier]);
      return [defaultCashier];
    }
    return existingCashiers;
  }

  // Mettre à jour les statistiques d'un caissier
  static updateCashierStats(cashierId: string, transactionTotal: number): void {
    const cashiers = this.loadCashiers();
    const updatedCashiers = cashiers.map(cashier => {
      if (cashier.id === cashierId) {
        return {
          ...cashier,
          totalSales: cashier.totalSales + transactionTotal,
          totalTransactions: cashier.totalTransactions + 1
        };
      }
      return cashier;
    });
    this.saveCashiers(updatedCashiers);
  }

  // Mettre à jour la dernière connexion d'un caissier
  static updateCashierLastLogin(cashierId: string): void {
    const cashiers = this.loadCashiers();
    const updatedCashiers = cashiers.map(cashier => {
      if (cashier.id === cashierId) {
        return {
          ...cashier,
          lastLogin: new Date()
        };
      }
      return cashier;
    });
    this.saveCashiers(updatedCashiers);
  }

  // ===== Sauvegarde/export complet (backup) =====
  static exportFullBackup(): any {
    try {
      const products = this.loadProducts();
      const categories = this.loadCategories();
      const settings = this.loadSettings();
      const subcategories = this.loadSubcategories();
      const closures = this.loadClosures();
      const zCounter = this.getCurrentZNumber();
      const cashiers = this.loadCashiers();
      // Lire brut la map des transactions par jour
      const txRaw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
      const transactionsByDay = txRaw ? JSON.parse(txRaw) : {};
      return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        products,
        categories,
        settings,
        subcategories,
        transactionsByDay,
        closures,
        zCounter,
        cashiers,
      };
    } catch (e) {
      console.error('Erreur export backup:', e);
      return null;
    }
  }

  static downloadFullBackup(): void {
    try {
      const data = this.exportFullBackup();
      if (!data) return;
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const filename = `klick-backup-${yyyy}${mm}${dd}-${hh}${mi}${ss}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur téléchargement backup:', e);
    }
  }

  static importFullBackup(data: any): void {
    if (!data || typeof data !== 'object') return;
    try {
      if (Array.isArray((data as any).products)) this.saveProducts((data as any).products);
      if (Array.isArray((data as any).categories)) this.saveCategories((data as any).categories);
      if ((data as any).settings && typeof (data as any).settings === 'object') this.saveSettings((data as any).settings);
      // Accepte subcategories en tableau
      if (Array.isArray((data as any).subcategories)) this.saveSubcategories((data as any).subcategories);
      // Accepte deux notations pour transactions et zCounter
      const transactionsByDay = (data as any).transactionsByDay ?? (data as any).transactions_by_day;
      if (transactionsByDay && typeof transactionsByDay === 'object') {
        localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(transactionsByDay));
      }
      const closures = (data as any).closures;
      if (Array.isArray(closures)) this.saveAllClosures(closures);
      const zCounter = (data as any).zCounter ?? (data as any).z_counter;
      if (Number.isFinite(Number(zCounter))) localStorage.setItem(this.Z_COUNTER_KEY, String(Number(zCounter)));
      const cashiers = (data as any).cashiers;
      if (Array.isArray(cashiers)) this.saveCashiers(cashiers);
    } catch (e) {
      console.error('Erreur import backup:', e);
      throw e;
    }
  }

  // Sauvegarde automatique locale (rotation limitée)
  static addAutoBackup(): void {
    try {
      const data = this.exportFullBackup();
      if (!data) return;
      const raw = localStorage.getItem(this.AUTO_BACKUPS_KEY);
      const list: Array<{ ts: string; data: any }> = raw ? JSON.parse(raw) : [];
      const entry = { ts: new Date().toISOString(), data };
      list.unshift(entry);
      const LIMITED = list.slice(0, 20); // garder les 20 dernières
      localStorage.setItem(this.AUTO_BACKUPS_KEY, JSON.stringify(LIMITED));
    } catch (e) {
      console.error('Erreur sauvegarde auto:', e);
    }
  }
} 