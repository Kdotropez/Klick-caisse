import { Product, Category } from '../types/Product';

export interface ImportResult {
  products: Product[];
  categories: Category[];
  success: boolean;
  message: string;
  closures?: any[];
  zCounter?: number;
  settings?: any;
  subcategories?: string[];
  transactionsByDay?: any;
  cashiers?: any[];
}

export class CSVImportService {
  /**
   * Import d'un fichier JSON de type "nested" (une entrée par produit avec un tableau optional de variantes)
   * Structure attendue (souple):
   * {
   *   type: 'ARTICLE' | string,
   *   productId: string | number,
   *   nom: string,
   *   categorie: string,
   *   ean13?: string,
   *   prixTTC?: string | number,
   *   variants?: Array<{
   *     id?: string | number,
   *     variantId?: string | number,
   *     ean13?: string,
   *     attributes?: string,
   *     listeAttributs?: string,
   *     ['Liste des attributs']?: string,
   *     prixTTC?: string | number,
   *     ['Prix de vente TTC']?: string | number,
   *     impactTTC?: string | number
   *   }>
   * }
   */
  static async importJSONNested(file: File): Promise<ImportResult> {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      
      // Vérifier si c'est un fichier de sauvegarde complet
      if (json.schemaVersion && json.products && json.categories) {
        // C'est un fichier de sauvegarde complet
        return {
          products: json.products || [],
          categories: json.categories || [],
          closures: json.closures || [],
          zCounter: json.zCounter || 0,
          settings: json.settings || {},
          subcategories: json.subcategories || [],
          transactionsByDay: json.transactionsByDay || {},
          cashiers: json.cashiers || [],
          success: true,
          message: `Sauvegarde complète importée: ${json.products?.length || 0} produits, ${json.categories?.length || 0} catégories, ${json.closures?.length || 0} clôtures`,
        };
      }
      
      // Vérifier si c'est un tableau de produits (ancien format)
      if (!Array.isArray(json)) {
        return { products: [], categories: [], success: false, message: 'JSON invalide: tableau attendu' };
      }

      const products: Product[] = [];
      const categories: Category[] = [];
      const categoryMap = new Map<string, string>();

      for (const entry of json) {
        const product = this.createProductFromNestedRecord(entry);
        if (product) {
          products.push(product);
          const catName = product.category;
          if (catName && !categoryMap.has(catName)) {
            const categoryId = `cat_${categories.length + 1}`;
            categoryMap.set(catName, categoryId);
            categories.push({ id: categoryId, name: catName, color: this.getRandomColor(), productOrder: [] });
          }
        }
      }

      return {
        products,
        categories,
        success: true,
        message: `${products.length} produits importés (JSON) avec succès`,
      };
    } catch (error) {
      return {
        products: [],
        categories: [],
        success: false,
        message: `Erreur lors de l'import JSON: ${error}`,
      };
    }
  }

  static async importCSV(file: File, mapping: any): Promise<ImportResult> {
    try {
      const text = await file.text();
      const lines = text.split('\n');
      // Détecter séparateur (tabulation prioritaire, sinon virgule)
      const sep = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(sep).map(h => h.trim());
      
      const products: Product[] = [];
      const categories: Category[] = [];
      const categoryMap = new Map<string, string>();

      // Traiter chaque ligne (sauf l'en-tête)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(sep).map(v => v.trim());
        if (values.length < headers.length) continue;

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        // Créer le produit selon le mapping
        const product = this.createProductFromRow(row, mapping);
        if (product) {
          products.push(product);
          
          // Ajouter la catégorie si elle n'existe pas
          if (product.category && !categoryMap.has(product.category)) {
            const categoryId = `cat_${categories.length + 1}`;
            categoryMap.set(product.category, categoryId);
            categories.push({
              id: categoryId,
              name: product.category,
              color: this.getRandomColor(),
              productOrder: []
            });
          }
        }
      }

      return {
        products,
        categories,
        success: true,
        message: `${products.length} produits importés avec succès`
      };
    } catch (error) {
      return {
        products: [],
        categories: [],
        success: false,
        message: `Erreur lors de l'import: ${error}`
      };
    }
  }

  private static createProductFromNestedRecord(row: any): Product | null {
    try {
      if (!row || typeof row !== 'object') return null;

      const get = (obj: any, keys: string[], fallback: any = ''): any => {
        for (const k of keys) {
          if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) return obj[k];
        }
        return fallback;
      };

      const rawId = get(row, ['productId', 'id', 'Identifiant produit']);
      const id = String(rawId ?? `prod_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
      const name = String(get(row, ['nom', 'name', 'Nom'], 'Produit sans nom'));
      const category = String(get(row, ['categorie', 'category', 'Nom catégorie par défaut'], 'Général'));
      const ean = String(get(row, ['ean13', 'EAN', 'ean'], ''));
      const priceRaw = get(row, ['prixTTC', 'Prix de vente TTC', 'Prix de vente TTC final', 'price'], 0);
      const price = this.parsePriceToNumber(priceRaw);

      // Sous-catégories éventuelles dans le JSON nested
      const associatedCategories: string[] = (() => {
        const out = new Set<string>();
        const push = (val: unknown) => {
          if (!val) return;
          const s = String(val).trim();
          if (!s) return;
          out.add(this.sanitizeSubcategoryLabel(s));
        };
        
        // NOUVEAU: Champ sousCategorie du JSON nested
        if (row?.sousCategorie) {
          push(row.sousCategorie);
        }
        
        // Tableau direct
        if (Array.isArray(row?.associatedCategories)) {
          for (const v of row.associatedCategories) push(v);
        }
        // Chaîne délimitée
        if (typeof row?.associatedCategories === 'string') {
          String(row.associatedCategories)
            .split(/\s*(?:[;|]|,(?!\d))\s*/)
            .forEach(push);
        }
        // Alias communs
        if (Array.isArray(row?.sousCategories)) {
          for (const v of row.sousCategories) push(v);
        }
        for (let i = 1; i <= 3; i++) {
          const k1 = `Sous-catégorie ${i}`; const k2 = `Sous categorie ${i}`; const k3 = `sous-categorie ${i}`; const k4 = `sous categorie ${i}`;
          if (row && (row as any)[k1]) push((row as any)[k1]);
          if (row && (row as any)[k2]) push((row as any)[k2]);
          if (row && (row as any)[k3]) push((row as any)[k3]);
          if (row && (row as any)[k4]) push((row as any)[k4]);
        }
        return Array.from(out);
      })();

      const variationsRaw = Array.isArray(row?.variants) ? row.variants : [];
      const variations = variationsRaw
        .map((v: any) => {
          const vid = String(get(v, ['id', 'variantId', 'Identifiant déclinaison'], ''));
          const vean = String(get(v, ['ean13', 'ean', 'ean13 décl.'], ''));
          const attrs = String(
            get(v, ['attributes', 'listeAttributs', 'Liste des attributs', 'attributs'], '')
          );
          const vPriceRaw = get(v, ['prixTTC', 'Prix de vente TTC', 'price', 'impactTTC'], '');
          const vPrice = this.parsePriceToNumber(vPriceRaw) || price;
          if (!vid && !vean && !attrs) return null;
          return {
            id: vid || `var_${Math.random().toString(36).slice(2, 10)}`,
            ean13: vean,
            reference: '',
            attributes: attrs,
            priceImpact: 0,
            finalPrice: vPrice,
          };
        })
        .filter(Boolean);

      const product: Product = {
        id,
        name,
        category,
        associatedCategories,
        finalPrice: price,
        ean13: ean,
        reference: '',
        wholesalePrice: price,
        crossedPrice: price,
        salesCount: 0,
        position: 0,
        remisable: true,
        variations: variations as any,
      };

      return product;
    } catch (error) {
      console.error('Erreur lors de la création du produit (JSON nested):', error);
      return null;
    }
  }

  private static parsePriceToNumber(input: unknown): number {
    if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
    const s = String(input || '')
      .replace(/\s+/g, '')
      .replace(/€/g, '')
      .replace(/,/g, '.')
      .trim();
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  private static sanitizeSubcategoryLabel(input: string): string {
    try {
      return String(input)
        .replace(/[\x00-\x1F\x7F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return String(input || '').trim();
    }
  }

  private static createProductFromRow(row: any, mapping: any): Product | null {
    try {
      const headerKeys: string[] = Object.keys(row || {});
      const norm = (s: string) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const normKeyMap = new Map<string, string>();
      headerKeys.forEach(k => normKeyMap.set(norm(k), k));

      const getVal = (aliases: string[]): string => {
        for (const a of aliases) {
          // via mapping
          const mapped = mapping[a];
          if (mapped && row[mapped] !== undefined) return row[mapped];
          // via header scan
          const nk = norm(a);
          const hk = normKeyMap.get(nk);
          if (hk && row[hk] !== undefined) return row[hk];
        }
        return '';
      };

      const name = getVal(['Nom', 'name']) || 'Produit sans nom';
      const category = getVal(['Nom catégorie par défaut', 'categorie', 'category']) || 'Général';
      const priceStr = getVal(['Prix de vente TTC final', 'Prix de vente TTC', 'price']);
      const price = parseFloat(String(priceStr).replace(',', '.')) || 0;
      const ean = getVal(['ean13', 'ean']);

      // Extraire les sous-catégories en PRIORITÉ depuis les colonnes "Sous-catégorie 1..3".
      // Si elles sont vides, on retombe sur la colonne "catégories associées".
      const rawAssocMain = getVal(['catégories associées', 'categories associees', 'associees']);
      const extraSubs: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const labels = [`Sous-catégorie ${i}`, `Sous categorie ${i}`, `sous categorie ${i}`, `sous-categorie ${i}`];
        const v = getVal(labels);
        if (v) extraSubs.push(String(v));
      }
      const normalize = (s: string) => s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      const fromAssoc = String(rawAssocMain).split(/\s*(?:[;|]|,(?!\d))\s*/);
      const chosen = (extraSubs.length > 0 ? extraSubs : fromAssoc)
        .map((cat: string) => (cat || '').trim())
        .filter((cat: string) => !!cat);
      const associatedCategories = Array.from(new Map(
        chosen.map((cat: string) => [normalize(cat), cat] as [string, string])
      ).values());

      return {
        id: String(getVal(['Identifiant produit', 'id']) || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
        name,
        category,
        associatedCategories,
        finalPrice: price,
        ean13: ean,
        reference: '',
        wholesalePrice: parseFloat(String(getVal(["wholesale_price", "Prix d'achat HT", "Prix d achat HT"]) || price).replace(',', '.')) || price,
        crossedPrice: price,
        salesCount: 0,
        position: 0,
        remisable: true, // Par défaut, tous les produits sont remisables
        variations: []
      };
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      return null;
    }
  }

  private static getRandomColor(): string {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
      '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
} 