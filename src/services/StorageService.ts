import { Product, Category, Transaction, Cashier } from '../types';
import { Customer } from '../types/Customer';
import { Store } from '../types/Store';
import { getStoreByCode } from '../types/Store';
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
  private static readonly CUSTOMERS_KEY = 'klick_caisse_customers';

  private static getStoreKey(storeCode: string, key: string): string {
    return `klick_caisse_${storeCode}_${key}`;
  }

  // Sauvegarder les produits
  static saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des produits:', error);
    }
  }

  // Clients
  static loadCustomers(): Customer[] {
    try {
      const raw = localStorage.getItem(this.CUSTOMERS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return (Array.isArray(arr) ? arr : []).map((c:any)=> ({ ...c, createdAt: new Date(c.createdAt) }));
    } catch { return []; }
  }

  static saveCustomers(customers: Customer[]): void {
    try {
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
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
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des catégories:', error);
    }
  }

  // Charger les catégories
  static loadCategories(): Category[] {
    try {
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
      console.log(`[DEBUG StorageService] loadClosures - raw:`, raw);
      const closures = raw ? JSON.parse(raw) : [];
      console.log(`[DEBUG StorageService] loadClosures - parsed:`, closures);
      console.log(`[DEBUG StorageService] loadClosures - count:`, closures.length);
      return closures;
    } catch (error) {
      console.error(`[DEBUG StorageService] loadClosures - error:`, error);
      return [];
    }
  }

  static saveClosure(closure: any): void {
    try {
      console.log(`[DEBUG StorageService] saveClosure - closure:`, closure);
      const all = this.loadClosures();
      console.log(`[DEBUG StorageService] saveClosure - existing closures:`, all.length);
      all.push(closure);
      console.log(`[DEBUG StorageService] saveClosure - total after push:`, all.length);
      localStorage.setItem(this.CLOSURES_KEY, JSON.stringify(all));
      console.log(`[DEBUG StorageService] saveClosure - saved successfully`);
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
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
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

  // Supprime une transaction par son id dans toutes les journées archivées
  static deleteTransactionFromAllDays(transactionId: string): void {
    try {
      const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
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
        localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(map));
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
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      
      // Nom plus explicite avec informations sur les clôtures
      const closures = data.closures || [];
      let filename = `klick-manual-backup-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
      
      if (closures.length > 0) {
        const lastClosure = closures[closures.length - 1];
        const closureDate = new Date(lastClosure.closedAt);
        const closureDay = String(closureDate.getDate()).padStart(2, '0');
        const closureMonth = String(closureDate.getMonth() + 1).padStart(2, '0');
        filename += `-Z${lastClosure.zNumber}-${closureDay}${closureMonth}${closureDate.getFullYear()}`;
      }
      
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
      
      // Afficher une notification
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`✅ Sauvegarde créée: ${filename}`);
      }
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

  // Sauvegarder les caissiers (version avec support boutique)
  static saveCashiers(cashiers: Cashier[], storeCode: string = '1'): void {
    const key = this.getStoreKey(storeCode, 'cashiers');
    try {
      localStorage.setItem(key, JSON.stringify(cashiers));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des caissiers:', error);
    }
  }

  // Charger les caissiers (version avec support boutique)
  static loadCashiers(storeCode: string = '1'): Cashier[] {
    const key = this.getStoreKey(storeCode, 'cashiers');
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
      const customers = this.loadCustomers();
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
        customers,
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
      const transactionsByDay = (data as any).transactionsByDay ?? (data as any).transactions_by_day ?? (data as any).klick_caisse_transactions_by_day;
      if (transactionsByDay && typeof transactionsByDay === 'object') {
        localStorage.setItem(this.TRANSACTIONS_BY_DAY_KEY, JSON.stringify(transactionsByDay));
      }
      const closures = (data as any).closures ?? (data as any).klick_caisse_closures;
      if (Array.isArray(closures)) this.saveAllClosures(closures);
      const zCounter = (data as any).zCounter ?? (data as any).z_counter ?? (data as any).klick_caisse_z_counter;
      if (Number.isFinite(Number(zCounter))) localStorage.setItem(this.Z_COUNTER_KEY, String(Number(zCounter)));
      const cashiers = (data as any).cashiers;
      if (Array.isArray(cashiers)) this.saveCashiers(cashiers);
      const customers = (data as any).customers;
      if (Array.isArray(customers)) {
        this.saveCustomers(customers);
      } else {
        // Si absents, tenter une récupération rétroactive
        this.recoverCustomersIfMissing();
      }
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
        const raw = localStorage.getItem(this.TRANSACTIONS_BY_DAY_KEY);
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

  // Sauvegarde automatique locale (rotation limitée)
  static addAutoBackup(storeCode: string = '1'): void {
    try {
      const data = this.exportFullBackup();
      if (!data) return;
      const raw = localStorage.getItem(this.AUTO_BACKUPS_KEY);
      const list: Array<{ ts: string; data: any }> = raw ? JSON.parse(raw) : [];
      const entry = { ts: new Date().toISOString(), data };
      list.unshift(entry);
      const LIMITED = list.slice(0, 30); // garder les 30 dernières (augmenté pour éviter les pertes)
      localStorage.setItem(this.AUTO_BACKUPS_KEY, JSON.stringify(LIMITED));
      
      // Sauvegarde JSON automatique pour récupération en cas de coupure
      this.downloadAutoBackup(data);
    } catch (e) {
      console.error('Erreur sauvegarde auto:', e);
    }
  }

  // Sauvegarde automatique JSON pour récupération
  static downloadAutoBackup(data: any): void {
    try {
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
      
      // Nom plus explicite avec informations sur les clôtures
      const closures = data.closures || [];
      const lastClosure = closures[closures.length - 1];
      let filename = `klick-auto-backup-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
      
      if (lastClosure) {
        const closureDate = new Date(lastClosure.closedAt);
        const closureDay = String(closureDate.getDate()).padStart(2, '0');
        const closureMonth = String(closureDate.getMonth() + 1).padStart(2, '0');
        filename += `-Z${lastClosure.zNumber}-${closureDay}${closureMonth}${closureDate.getFullYear()}`;
      }
      
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

  static saveProductionData(products: Product[], categories: Category[], storeCode: string = '1'): void {
    const data = { products, categories, timestamp: Date.now() };
    const key = this.getStoreKey(storeCode, 'productionData');
    localStorage.setItem(key, JSON.stringify(data));
    this.addAutoBackup(storeCode);
  }

  static loadProductionData(storeCode: string = '1'): { products: Product[]; categories: Category[] } | null {
    const key = this.getStoreKey(storeCode, 'productionData');
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

  static saveTransactions(transactions: Transaction[], storeCode: string = '1'): void {
    const key = this.getStoreKey(storeCode, 'transactions');
    localStorage.setItem(key, JSON.stringify(transactions));
  }

  static loadTransactions(storeCode: string = '1'): Transaction[] {
    const key = this.getStoreKey(storeCode, 'transactions');
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