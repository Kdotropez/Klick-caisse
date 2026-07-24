import { Product, Category, Transaction, Cashier } from '../types';
import { Customer } from '../types/Customer';
import { getStoreByCode } from '../types/Store';
import { defaultSubcategoriesRegistry } from '../data/subcategoriesRegistry';
import { computeTicketTotal } from '../utils/ticketTotal';

export class StorageService {
  private static readonly PRODUCTS_KEY = 'klick_caisse_products';
  private static readonly CATEGORIES_KEY = 'klick_caisse_categories';
  private static readonly SETTINGS_KEY = 'klick_caisse_settings';
  private static readonly SUBCATEGORIES_KEY = 'klick_caisse_subcategories';
  private static readonly CASHIERS_KEY = 'klick_caisse_cashiers';
  /** Ancienne clé globale (avant isolation par boutique) — encore présente après migration si la copie a raté ou mauvaise boutique. */
  private static readonly LEGACY_CLOSURES_KEY = 'klick_caisse_closures';
  private static readonly AUTO_BACKUP_DOWNLOAD_THROTTLE_MS = 5 * 60_000;

  static readonly STORE_MIGRATION_FLAG = 'klick_caisse_v2_store_migration_done';

  static getStoreKey(storeCode: string, key: string): string {
    return `klick_caisse_${storeCode}_${key}`;
  }

  /** Clé localStorage pour le magasin courant (tickets, clôtures, Z, réglages, etc.) */
  private static activeStoreKey(suffix: string): string {
    return this.getStoreKey(this.getCurrentStoreCode(), suffix);
  }

  /** Supprime une entrée localStorage pour la boutique active (ex. closures, z_counter). */
  static removeActiveStoreEntry(suffix: string): void {
    localStorage.removeItem(this.activeStoreKey(suffix));
  }

  private static isQuotaExceeded(error: unknown): boolean {
    const e = error as { name?: string; code?: number };
    return e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014;
  }

  private static purgeOversizedLocalBackups(): void {
    try {
      this.downloadLocalStorageArchiveBeforePurge();
      // Ne jamais purger automatiquement les traces de sauvegarde des autres boutiques.
      // On limite la récupération de quota à la boutique active et aux anciennes clés globales.
      localStorage.removeItem(this.activeStoreKey('auto_backups'));
      localStorage.removeItem('klick_caisse_auto_backups');
      localStorage.removeItem('klick_emergency_backup');
      localStorage.removeItem('klick_emergency_recovery');
    } catch {
      /* ignore */
    }
  }

  private static downloadLocalStorageArchiveBeforePurge(): void {
    try {
      if (typeof document === 'undefined') return;
      const storeCode = this.getCurrentStoreCode();
      const sessionKey = `klick_quota_archive_downloaded_${storeCode}`;
      try {
        if (sessionStorage.getItem(sessionKey) === '1') return;
      } catch {
        /* ignore */
      }

      const snapshot: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        snapshot[key] = localStorage.getItem(key) || '';
      }

      const archive = {
        schemaVersion: 1,
        type: 'localStorage-archive-before-quota-cleanup',
        exportedAt: new Date().toISOString(),
        storeCode,
        localStorage: snapshot,
      };
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `${this.backupFilePrefix(storeCode)}-archive-avant-nettoyage-quota-${this.datedStamp(new Date())}.json`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      try {
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        /* ignore */
      }
      console.warn(`Archive locale créée avant nettoyage quota: ${filename}`);
    } catch (error) {
      console.warn('Impossible de créer l’archive locale avant nettoyage quota:', error);
    }
  }

  private static setItemWithQuotaRecovery(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      if (!this.isQuotaExceeded(error)) throw error;
      this.purgeOversizedLocalBackups();
      localStorage.setItem(key, value);
    }
  }

  /** True si d’anciennes clés « globales » contiennent encore des données à migrer. */
  static hasLegacyGlobalBundle(): boolean {
    const nonEmpty = (key: string): boolean => {
      const v = localStorage.getItem(key);
      if (v == null || v === '') return false;
      const t = v.trim();
      if (t === '[]' || t === '{}' || t === 'null') return false;
      return true;
    };
    return (
      nonEmpty('klick_caisse_transactions_by_day') ||
      nonEmpty(this.LEGACY_CLOSURES_KEY) ||
      nonEmpty('klick_caisse_products') ||
      nonEmpty('klick_caisse_categories') ||
      nonEmpty('klick_caisse_settings') ||
      nonEmpty('klick_caisse_customers') ||
      nonEmpty('klick_caisse_subcategories') ||
      nonEmpty('klick_caisse_cashiers') ||
      nonEmpty('klick_caisse_pro_receipts') ||
      nonEmpty('klick_caisse_auto_backups')
    );
  }

  /** Afficher la modale de migration legacy (données globales non encore scindées par boutique). */
  static requiresLegacyMigrationPrompt(): boolean {
    if (localStorage.getItem(this.STORE_MIGRATION_FLAG)) return false;
    return this.hasLegacyGlobalBundle();
  }

  /** Normalisation pour contrôle d’accès : même nom de boutique, insensible à la casse / espaces / accents. */
  static normalizeStoreNameForAccess(input: string): string {
    return String(input || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  static getStoreAccessExpectedLabel(storeCode: string): string {
    return getStoreByCode(storeCode)?.name?.trim() ?? '';
  }

  /** Le mot de passe d’ouverture est le nom de la boutique (voir STORES). */
  static verifyStoreAccessPin(storeCode: string, input: string): boolean {
    const expected = this.getStoreAccessExpectedLabel(storeCode);
    if (!expected) return false;
    return this.normalizeStoreNameForAccess(input) === this.normalizeStoreNameForAccess(expected);
  }

  /** Segment de nom de fichier sûr pour la boutique (ex. saint-tropez). */
  static slugifyStoreForFilename(storeCode?: string): string {
    const code = storeCode ?? this.getCurrentStoreCode();
    const st = getStoreByCode(code);
    const label = (st?.name || `magasin-${code}`).trim();
    const slug = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    return slug || `s${code}`;
  }

  private static datedStamp(d = new Date()): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
  }

  private static zSuffixFromClosures(closures: any[]): string {
    if (!closures.length) return '';
    const lastClosure = closures[closures.length - 1];
    const closureDate = new Date(lastClosure.closedAt);
    const closureDay = String(closureDate.getDate()).padStart(2, '0');
    const closureMonth = String(closureDate.getMonth() + 1).padStart(2, '0');
    return `-Z${lastClosure.zNumber}-${closureDay}${closureMonth}${closureDate.getFullYear()}`;
  }

  /** Préfixe type klick-saint-tropez pour les téléchargements liés à la boutique courante. */
  static backupFilePrefix(storeCode?: string): string {
    return `klick-${this.slugifyStoreForFilename(storeCode)}`;
  }

  /** À la première ouverture après mise à jour : copie l’ancien stockage global vers la boutique choisie. */
  static migrateLegacyBundleToStore(storeCode: string): void {
    if (localStorage.getItem(this.STORE_MIGRATION_FLAG)) return;

    const copy = (legacyKey: string, suffix: string) => {
      const v = localStorage.getItem(legacyKey);
      if (v) localStorage.setItem(this.getStoreKey(storeCode, suffix), v);
    };

    copy('klick_caisse_transactions_by_day', 'transactions_by_day');
    copy(this.LEGACY_CLOSURES_KEY, 'closures');
    copy('klick_caisse_z_counter', 'z_counter');
    copy('klick_caisse_settings', 'settings');
    copy('klick_caisse_customers', 'customers');
    copy('klick_caisse_subcategories', 'subcategories');
    copy('klick_caisse_pro_receipts', 'pro_receipts');
    copy('klick_caisse_auto_backups', 'auto_backups');

    const p = localStorage.getItem(this.PRODUCTS_KEY);
    const c = localStorage.getItem(this.CATEGORIES_KEY);
    const legacyProducts = this.parseLegacyProductsRaw(p);
    const legacyCategories = this.parseLegacyCategoriesRaw(c);
    let productCatalogMigrationOk = true;
    if (legacyProducts.length > 0 || legacyCategories.length > 0) {
      try {
        /** Éviter export auto + téléchargement JSON pendant la migration (gros volume → UI bloquée). */
        this.saveProductionData(legacyProducts, legacyCategories, storeCode, { skipAutoBackup: true });
      } catch (e) {
        productCatalogMigrationOk = false;
        console.error('Migration legacy produits/catégories:', e);
      }
    }
    copy(this.CASHIERS_KEY, 'cashiers');

    if (productCatalogMigrationOk) {
      localStorage.setItem(this.STORE_MIGRATION_FLAG, '1');
    } else {
      console.warn('Migration legacy incomplète: le catalogue produits/catégories sera reproposé au prochain démarrage.');
    }
  }

  /**
   * Supprime uniquement les clés « globales » legacy (sans copier vers une boutique).
   * Utile si les données locales ne doivent pas être rattachées au multi-magasin.
   * Pose le drapeau de migration pour ne plus afficher la modale.
   */
  static purgeLegacyGlobalBundle(): void {
    const keys = [
      'klick_caisse_transactions_by_day',
      this.LEGACY_CLOSURES_KEY,
      'klick_caisse_z_counter',
      'klick_caisse_settings',
      'klick_caisse_customers',
      'klick_caisse_subcategories',
      'klick_caisse_pro_receipts',
      'klick_caisse_auto_backups',
      this.PRODUCTS_KEY,
      this.CATEGORIES_KEY,
      this.CASHIERS_KEY,
    ];
    for (const k of keys) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    localStorage.setItem(this.STORE_MIGRATION_FLAG, '1');
  }

  static getTransactionsByDayRaw(): string | null {
    return localStorage.getItem(this.activeStoreKey('transactions_by_day'));
  }

  static setTransactionsByDayRaw(json: string): void {
    this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), json);
  }

  static getTransactionsByDayMap(): Record<string, any[]> {
    try {
      const raw = this.getTransactionsByDayRaw();
      if (!raw) return {};
      const m = JSON.parse(raw);
      return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
    } catch {
      return {};
    }
  }

  static saveTransactionsByDayMap(map: Record<string, any[]>): void {
    this.setTransactionsByDayRaw(JSON.stringify(map));
  }

  static setZCounterValue(n: number): void {
    this.setItemWithQuotaRecovery(this.activeStoreKey('z_counter'), String(n));
  }

  // Sauvegarder les produits
  static saveProducts(products: Product[]): void {
    try {
      const code = this.getCurrentStoreCode();
      const pd = this.loadProductionData(code);
      const categories =
        pd && Array.isArray(pd.categories) && pd.categories.length > 0
          ? pd.categories
          : this.loadCategories();
      this.saveProductionData(products, categories, code);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des produits:', error);
    }
  }

  // Clients
  static loadCustomers(): Customer[] {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('customers'));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return (Array.isArray(arr) ? arr : []).map((c:any)=> ({ ...c, createdAt: new Date(c.createdAt) }));
    } catch { return []; }
  }

  static saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(this.activeStoreKey('customers'), JSON.stringify(customers));
    } catch {}
  }

  static addCustomer(c: Omit<Customer,'id'|'createdAt'> & { id?: string }): Customer {
    const customers = this.loadCustomers();
    const id = c.id || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const customer: Customer = { ...c, id, createdAt: new Date() } as Customer;
    customers.push(customer);
    this.saveCustomers(customers);
    return customer;
  }

  static updateCustomer(updated: Customer): void {
    const customers = this.loadCustomers();
    const idx = customers.findIndex(c => c.id === updated.id);
    if (idx === -1) return;
    customers[idx] = { ...updated };
    this.saveCustomers(customers);
  }

  static deleteCustomer(id: string): void {
    const customers = this.loadCustomers();
    const next = customers.filter(c => c.id !== id);
    this.saveCustomers(next);
  }

  // Charger les produits
  static loadProducts(): Product[] {
    try {
      const code = this.getCurrentStoreCode();
      const pd = this.loadProductionData(code);
      if (pd && Array.isArray(pd.products) && pd.products.length > 0) {
        return pd.products;
      }
      const data = localStorage.getItem(this.PRODUCTS_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      
      // Vérification de la structure des données
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ Données produits corrompues (pas un tableau), réinitialisation');
        localStorage.removeItem(this.PRODUCTS_KEY);
        return [];
      }
      
      // Vérifier que chaque produit a les propriétés essentielles
      const validProducts = parsed.filter(product => {
        return product && 
               typeof product === 'object' && 
               typeof product.id === 'string' && 
               typeof product.name === 'string';
      });
      
      if (validProducts.length !== parsed.length) {
        console.warn(`⚠️ ${parsed.length - validProducts.length} produits corrompus ignorés`);
      }
      
      return validProducts;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des produits:', error);
      // En cas d'erreur, supprimer les données corrompues
      localStorage.removeItem(this.PRODUCTS_KEY);
      return [];
    }
  }

  // Sauvegarder les catégories
  static saveCategories(categories: Category[]): void {
    try {
      const code = this.getCurrentStoreCode();
      const pd = this.loadProductionData(code);
      const products =
        pd && Array.isArray(pd.products) && pd.products.length > 0
          ? pd.products
          : this.loadProducts();
      this.saveProductionData(products, categories, code);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des catégories:', error);
    }
  }

  // Charger les catégories
  static loadCategories(): Category[] {
    try {
      const code = this.getCurrentStoreCode();
      const pd = this.loadProductionData(code);
      if (pd && Array.isArray(pd.categories) && pd.categories.length > 0) {
        return pd.categories;
      }
      const data = localStorage.getItem(this.CATEGORIES_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      
      // Vérification de la structure des données
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ Données catégories corrompues (pas un tableau), réinitialisation');
        localStorage.removeItem(this.CATEGORIES_KEY);
        return [];
      }
      
      // Vérifier que chaque catégorie a les propriétés essentielles
      const validCategories = parsed.filter(category => {
        return category && 
               typeof category === 'object' && 
               typeof category.id === 'string' && 
               typeof category.name === 'string';
      });
      
      if (validCategories.length !== parsed.length) {
        console.warn(`⚠️ ${parsed.length - validCategories.length} catégories corrompues ignorées`);
      }
      
      return validCategories;
    } catch (error) {
      console.error('❌ Erreur lors du chargement des catégories:', error);
      // En cas d'erreur, supprimer les données corrompues
      localStorage.removeItem(this.CATEGORIES_KEY);
      return [];
    }
  }

  // Sauvegarder les paramètres
  static saveSettings(settings: any): void {
    try {
      localStorage.setItem(this.activeStoreKey('settings'), JSON.stringify(settings));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des paramètres:', error);
    }
  }

  // Charger les paramètres
  static loadSettings(): any {
    try {
      const data = localStorage.getItem(this.activeStoreKey('settings'));
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
      // Supprimer uniquement les caractères de contrôle, conserver les lettres accentuées
      // eslint-disable-next-line no-control-regex
      [/([\x00-\x1F\x7F])/g, ''],
      [/\uFEFF/g, ''],
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
    // Normalisations spécifiques signalées:
    s = s.replace(/\bpalid\b/gi, 'plaid');
    s = s.replace(/\bverre\s*650\b/gi, 'verre 6.50');
    // Conserver les décimales/€ en fin de libellé
    s = s.replace(/(\d+[.,]\d{1,2})\s*€/g, '$1 €');
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
      localStorage.setItem(this.activeStoreKey('subcategories'), JSON.stringify(unique));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des sous-catégories:', error);
    }
  }

  static loadSubcategories(): string[] {
    try {
      const data = localStorage.getItem(this.activeStoreKey('subcategories'));
      const parsed: unknown = data ? JSON.parse(data) : [];
      const fromStorage = Array.isArray(parsed) ? (parsed as string[]) : [];
      
      // Synchroniser automatiquement avec les produits chargés
      const products = this.loadProducts();
      const productSubcategories = this.extractSubcategoriesFromProducts(products);
      
      // Fusionner avec le registre par défaut et les sous-catégories des produits
      const merged = Array.from(new Set([
        ...defaultSubcategoriesRegistry,
        ...fromStorage,
        ...productSubcategories
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
      
      // Sauvegarder automatiquement les sous-catégories synchronisées
      if (productSubcategories.length > 0) {
        this.saveSubcategories(merged);
      }
      
      return merged;
    } catch (error) {
      console.error('Erreur lors du chargement des sous-catégories:', error);
      return [];
    }
  }

  // Extraire les sous-catégories des produits
  static extractSubcategoriesFromProducts(products: Product[]): string[] {
    try {
      const subcategories = new Set<string>();
      
      products.forEach((product) => {
        // Vérifier associatedCategories (format actuel)
        if (product.associatedCategories && Array.isArray(product.associatedCategories)) {
          product.associatedCategories.forEach(category => {
            if (category && typeof category === 'string') {
              const clean = this.sanitizeLabel(category).trim();
              if (clean) {
                subcategories.add(clean);
              }
            }
          });
        }
        
        // Vérifier sousCategorie (format JSON original)
        if ((product as any).sousCategorie && typeof (product as any).sousCategorie === 'string') {
          const clean = this.sanitizeLabel((product as any).sousCategorie).trim();
          if (clean) {
            subcategories.add(clean);
          }
        }
      });
      
      return Array.from(subcategories).sort();
    } catch (error) {
      console.error('Erreur lors de l\'extraction des sous-catégories:', error);
      return [];
    }
  }

  // Synchroniser automatiquement les sous-catégories
  static syncSubcategoriesFromProducts(): void {
    try {
      const products = this.loadProducts();
      const productSubcategories = this.extractSubcategoriesFromProducts(products);
      
      if (productSubcategories.length > 0) {
        const currentSubcategories = this.loadSubcategories();
        const merged = Array.from(new Set([
          ...currentSubcategories,
          ...productSubcategories
        ])).sort();
        
        this.saveSubcategories(merged);
        console.log(`Synchronisation automatique: ${productSubcategories.length} nouvelles sous-catégories détectées`);
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation des sous-catégories:', error);
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

  private static coerceAmount(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number.parseFloat(String(value ?? '').replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  private static computeTransactionTotalFromItems(t: any): number {
    try {
      const settings = this.loadSettings() || {};
      return computeTicketTotal(
        Array.isArray(t.items) ? t.items : [],
        t.itemDiscounts || {},
        t.globalDiscount ?? null,
        {
          excludedDiscountCategories: Array.isArray(settings.excludedDiscountCategories)
            ? settings.excludedDiscountCategories
            : [],
          excludedDiscountSubcategories: Array.isArray((settings as any).excludedDiscountSubcategories)
            ? (settings as any).excludedDiscountSubcategories
            : [],
          excludedDiscountProductIds: Array.isArray((settings as any).excludedDiscountProductIds)
            ? (settings as any).excludedDiscountProductIds
            : [],
        }
      );
    } catch {
      return 0;
    }
  }

  private static normalizeTransactionRecord(t: any): Transaction | null {
    if (!t || !Array.isArray(t.items) || !t.id) return null;
    const shouldRecomputeTotal =
      t.total == null ||
      t.total === '' ||
      (typeof t.total === 'number' && !Number.isFinite(t.total));
    return {
      ...t,
      total: shouldRecomputeTotal ? this.computeTransactionTotalFromItems(t) : this.coerceAmount(t.total),
      timestamp: new Date(t.timestamp),
    } as Transaction;
  }

  static addDailyTransaction(tx: Transaction): void {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      // Sérialiser Date -> ISO
      const shouldRecomputeTotal =
        (tx as any).total == null ||
        (tx as any).total === '' ||
        (typeof (tx as any).total === 'number' && !Number.isFinite((tx as any).total));
      const total = shouldRecomputeTotal ? this.computeTransactionTotalFromItems(tx) : this.coerceAmount(tx.total);
      const serialized = {
        ...tx,
        total,
        timestamp: new Date(tx.timestamp).toISOString()
      };
      list.push(serialized);
      map[key] = list;
      this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la transaction du jour:', error);
    }
  }

  static loadTodayTransactions(): Transaction[] {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return [];
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      // Désérialiser ISO -> Date et filtrer les entrées invalides
      return list
        .map((t: any) => this.normalizeTransactionRecord(t))
        .filter((t): t is Transaction => t !== null);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions du jour:', error);
      return [];
    }
  }

  static clearTodayTransactions(): void {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      delete map[key];
      this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de l\'effacement des transactions du jour:', error);
    }
  }

  // ---------- Clôture (archives) ----------
  static loadClosures(): any[] {
    const parseArray = (raw: string | null): any[] | null => {
      if (raw == null || raw === '') return null;
      try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v : null;
      } catch {
        return null;
      }
    };
    try {
      const fromStore = parseArray(localStorage.getItem(this.activeStoreKey('closures')));
      if (fromStore && fromStore.length > 0) return fromStore;
      const fromLegacy = parseArray(localStorage.getItem(this.LEGACY_CLOSURES_KEY));
      if (fromLegacy && fromLegacy.length > 0) return fromLegacy;
      return [];
    } catch (error) {
      console.error(`[DEBUG StorageService] loadClosures - error:`, error);
      return [];
    }
  }

  static saveClosure(closure: any): void {
    try {
      const all = this.loadClosures();
      all.push(closure);
      this.setItemWithQuotaRecovery(this.activeStoreKey('closures'), JSON.stringify(all));
    } catch (error) {
      console.error('Erreur lors de l\'archivage de la clôture:', error);
    }
  }

  static saveAllClosures(closures: any[]): void {
    try {
      this.setItemWithQuotaRecovery(this.activeStoreKey('closures'), JSON.stringify(closures || []));
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des clôtures:', error);
    }
  }

  static deleteClosureByZ(zNumber: number): void {
    try {
      const closures = this.loadClosures();
      const next = closures.filter((c: any) => Number(c?.zNumber) !== Number(zNumber));
      this.saveAllClosures(next);
    } catch (e) {
      console.error('Erreur suppression clôture Z', zNumber, e);
    }
  }

  static getMaxZNumber(): number {
    const closures = this.loadClosures();
    return closures.reduce((max: number, c: any) => Math.max(max, Number(c?.zNumber) || 0), 0);
  }

  // Reconstruire des clôtures à partir des transactionsByDay; merge=true conserve l'existant et ajoute les jours manquants
  static recoverClosuresFromTransactionsByDay(merge: boolean = true): { created: number; merged: number } {
    let created = 0;
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return { created: 0, merged: 0 };
      const map = JSON.parse(raw) as Record<string, any[]>;
      const existing = merge ? (this.loadClosures() || []) : [];
      const byDay = new Map<string, any>(existing.map((c: any) => [new Date(c.closedAt).toISOString().slice(0,10), c]));
      let nextZ = merge ? this.getMaxZNumber() + 1 : 1;
      const days = Object.keys(map).sort();
      for (const day of days) {
        const txs = Array.isArray(map[day]) ? map[day] : [];
        if (txs.length === 0) continue;
        if (byDay.has(day)) {
          // Déjà une clôture pour ce jour: fusionner transactions si besoin
          const c = byDay.get(day);
          const oldTxs = Array.isArray(c.transactions) ? c.transactions : [];
          const mergedTxs = [...oldTxs, ...txs];
          c.transactions = mergedTxs;
          c.totalCA = mergedTxs.reduce((s: number, t: any) => s + (t.total || 0), 0);
          byDay.set(day, c);
        } else {
          const totalCA = txs.reduce((s: number, t: any) => s + (t.total || 0), 0);
          const closure = {
            zNumber: nextZ++,
            closedAt: `${day}T23:59:59.000Z`,
            transactions: txs,
            totalCA,
            totalTransactions: txs.length
          };
          byDay.set(day, closure);
          created++;
        }
      }
      const result = Array.from(byDay.values()).sort((a: any, b: any) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime());
      this.saveAllClosures(result);
      return { created, merged: result.length };
    } catch (e) {
      console.error('Erreur récupération clôtures:', e);
      return { created: 0, merged: 0 };
    }
  }

  static getCurrentZNumber(): number {
    const raw = localStorage.getItem(this.activeStoreKey('z_counter'));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  }

  static incrementZNumber(): number {
    const current = this.getCurrentZNumber();
    const next = current + 1;
    this.setItemWithQuotaRecovery(this.activeStoreKey('z_counter'), String(next));
    return next;
  }

  static updateDailyTransaction(updated: Transaction): void {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      const idx = list.findIndex((t: any) => t.id === updated.id);
      if (idx >= 0) {
        map[key][idx] = {
          ...updated,
          total: this.coerceAmount(updated.total),
          timestamp: new Date(updated.timestamp).toISOString()
        };
        this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), JSON.stringify(map));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du ticket:', error);
    }
  }

  static deleteDailyTransaction(transactionId: string): void {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      const key = this.getTodayKey();
      const list = Array.isArray(map[key]) ? map[key] : [];
      map[key] = list.filter((t: any) => t.id !== transactionId);
      this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), JSON.stringify(map));
    } catch (error) {
      console.error('Erreur lors de la suppression du ticket:', error);
    }
  }

  // Supprime une transaction par son id dans toutes les journées archivées
  static deleteTransactionFromAllDays(transactionId: string): void {
    try {
      const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      if (!raw) return;
      const map: Record<string, any[]> = JSON.parse(raw);
      let changed = false;
      for (const day of Object.keys(map)) {
        const list = Array.isArray(map[day]) ? map[day] : [];
        const filtered = list.filter((t: any) => t && String(t.id) !== String(transactionId));
        if (filtered.length !== list.length) {
          map[day] = filtered;
          changed = true;
        }
      }
      if (changed) {
        this.setItemWithQuotaRecovery(this.activeStoreKey('transactions_by_day'), JSON.stringify(map));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression (toutes journées):', error);
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

  // Sauvegarde manuelle immédiate (pour protection contre coupure)
  static saveImmediateBackup(): void {
    try {
      const data = this.exportFullBackup();
      if (!data) return;
      
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const stamp = this.datedStamp(d);
      const closures = data.closures || [];
      const prefix = this.backupFilePrefix();
      let filename = `${prefix}-manual-backup-${stamp}`;
      filename += this.zSuffixFromClosures(closures);
      filename += '.json';
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`✅ Sauvegarde manuelle créée: ${filename}`);
    } catch (e) {
      console.error('Erreur sauvegarde manuelle:', e);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('❌ Erreur lors de la sauvegarde');
      }
    }
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
      const code = this.getCurrentStoreCode();
      localStorage.removeItem(this.getStoreKey(code, 'productionData'));
      localStorage.removeItem(this.activeStoreKey('settings'));
      localStorage.removeItem(this.PRODUCTS_KEY);
      localStorage.removeItem(this.CATEGORIES_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error('Erreur lors de la suppression des données:', error);
    }
  }

  // Vérifier si des données existent
  static hasData(): boolean {
    const code = this.getCurrentStoreCode();
    if (localStorage.getItem(this.getStoreKey(code, 'productionData'))) return true;
    return !!(localStorage.getItem(this.PRODUCTS_KEY) || localStorage.getItem(this.CATEGORIES_KEY));
  }

  // === GESTION DES CAISSIERS ===

  // Sauvegarder les caissiers (version avec support boutique)
  static saveCashiers(cashiers: Cashier[], storeCode?: string): void {
    const code = storeCode ?? this.getCurrentStoreCode();
    const key = this.getStoreKey(code, 'cashiers');
    try {
      localStorage.setItem(key, JSON.stringify(cashiers));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des caissiers:', error);
    }
  }

  // Charger les caissiers (version avec support boutique)
  static loadCashiers(storeCode?: string): Cashier[] {
    const code = storeCode ?? this.getCurrentStoreCode();
    const key = this.getStoreKey(code, 'cashiers');
    try {
      const data = localStorage.getItem(key);
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
    const existingCashiers = this.loadCashiers(this.getCurrentStoreCode());
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
      this.saveCashiers([defaultCashier], this.getCurrentStoreCode());
      return [defaultCashier];
    }
    return existingCashiers;
  }

  // Mettre à jour les statistiques d'un caissier
  static updateCashierStats(cashierId: string, transactionTotal: number): void {
    const cashiers = this.loadCashiers(this.getCurrentStoreCode());
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
    this.saveCashiers(updatedCashiers, this.getCurrentStoreCode());
  }

  // Mettre à jour la dernière connexion d'un caissier
  static updateCashierLastLogin(cashierId: string): void {
    const cashiers = this.loadCashiers(this.getCurrentStoreCode());
    const updatedCashiers = cashiers.map(cashier => {
      if (cashier.id === cashierId) {
        return {
          ...cashier,
          lastLogin: new Date()
        };
      }
      return cashier;
    });
    this.saveCashiers(updatedCashiers, this.getCurrentStoreCode());
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
      const customers = this.loadCustomers();
      const proReceipts = ProReceiptStorage.loadProReceipts();
      // Lire brut la map des transactions par jour
      const txRaw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
      const transactionsByDay = txRaw ? JSON.parse(txRaw) : {};
      const sc = this.getCurrentStoreCode();
      const st = getStoreByCode(sc);
      return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        storeCode: sc,
        storeName: st?.name,
        products,
        categories,
        settings,
        subcategories,
        transactionsByDay,
        closures,
        zCounter,
        cashiers,
        customers,
        proReceipts,
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
      const filename = `${this.backupFilePrefix()}-backup-${this.datedStamp(d)}.json`;
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
      const transactionsByDay = (data as any).transactionsByDay ?? (data as any).transactions_by_day ?? (data as any).klick_caisse_transactions_by_day;
      if (transactionsByDay && typeof transactionsByDay === 'object') {
        localStorage.setItem(this.activeStoreKey('transactions_by_day'), JSON.stringify(transactionsByDay));
      }
      const closures = (data as any).closures ?? (data as any).klick_caisse_closures;
      if (Array.isArray(closures)) this.saveAllClosures(closures);
      const zCounter = (data as any).zCounter ?? (data as any).z_counter ?? (data as any).klick_caisse_z_counter;
      if (Number.isFinite(Number(zCounter))) localStorage.setItem(this.activeStoreKey('z_counter'), String(Number(zCounter)));
      const cashiers = (data as any).cashiers;
      if (Array.isArray(cashiers)) this.saveCashiers(cashiers);
      const customers = (data as any).customers;
      if (Array.isArray(customers)) {
        this.saveCustomers(customers);
      } else {
        // Si absents, tenter une récupération rétroactive
        this.recoverCustomersIfMissing();
      }

      // Tickets pro (facultatif)
      const proReceipts = (data as any).proReceipts;
      if (Array.isArray(proReceipts)) ProReceiptStorage.saveProReceipts(proReceipts as any);
    } catch (e) {
      console.error('Erreur import backup:', e);
      throw e;
    }
  }

  // Reconstruire les clients à partir des transactions existantes (clôtures + transactionsByDay)
  static recoverCustomersIfMissing(): void {
    try {
      const existing = this.loadCustomers();
      if (existing.length > 0) return;
      const recovered: Record<string, Customer> = {};
      const pushCustomer = (id: string | undefined, name: string | undefined, ts?: any) => {
        const safeName = (name || '').trim();
        if (!safeName) return;
        const parts = safeName.split(' ').filter(Boolean);
        let lastName = safeName;
        let firstName = '';
        if (parts.length >= 2) {
          lastName = parts[0];
          firstName = parts.slice(1).join(' ');
        }
        const key = String(id || safeName).toLowerCase();
        if (recovered[key]) return;
        recovered[key] = {
          id: String(id || `c-${Math.random().toString(36).slice(2,10)}`),
          lastName,
          firstName,
          address: '',
          postalCode: '',
          city: '',
          country: 'France',
          email: '',
          phone: '',
          createdAt: ts ? new Date(ts) : new Date()
        } as Customer;
      };

      const closures = this.loadClosures();
      for (const c of closures) {
        const txs = Array.isArray((c as any)?.transactions) ? (c as any).transactions : [];
        for (const t of txs) {
          pushCustomer((t as any)?.customerId, (t as any)?.customerName, (t as any)?.timestamp);
        }
      }

      // transactionsByDay
      try {
        const raw = localStorage.getItem(this.activeStoreKey('transactions_by_day'));
        if (raw) {
          const map = JSON.parse(raw) as Record<string, any[]>;
          for (const day of Object.keys(map)) {
            const list = Array.isArray(map[day]) ? map[day] : [];
            for (const t of list) {
              pushCustomer((t as any)?.customerId, (t as any)?.customerName, (t as any)?.timestamp);
            }
          }
        }
      } catch {}

      const recList = Object.values(recovered);
      if (recList.length > 0) {
        this.saveCustomers(recList);
      }
    } catch (e) {
      console.warn('recoverCustomersIfMissing error:', e);
    }
  }

  // Sauvegarde automatique: téléchargement JSON + trace légère en localStorage.
  static addAutoBackup(_storeCode?: string): void {
    try {
      const data = this.exportFullBackup();
      if (!data) return;
      if (this.shouldDownloadAutoBackup()) {
        this.downloadAutoBackup(data);
      }

      const raw = localStorage.getItem(this.activeStoreKey('auto_backups'));
      const parsed = raw ? JSON.parse(raw) : [];
      const list: Array<{ ts: string; storeCode?: string; zCounter?: number }> = (Array.isArray(parsed) ? parsed : [])
        .map((item: any) => ({
          ts: String(item?.ts || item?.data?.exportedAt || ''),
          storeCode: item?.storeCode || item?.data?.storeCode,
          zCounter: Number.isFinite(Number(item?.zCounter ?? item?.data?.zCounter))
            ? Number(item?.zCounter ?? item?.data?.zCounter)
            : undefined,
        }))
        .filter((item) => item.ts);
      const entry = {
        ts: new Date().toISOString(),
        storeCode: data.storeCode,
        zCounter: data.zCounter,
      };
      list.unshift(entry);
      this.setItemWithQuotaRecovery(this.activeStoreKey('auto_backups'), JSON.stringify(list.slice(0, 5)));
    } catch (e) {
      console.error('Erreur sauvegarde auto:', e);
    }
  }

  private static shouldDownloadAutoBackup(): boolean {
    try {
      const key = this.activeStoreKey('last_auto_backup_download_at');
      const now = Date.now();
      const last = Number(localStorage.getItem(key) || '0');
      if (Number.isFinite(last) && now - last < this.AUTO_BACKUP_DOWNLOAD_THROTTLE_MS) {
        return false;
      }
      localStorage.setItem(key, String(now));
      return true;
    } catch {
      return true;
    }
  }

  // Sauvegarde automatique JSON pour récupération
  static downloadAutoBackup(data: any): void {
    try {
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const d = new Date();
      const closures = data.closures || [];
      const prefix = this.backupFilePrefix();
      let filename = `${prefix}-auto-backup-${this.datedStamp(d)}`;
      filename += this.zSuffixFromClosures(closures);
      filename += '.json';
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`✅ Sauvegarde automatique créée: ${filename}`);
    } catch (e) {
      console.error('Erreur sauvegarde auto JSON:', e);
    }
  }

  // === GESTION DES BOUTIQUES ===

  static saveProductionData(
    products: Product[],
    categories: Category[],
    storeCode?: string,
    opts?: { skipAutoBackup?: boolean }
  ): void {
    const code = storeCode ?? this.getCurrentStoreCode();
    const data = { products, categories, timestamp: Date.now() };
    const key = this.getStoreKey(code, 'productionData');
    this.setItemWithQuotaRecovery(key, JSON.stringify(data));
    if (!opts?.skipAutoBackup) {
      this.addAutoBackup(code);
    }
  }

  /** Parse l’ancienne clé globale produits (même règles que loadProducts sans lire le blob boutique). */
  private static parseLegacyProductsRaw(data: string | null): Product[] {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (product: any) =>
          product &&
          typeof product === 'object' &&
          typeof product.id === 'string' &&
          typeof product.name === 'string'
      ) as Product[];
    } catch {
      return [];
    }
  }

  private static parseLegacyCategoriesRaw(data: string | null): Category[] {
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (category: any) =>
          category &&
          typeof category === 'object' &&
          typeof category.id === 'string' &&
          typeof category.name === 'string'
      ) as Category[];
    } catch {
      return [];
    }
  }

  static loadProductionData(storeCode?: string): { products: Product[]; categories: Category[] } | null {
    const code = storeCode ?? this.getCurrentStoreCode();
    const key = this.getStoreKey(code, 'productionData');
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    try {
      const parsed = JSON.parse(data);
      return {
        products: parsed.products || [],
        categories: parsed.categories || []
      };
    } catch (error) {
      console.error('Erreur lors du chargement des données de production:', error);
      return null;
    }
  }

  static saveTransactions(transactions: Transaction[], storeCode?: string): void {
    const code = storeCode ?? this.getCurrentStoreCode();
    const key = this.getStoreKey(code, 'transactions');
    localStorage.setItem(key, JSON.stringify(transactions));
  }

  static loadTransactions(storeCode?: string): Transaction[] {
    const code = storeCode ?? this.getCurrentStoreCode();
    const key = this.getStoreKey(code, 'transactions');
    const data = localStorage.getItem(key);
    if (!data) return [];
    
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Erreur lors du chargement des transactions:', error);
      return [];
    }
  }

  static getCurrentStoreCode(): string {
    return localStorage.getItem('klick_caisse_current_store') || '1';
  }

  static setCurrentStoreCode(storeCode: string): void {
    localStorage.setItem('klick_caisse_current_store', storeCode);
  }

  static getAllStoreData(storeCode: string): {
    products: Product[];
    categories: Category[];
    transactions: Transaction[];
    cashiers: Cashier[];
  } {
    return {
      products: this.loadProductionData(storeCode)?.products || [],
      categories: this.loadProductionData(storeCode)?.categories || [],
      transactions: this.loadTransactions(storeCode),
      cashiers: this.loadCashiers(storeCode)
    };
  }

  static exportStoreData(storeCode: string): string {
    const data = this.getAllStoreData(storeCode);
    const store = getStoreByCode(storeCode);
    const exportData = {
      store: store,
      data: data,
      exportDate: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
  }

  static importStoreData(storeCode: string, jsonData: string): boolean {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.data) {
        if (parsed.data.products && parsed.data.categories) {
          this.saveProductionData(parsed.data.products, parsed.data.categories, storeCode);
        }
        if (parsed.data.transactions) {
          this.saveTransactions(parsed.data.transactions, storeCode);
        }
        if (parsed.data.cashiers) {
          this.saveCashiers(parsed.data.cashiers, storeCode);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur lors de l\'import des données:', error);
      return false;
    }
  }


} 

// ==================== Tickets Professionnels (Pro Receipts) ====================
export interface ProReceipt {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  header: {
    shopName: string; address: string; phone: string; email: string; website: string;
  };
  recipient?: {
    company?: string;
    contactName?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
    vatNumber?: string;
  };
  meta: { date: string; time: string; ticketNumber: string; orderRef?: string };
  footer: { paymentMethod: string; siret: string; customNote: string };
  theme?: { logoDataUrl?: string; primaryColor?: string; borderColor?: string; fontFamily?: string; align?: 'left'|'center'|'right' };
  groupAsGift?: boolean;
  giftLabel?: string;
  giftTaxRate?: number;
  defaultTaxRate?: number;
  items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
}

export class ProReceiptStorage {
  private static key(): string {
    return StorageService.getStoreKey(StorageService.getCurrentStoreCode(), 'pro_receipts');
  }

  static loadProReceipts(): ProReceipt[] {
    try {
      const raw = localStorage.getItem(this.key());
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  static saveProReceipts(list: ProReceipt[]): void {
    try { localStorage.setItem(this.key(), JSON.stringify(list)); } catch {}
  }

  static addProReceipt(data: Omit<ProReceipt, 'id'|'createdAt'|'updatedAt'> & { id?: string }): ProReceipt {
    const list = this.loadProReceipts();
    const id = data.id || `pro-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const now = new Date().toISOString();
    const rec: ProReceipt = { ...data, id, createdAt: now, updatedAt: now } as ProReceipt;
    list.unshift(rec);
    this.saveProReceipts(list);
    return rec;
  }

  static updateProReceipt(updated: ProReceipt): void {
    const list = this.loadProReceipts();
    const idx = list.findIndex(r => r.id === updated.id);
    if (idx >= 0) {
      list[idx] = { ...updated, updatedAt: new Date().toISOString() };
      this.saveProReceipts(list);
    }
  }

  static deleteProReceipt(id: string): void {
    const list = this.loadProReceipts();
    const next = list.filter(r => r.id !== id);
    this.saveProReceipts(next);
  }
}