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

export const loadProductionData = async (storeCode: string = 'default'): Promise<{
  products: Product[];
  categories: Category[];
}> => {
  try {
    // 1) Charger depuis le localStorage d'abord
    const savedProducts = StorageService.loadProducts();
    const savedCategories = StorageService.loadCategories();
    
    // Vérifier si les sous-catégories sont présentes
    const subcats = StorageService.loadSubcategories();
    console.log(`🔍 Vérification: ${subcats.length} sous-catégories trouvées dans le localStorage`);
    
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
      console.log(`📦 Données chargées depuis localStorage (${savedProducts.length} produits, ${savedCategories.length} catégories, ${subcats.length} sous-catégories)`);
      return { products: savedProducts, categories: savedCategories };
    }
    
    // Si pas de données complètes, utiliser les données intégrées
    console.log('⚠️ Données incomplètes, rechargement depuis les données intégrées...');
    // Forcer le rechargement depuis les données intégrées
    StorageService.saveProducts(products);
    StorageService.saveCategories(categories);
    const extracted = extractSubcategoriesFromProducts(products);
    StorageService.saveSubcategories(extracted);
    console.log(`✅ Données intégrées restaurées (${products.length} produits, ${categories.length} catégories, ${extracted.length} sous-catégories)`);
    return { products, categories };
    }
    
    // 2) Sinon, utiliser les nouvelles données par défaut (intégrées)
    console.log(`Chargement des données par défaut (${products.length} produits, ${categories.length} catégories)`);
    // Sauvegarder automatiquement les nouvelles données par défaut
    StorageService.saveProducts(products);
    StorageService.saveCategories(categories);
    // Synchroniser automatiquement les sous-catégories
    StorageService.syncSubcategoriesFromProducts();
    
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

// Utilitaire: forcer la réinitialisation immédiate vers la base intégrée
export const resetToEmbeddedBase = (): void => {
  try {
    console.log('🔄 Début de la réinitialisation vers la base intégrée...');
    
    // Forcer la sauvegarde des produits intégrés
    StorageService.saveProducts(products);
    console.log(`✅ ${products.length} produits sauvegardés`);
    
    StorageService.saveCategories(categories);
    console.log(`✅ ${categories.length} catégories sauvegardées`);
    
    // Extraire directement les sous-catégories depuis les produits intégrés
    console.log('🔍 Extraction des sous-catégories depuis les produits intégrés...');
    const extracted = extractSubcategoriesFromProducts(products);
    console.log(`✅ ${extracted.length} sous-catégories extraites`);
    
    // Sauvegarder les sous-catégories extraites
    StorageService.saveSubcategories(extracted);
    console.log('✅ Sous-catégories sauvegardées');
    
    // Vérifier le résultat final
    const finalSubcats = StorageService.loadSubcategories();
    console.log(`🔁 Base intégrée restaurée (${products.length} produits, ${categories.length} catégories, ${finalSubcats.length} sous-catégories)`);
    
    if (finalSubcats.length > 0) {
      console.log('📋 Sous-catégories disponibles:');
      finalSubcats.slice(0, 10).forEach(subcat => {
        console.log(`   - "${subcat}"`);
      });
      if (finalSubcats.length > 10) {
        console.log(`   ... et ${finalSubcats.length - 10} autres`);
      }
    }
  } catch (e) {
    console.error('❌ Erreur resetToEmbeddedBase:', e);
  }
};
