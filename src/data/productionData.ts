// Données générées automatiquement depuis base complete 15 aout.csv
// Date: 2025-08-15
// Source: base complete 15 aout.nested.json

import { Product, Category } from '../types';
import { StorageService } from '../services/StorageService';
import { APP_VERSION } from '../version';

// Import de la nouvelle base de données
import newBaseData from '../components/base complete 15 aout.nested.json';

export const products: Product[] = newBaseData.map((item: any) => ({
  id: item.productId,
  name: item.nom,
  reference: item.productId,
  ean13: item.ean13,
  category: item.categorie,
  associatedCategories: item.sousCategorie ? [item.sousCategorie] : [],
  wholesalePrice: parseFloat(item.prixTTC.replace(',', '.')),
  finalPrice: parseFloat(item.prixTTC.replace(',', '.')),
  crossedPrice: parseFloat(item.prixTTC.replace(',', '.')),
  salesCount: 0,
  position: 0,
  remisable: true,
  variations: item.variants.map((v: any) => ({
    id: v.declinaisonId,
    ean13: v.ean13,
    reference: '',
    attributes: v.attributs,
    priceImpact: 0,
    finalPrice: parseFloat(v.prixTTC.replace(',', '.'))
  }))
}));

// Extraire les catégories uniques
const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));







export const categories: Category[] = Array.from(uniqueCategories).map((name, index) => ({
  id: `cat-${index + 1}`,
  name: name || `Catégorie ${index + 1}`,
  color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
  productOrder: [],
  subcategoryOrder: [],
}));

export const loadProductionData = async (storeCode: string = 'default'): Promise<{
  products: Product[];
  categories: Category[];
}> => {
  try {
    // Si la version applicative change, on recharge la base intégrée et on marque la version
    try {
      const DATA_VERSION_KEY = 'klick_caisse_data_version';
      const current = localStorage.getItem(DATA_VERSION_KEY);
      if (current !== APP_VERSION) {
        console.log(`🆕 Nouvelle version détectée (${current || 'none'} -> ${APP_VERSION}). Recharge de la base intégrée.`);
        StorageService.saveProducts(products);
        StorageService.saveCategories(categories);
        localStorage.setItem(DATA_VERSION_KEY, APP_VERSION);
        return { products, categories };
      }
    } catch {}
    // Essayer de charger depuis le localStorage d'abord
    const savedProducts = StorageService.loadProducts();
    const savedCategories = StorageService.loadCategories();
    
    if (savedProducts.length > 0 && savedCategories.length > 0) {
      // Migration automatique: réinjecter les sous-catégories manquantes depuis la base intégrée
      try {
        const refById = new Map<string, { categorie?: string; sousCategorie?: string }>();
        (newBaseData as any[]).forEach((it: any) => {
          refById.set(String(it.productId), { categorie: it.categorie, sousCategorie: it.sousCategorie });
        });

        let changed = false;
        const migratedProducts: Product[] = savedProducts.map((p: any) => {
          const ref = refById.get(String(p.id));
          if (!ref) return p;
          const next = { ...p } as Product;
          const hasSubcats = Array.isArray((next as any).associatedCategories) && (next as any).associatedCategories.length > 0;
          const fromRef = (ref.sousCategorie || '').toString().trim();
          if (!hasSubcats && fromRef) {
            (next as any).associatedCategories = [fromRef];
            changed = true;
          }
          if ((!next.category || !next.category.toString().trim()) && (ref.categorie || '').toString().trim()) {
            next.category = String(ref.categorie);
            changed = true;
          }
          return next;
        });

        if (changed) {
          StorageService.saveProducts(migratedProducts);
          console.log(`🛠 Migration appliquée: sous-catégories restaurées pour ${migratedProducts.length} produits`);
          return { products: migratedProducts, categories: savedCategories };
        }
      } catch {}

      console.log(`📦 Données chargées depuis localStorage (${savedProducts.length} produits, ${savedCategories.length} catégories)`);
      return { products: savedProducts, categories: savedCategories };
    }
    
    // Sinon, utiliser les nouvelles données par défaut
    console.log(`🆕 Chargement de la nouvelle base de données (${products.length} produits, ${categories.length} catégories)`);
    
    // Sauvegarder automatiquement les nouvelles données
    StorageService.saveProducts(products);
    StorageService.saveCategories(categories);
    
    return { products, categories };
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error);
    return { products: [], categories: [] };
  }
};

export const saveProductionData = async (
  products: Product[],
  categories: Category[],
  storeCode: string = 'default'
): Promise<void> => {
  try {
    StorageService.saveProducts(products);
    StorageService.saveCategories(categories);
    console.log(`💾 Données sauvegardées (${products.length} produits, ${categories.length} catégories)`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};
