const fs = require('fs');

// Lire le fichier CSV
console.log('📖 Lecture du fichier CSV...');
const content = fs.readFileSync('bdd complete v2.csv', 'utf8');
const lines = content.split('\n').filter(line => line.trim());

// Analyser la première ligne pour comprendre la structure
const firstLine = lines[0];
console.log('Première ligne:', firstLine.substring(0, 200) + '...');

// Extraire les colonnes manuellement basé sur ce qu'on sait
const products = [];
const categories = new Set();
const associatedCategoriesSet = new Set();

console.log('📊 Traitement des données...');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  
  // Diviser par tabulations
  const values = line.split('\t');
  
  if (values.length < 15) continue; // Vérifier qu'on a assez de colonnes
  
  try {
    // Extraire les valeurs basées sur la position connue
    const boutiqueId = values[0] || '';
    const name = values[1] || 'Produit sans nom';
    const id = values[2] || `prod_${i}`;
    const reference = values[3] || '';
    const ean13 = values[5] || '';
    const category = values[7] || 'Général';
    // Nettoyer les prix avant de les parser
    const cleanWholesalePriceStr = (values[8] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(',', '.');
    const cleanFinalPriceStr = (values[14] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(',', '.');
    const wholesalePrice = parseFloat(cleanWholesalePriceStr) || 0;
    const finalPrice = parseFloat(cleanFinalPriceStr) || 0;
    const stock = parseInt(values[15]) || 0;
    
    // Traiter les catégories associées (colonne 10)
    const associatedCategoriesStr = values[10] || '';
    const associatedCategories = associatedCategoriesStr
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat && cat.length > 0);
    
    // Nettoyer les données (supprimer les caractères de contrôle UTF-16)
    const cleanName = name.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[^\w\s\-\.]/g, '').trim();
    const cleanCategory = category.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[^\w\s\-\.]/g, '').trim();
    const cleanId = id.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    const cleanReference = reference.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    const cleanEan13 = ean13.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    const cleanAssociatedCategories = associatedCategories
      .map(cat => cat.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[^\w\s\-\.]/g, '').trim())
      .filter(cat => cat && cat.length > 0);
    
    if (cleanName && cleanName !== 'Produit sans nom') {
      // Créer des déclinaisons basées sur les données disponibles
      const variations = [];
      
      // Vérifier s'il y a des données de déclinaison
      const variationId = (values[19] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const variationEan13 = (values[20] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const variationReference = (values[21] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const variationAttributes = (values[17] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      const variationPriceImpact = parseFloat((values[23] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(',', '.')) || 0;
      
      // Si on a des données de déclinaison, créer une déclinaison
      if (variationId && variationId.trim()) {
        const variation = {
          id: variationId,
          ean13: variationEan13,
          reference: variationReference,
          attributes: variationAttributes || 'Déclinaison',
          priceImpact: variationPriceImpact,
          finalPrice: finalPrice + variationPriceImpact
        };
        variations.push(variation);
      }
      
      // Si pas de déclinaison dans le CSV, créer des déclinaisons par défaut basées sur les catégories associées
      if (variations.length === 0 && cleanAssociatedCategories.length > 0) {
        // Créer une déclinaison pour chaque catégorie associée significative
        const significantCategories = cleanAssociatedCategories.filter(cat => 
          cat !== cleanCategory && 
          !cat.includes('VERRE') && 
          !cat.includes('Verres') &&
          cat.length > 2
        );
        
        significantCategories.slice(0, 3).forEach((cat, index) => {
          const variation = {
            id: `${cleanId}_var_${index + 1}`,
            ean13: `${cleanEan13}_${index + 1}`,
            reference: `${cleanReference}_${cat.substring(0, 3).toUpperCase()}`,
            attributes: cat,
            priceImpact: 0,
            finalPrice: finalPrice
          };
          variations.push(variation);
        });
      }
      
      const product = {
        id: cleanId,
        name: cleanName,
        reference: cleanReference,
        ean13: cleanEan13,
        category: cleanCategory,
        associatedCategories: cleanAssociatedCategories,
        wholesalePrice: wholesalePrice,
        finalPrice: finalPrice,
        crossedPrice: finalPrice,
        salesCount: 0,
        position: 0,
        remisable: true,
        variations: variations
      };
      
      products.push(product);
      categories.add(cleanCategory);
      cleanAssociatedCategories.forEach(cat => associatedCategoriesSet.add(cat));
    }
  } catch (error) {
    console.error(`Erreur ligne ${i}:`, error.message);
  }
}

console.log(`✅ Produits traités: ${products.length}`);
console.log(`✅ Catégories principales: ${categories.size}`);
console.log(`✅ Sous-catégories uniques: ${associatedCategoriesSet.size}`);

// Créer les catégories
const categoriesArray = Array.from(categories).map((catName, index) => ({
  id: `cat_${index + 1}`,
  name: catName,
  color: getRandomColor(),
  productOrder: []
}));

// Générer le fichier TypeScript
const outputContent = `// Données importées automatiquement depuis bdd complete v2.csv
// Généré le: ${new Date().toISOString()}
// Système: Import simple avec catégories associées

import { Product, Category } from '../types/Product';

export const products = ${JSON.stringify(products, null, 2)};

export const categories = ${JSON.stringify(categoriesArray, null, 2)};

const productionData = {
  products,
  categories
};

export default productionData;

// Fonctions pour charger et sauvegarder les données
export const loadProductionData = (): { products: Product[]; categories: Category[] } => {
  // Essayer de charger depuis localStorage d'abord
  try {
    const savedCategories = localStorage.getItem('klickCaisse_categories');
    const savedProducts = localStorage.getItem('klickCaisse_products');
    
    if (savedCategories && savedProducts) {
      const parsedCategories = JSON.parse(savedCategories);
      const parsedProducts = JSON.parse(savedProducts);
      console.log('✅ Données chargées depuis localStorage:', { 
        products: parsedProducts.length, 
        categories: parsedCategories.length 
      });
      return {
        products: parsedProducts,
        categories: parsedCategories
      };
    }
  } catch (error) {
    console.error('❌ Erreur lors du chargement depuis localStorage:', error);
  }

  // Fallback vers les données par défaut
  console.log('📦 Chargement des données par défaut (import simple)');
  return {
    products,
    categories
  };
};

export const saveProductionData = (newProducts: Product[], newCategories: Category[]): void => {
  // Sauvegarder dans localStorage pour persistance
  try {
    localStorage.setItem('klickCaisse_categories', JSON.stringify(newCategories));
    localStorage.setItem('klickCaisse_products', JSON.stringify(newProducts));
    console.log('✅ Données sauvegardées dans localStorage:', { 
      products: newProducts.length, 
      categories: newCategories.length 
    });
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};
`;

fs.writeFileSync('./src/data/productionData.ts', outputContent);

console.log('\n🎉 Import simple terminé avec succès !');
console.log(`📁 Fichier généré: ./src/data/productionData.ts`);
console.log(`📊 Total produits: ${products.length}`);
console.log(`🏷️  Total catégories: ${categoriesArray.length}`);
console.log(`🔗 Total sous-catégories: ${associatedCategoriesSet.size}`);

// Afficher quelques exemples
console.log('\n📋 Exemples de produits:');
products.slice(0, 3).forEach(product => {
  console.log(`   - ${product.name} (${product.category})`);
  if (product.associatedCategories.length > 0) {
    console.log(`     Sous-catégories: ${product.associatedCategories.join(', ')}`);
  }
});

console.log('\n📋 Exemples de sous-catégories:');
Array.from(associatedCategoriesSet).slice(0, 10).forEach(cat => {
  console.log(`   - ${cat}`);
});

function getRandomColor() {
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
    '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
} 