// Données générées automatiquement depuis base complete 15 aout.csv
// Date: 2025-08-15
// Source: base complete 15 aout.nested.json

import { Product, Category } from '../types';
import { StorageService } from '../services/StorageService';

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
const uniqueSubcategories = new Set(
  products.flatMap(p => p.associatedCategories).filter(Boolean)
);

export const categories: Category[] = [
  ...Array.from(uniqueCategories).map((name, index) => ({
    id: `cat-${index + 1}`,
    name: name,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    productOrder: [],
    subcategoryOrder: []
  })),
  ...Array.from(uniqueSubcategories).map((name, index) => ({
    id: `subcat-${index + 1}`,
    name: name,
    color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    productOrder: [],
    subcategoryOrder: []
  }))
];

export const loadProductionData = async (storeCode: string = 'default'): Promise<{
  products: Product[];
  categories: Category[];
}> => {
  try {
    // Essayer de charger depuis le localStorage d'abord
    const savedProducts = StorageService.loadProducts(storeCode);
    const savedCategories = StorageService.loadCategories(storeCode);
    
    if (savedProducts.length > 0 && savedCategories.length > 0) {
      console.log(`📦 Données chargées depuis localStorage (${savedProducts.length} produits, ${savedCategories.length} catégories)`);
      return { products: savedProducts, categories: savedCategories };
    }
    
    // Sinon, utiliser les nouvelles données par défaut
    console.log(`🆕 Chargement de la nouvelle base de données (${products.length} produits, ${categories.length} catégories)`);
    
    // Sauvegarder automatiquement les nouvelles données
    StorageService.saveProducts(products, storeCode);
    StorageService.saveCategories(categories, storeCode);
    
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
    StorageService.saveProducts(products, storeCode);
    StorageService.saveCategories(categories, storeCode);
    console.log(`💾 Données sauvegardées (${products.length} produits, ${categories.length} catégories)`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};
