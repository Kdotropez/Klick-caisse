// Données générées automatiquement depuis base complete 15 aout.csv
// Date: 2025-08-15
// Source: base complete 15 aout.nested.json

import { Product, Category } from '../types';
import { StorageService } from '../services/StorageService';

// Import de la nouvelle base de données
import newBaseData from '../base complete 15 aout.nested.json';



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
  variations: item.variants ? item.variants.map((v: any) => ({
    id: v.declinaisonId,
    ean13: v.ean13,
    reference: '',
    attributes: v.attributs,
    priceImpact: 0,
    finalPrice: parseFloat(v.prixTTC.replace(',', '.'))
  })) : []
}));

// Extraire les catégories uniques
const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));

// Helper: extraire les sous-catégories à partir d'une liste de produits
const extractSubcategoriesFromProducts = (list: Product[]): string[] => {
  const set = new Set<string>();
  for (const p of list) {
    const arr = Array.isArray((p as any).associatedCategories) ? (p as any).associatedCategories as string[] : [];
    for (const raw of arr) {
      const clean = StorageService.sanitizeLabel(String(raw || '')).trim();
      if (clean) set.add(clean);
    }
  }
  return Array.from(set).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
};






export const categories: Category[] = Array.from(uniqueCategories).map((name, index) => ({
  id: `cat-${index + 1}`,
  name: name || `Catégorie ${index + 1}`,
  color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
  productOrder: [],
  subcategoryOrder: [],
}));

export const loadProductionData = async (storeCode: string): Promise<{
  products: Product[];
  categories: Category[];
}> => {
  try {
    // 1) Données déjà isolées par boutique (blob productionData + clés dérivées via getCurrentStoreCode)
    const savedProducts = StorageService.loadProducts();
    const savedCategories = StorageService.loadCategories();
    
    // Vérifier si les sous-catégories sont présentes
    const subcats = StorageService.loadSubcategories();
    
    if (savedProducts.length > 0 && savedCategories.length > 0 && subcats.length > 0) {
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
          // Synchroniser automatiquement les sous-catégories
          StorageService.syncSubcategoriesFromProducts();
          console.log(`🛠 Migration appliquée: sous-catégories restaurées pour ${migratedProducts.length} produits`);
          return { products: migratedProducts, categories: savedCategories };
        }
      } catch {}

      // Synchroniser automatiquement les sous-catégories
      StorageService.syncSubcategoriesFromProducts();
      return { products: savedProducts, categories: savedCategories };
    }
    
    // Si pas de données complètes, utiliser les données intégrées pour cette boutique
    StorageService.saveProductionData(products, categories, storeCode);
    const extracted = extractSubcategoriesFromProducts(products);
    StorageService.saveSubcategories(extracted);
    return { products, categories };
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données:', error);
    return { products: [], categories: [] };
  }
};

export const saveProductionData = async (
  products: Product[],
  categories: Category[],
  storeCode?: string
): Promise<void> => {
  try {
    const code = storeCode ?? StorageService.getCurrentStoreCode();
    StorageService.saveProductionData(products, categories, code);
    console.log(`💾 Données sauvegardées (${products.length} produits, ${categories.length} catégories) — boutique ${code}`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};

// Utilitaire: forcer la réinitialisation immédiate vers la base intégrée
export const resetToEmbeddedBase = (): void => {
  try {
    // Forcer la sauvegarde des produits intégrés
    StorageService.saveProducts(products);
    StorageService.saveCategories(categories);
    
    // Extraire directement les sous-catégories depuis les produits intégrés
    const extracted = extractSubcategoriesFromProducts(products);
    
    // Sauvegarder les sous-catégories extraites
    StorageService.saveSubcategories(extracted);
    
    // Vérifier le résultat final
    const finalSubcats = StorageService.loadSubcategories();
    console.log(`🔁 Base intégrée restaurée (${products.length} produits, ${categories.length} catégories, ${finalSubcats.length} sous-catégories)`);
  } catch (e) {
    console.error('❌ Erreur resetToEmbeddedBase:', e);
  }
};
