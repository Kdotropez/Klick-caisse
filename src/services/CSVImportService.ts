import { Product, Category } from '../types/Product';

export interface ImportResult {
  products: Product[];
  categories: Category[];
  success: boolean;
  message: string;
}

export class CSVImportService {
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

      // Extraire les catégories associées si le mapping existe
      // Agréger sous-catégories: colonne CSV "catégories associées" + colonnes "Sous-catégorie n"
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
      const associatedCategories = Array.from(new Map(
        [
          ...String(rawAssocMain).split(/\s*(?:[;|]|,(?!\d))\s*/),
          ...extraSubs
        ]
        .map((cat: string) => (cat || '').trim())
        .filter((cat: string) => !!cat)
        .map((cat: string) => [normalize(cat), cat] as [string, string])
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