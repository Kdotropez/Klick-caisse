const fs = require('fs');
const path = require('path');

// Lire le fichier CSV avec les catégories associées
const csvContent = fs.readFileSync('bdd complete v2.csv', 'utf8');
const lines = csvContent.split('\n');

// Extraire les en-têtes (le fichier utilise des tabulations)
const headers = lines[0].split('\t').map(h => h.trim());

// Trouver les indices des colonnes importantes
const nameIndex = headers.findIndex(h => h === 'Nom');
const categoryIndex = headers.findIndex(h => h === 'Nom catégorie par défaut');
const associatedCategoriesIndex = headers.findIndex(h => h === 'Liste catégories associées (IDs)');
const priceIndex = headers.findIndex(h => h === 'Prix de vente TTC final');
const eanIndex = headers.findIndex(h => h === 'ean13');
const referenceIndex = headers.findIndex(h => h === 'Référence');
const idIndex = headers.findIndex(h => h === 'Identifiant produit');

console.log('Colonnes trouvées:');
console.log('- Nom:', nameIndex);
console.log('- Catégorie:', categoryIndex);
console.log('- Catégories associées:', associatedCategoriesIndex);
console.log('- Prix:', priceIndex);
console.log('- EAN:', eanIndex);
console.log('- Référence:', referenceIndex);
console.log('- ID:', idIndex);

// Traiter les données
const products = [];
const categories = new Set();
const associatedCategoriesSet = new Set();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const values = line.split('\t');
  if (values.length < headers.length) continue;

  const name = values[nameIndex] || 'Produit sans nom';
  const category = values[categoryIndex] || 'Général';
  const associatedCategoriesStr = values[associatedCategoriesIndex] || '';
  const price = parseFloat(values[priceIndex]) || 0;
  const ean = values[eanIndex] || '';
  const reference = values[referenceIndex] || '';
  const id = values[idIndex] || `prod_${i}`;

  // Traiter les catégories associées
  const associatedCategories = associatedCategoriesStr
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat && cat.length > 0);

  // Ajouter aux sets pour les statistiques
  categories.add(category);
  associatedCategories.forEach(cat => associatedCategoriesSet.add(cat));

  products.push({
    id: id,
    name: name,
    reference: reference,
    ean13: ean,
    category: category,
    associatedCategories: associatedCategories,
    wholesalePrice: price * 0.8, // Estimation du prix d'achat
    finalPrice: price,
    crossedPrice: price,
    salesCount: 0,
    position: 0,
    remisable: true,
    variations: []
  });
}

// Créer les catégories
const categoriesArray = Array.from(categories).map((cat, index) => ({
  id: `cat_${index + 1}`,
  name: cat,
  color: getRandomColor(),
  productOrder: []
}));

// Statistiques
console.log('\nStatistiques:');
console.log('- Produits importés:', products.length);
console.log('- Catégories principales:', categories.size);
console.log('- Catégories associées uniques:', associatedCategoriesSet.size);
console.log('- Exemples de catégories associées:', Array.from(associatedCategoriesSet).slice(0, 10));

// Générer le fichier de données
const outputContent = `// Données importées automatiquement depuis bdd complete v2.csv avec catégories associées
// Généré le: ${new Date().toISOString()}

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
  console.log('📦 Chargement des données par défaut');
  
  // Créer un map pour convertir les IDs de catégorie en noms
  const categoryMap = new Map<string, string>();
  categories.forEach(cat => {
    categoryMap.set(cat.id, cat.name);
  });

  // Mapper les données importées vers l'interface Product
  const mappedProducts: Product[] = products.map(product => {
    // Convertir l'ID de catégorie en nom de catégorie
    const categoryName = categoryMap.get(product.category) || product.category;
    
    return {
      id: product.id,
      name: product.name,
      ean13: product.ean13,
      reference: product.reference,
      category: categoryName, // Utiliser le nom de la catégorie au lieu de l'ID
      associatedCategories: product.associatedCategories || [], // Catégories associées
      wholesalePrice: product.wholesalePrice,
      finalPrice: product.finalPrice,
      crossedPrice: product.crossedPrice,
      salesCount: product.salesCount,
      position: product.position,
      remisable: product.remisable,
      variations: product.variations
    };
  });

  return {
    products: mappedProducts,
    categories: categories as Category[]
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

// Écrire le fichier
fs.writeFileSync('src/data/productionData-with-associated-categories.ts', outputContent);

console.log('\n✅ Fichier généré: src/data/productionData-with-associated-categories.ts');

function getRandomColor() {
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
    '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
} 