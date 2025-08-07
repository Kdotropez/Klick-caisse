const fs = require('fs');
const path = require('path');

// Configuration du mapping CSV (avec gestion des accents)
const CSV_MAPPING = {
  // Colonnes obligatoires
  id: 'Identifiant produit',           // Clé unique pour identifier l'article
  name: 'Nom',                         // Nom du produit
  category: 'Nom catégorie par défaut', // Catégorie principale
  associatedCategories: 'Liste catégories associées (IDs)', // Sous-catégories
  finalPrice: 'Prix de vente TTC final', // Prix de vente
  ean13: 'ean13',                      // Code-barre
  reference: 'Référence',              // Référence fournisseur
  
  // Colonnes optionnelles
  wholesalePrice: 'Prix de vente HT',  // Prix d'achat
  stock: 'Quantité disponible à la vente', // Stock
  boutiqueId: 'Identifiant boutique'   // ID boutique
};

// Fonction pour lire le fichier CSV
function readCSVFile(filePath) {
  console.log(`📖 Lecture du fichier: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ Fichier non trouvé: ${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('❌ Fichier CSV vide ou invalide');
  }
  
  return lines;
}

// Fonction pour analyser les en-têtes CSV
function analyzeHeaders(headers) {
  console.log('🔍 Analyse des en-têtes CSV...');
  
  const mapping = {};
  const missingColumns = [];
  
  // Vérifier chaque colonne requise avec gestion des accents
  for (const [key, expectedHeader] of Object.entries(CSV_MAPPING)) {
    // Recherche flexible avec gestion des accents et caractères spéciaux
    const index = headers.findIndex(h => {
      const cleanHeader = h.trim().replace(/[^\w\s]/g, '').toLowerCase();
      const cleanExpected = expectedHeader.replace(/[^\w\s]/g, '').toLowerCase();
      return cleanHeader.includes(cleanExpected) || cleanExpected.includes(cleanHeader);
    });
    
    if (index !== -1) {
      mapping[key] = index;
      console.log(`✅ ${key}: colonne ${index} ("${headers[index]}")`);
    } else {
      missingColumns.push(expectedHeader);
      console.log(`❌ ${key}: colonne manquante ("${expectedHeader}")`);
    }
  }
  
  if (missingColumns.length > 0) {
    console.warn('⚠️  Colonnes manquantes:', missingColumns);
  }
  
  return mapping;
}

// Fonction pour traiter une ligne CSV
function processCSVRow(values, mapping, rowIndex) {
  try {
    // Extraire les valeurs de base
    const id = values[mapping.id] || `prod_${rowIndex}`;
    const name = values[mapping.name] || 'Produit sans nom';
    const category = values[mapping.category] || 'Général';
    const finalPrice = parseFloat(values[mapping.finalPrice]) || 0;
    const ean13 = values[mapping.ean13] || '';
    const reference = values[mapping.reference] || '';
    
    // Traiter les catégories associées
    const associatedCategoriesStr = values[mapping.associatedCategories] || '';
    const associatedCategories = associatedCategoriesStr
      .split(',')
      .map(cat => cat.trim())
      .filter(cat => cat && cat.length > 0);
    
    // Valeurs optionnelles
    const wholesalePrice = mapping.wholesalePrice !== undefined ? 
      parseFloat(values[mapping.wholesalePrice]) || finalPrice * 0.8 : 
      finalPrice * 0.8;
    
    const stock = mapping.stock !== undefined ? 
      parseInt(values[mapping.stock]) || 0 : 
      0;
    
    return {
      id,
      name,
      reference,
      ean13,
      category,
      associatedCategories,
      wholesalePrice,
      finalPrice,
      crossedPrice: finalPrice, // Par défaut égal au prix final
      stock,
      remisable: true, // Par défaut remisable
      variations: [] // Pas de variations par défaut
    };
  } catch (error) {
    console.error(`❌ Erreur ligne ${rowIndex}:`, error.message);
    return null;
  }
}

// Fonction pour fusionner avec les données existantes
function mergeWithExistingData(newProducts, existingProductsPath) {
  console.log('🔄 Fusion avec les données existantes...');
  
  let existingProducts = [];
  let existingCategories = [];
  
  // Charger les données existantes si elles existent
  if (fs.existsSync(existingProductsPath)) {
    try {
      const existingData = require(existingProductsPath);
      existingProducts = existingData.products || [];
      existingCategories = existingData.categories || [];
      console.log(`📦 Données existantes chargées: ${existingProducts.length} produits, ${existingCategories.length} catégories`);
    } catch (error) {
      console.warn('⚠️  Erreur lors du chargement des données existantes:', error.message);
    }
  }
  
  // Créer un map des produits existants par ID
  const existingProductsMap = new Map();
  existingProducts.forEach(product => {
    existingProductsMap.set(product.id, product);
  });
  
  // Statistiques
  let updatedCount = 0;
  let newCount = 0;
  let unchangedCount = 0;
  
  // Traiter chaque nouveau produit
  const mergedProducts = newProducts.map(newProduct => {
    const existingProduct = existingProductsMap.get(newProduct.id);
    
    if (existingProduct) {
      // Produit existant - fusionner les données
      const mergedProduct = {
        ...existingProduct, // Garder toutes les données existantes
        // Mettre à jour les données de base
        name: newProduct.name,
        reference: newProduct.reference,
        ean13: newProduct.ean13,
        category: newProduct.category,
        associatedCategories: newProduct.associatedCategories,
        wholesalePrice: newProduct.wholesalePrice,
        finalPrice: newProduct.finalPrice,
        crossedPrice: newProduct.crossedPrice,
        stock: newProduct.stock,
        remisable: newProduct.remisable
        // Préserver: salesCount, position, variations
      };
      
      updatedCount++;
      return mergedProduct;
    } else {
      // Nouveau produit
      const newProductWithDefaults = {
        ...newProduct,
        salesCount: 0, // Nouveau produit
        position: 0,   // Position par défaut
        variations: [] // Pas de variations
      };
      
      newCount++;
      return newProductWithDefaults;
    }
  });
  
  // Ajouter les produits existants qui ne sont plus dans le CSV
  existingProducts.forEach(existingProduct => {
    const stillExists = newProducts.some(newProduct => newProduct.id === existingProduct.id);
    if (!stillExists) {
      mergedProducts.push(existingProduct);
      unchangedCount++;
    }
  });
  
  console.log(`📊 Statistiques de fusion:`);
  console.log(`   - Produits mis à jour: ${updatedCount}`);
  console.log(`   - Nouveaux produits: ${newCount}`);
  console.log(`   - Produits inchangés: ${unchangedCount}`);
  console.log(`   - Total final: ${mergedProducts.length}`);
  
  return mergedProducts;
}

// Fonction pour générer les catégories
function generateCategories(products) {
  console.log('🏷️  Génération des catégories...');
  
  const categoriesSet = new Set();
  const associatedCategoriesSet = new Set();
  
  // Collecter toutes les catégories
  products.forEach(product => {
    if (product.category) {
      categoriesSet.add(product.category);
    }
    if (product.associatedCategories) {
      product.associatedCategories.forEach(cat => associatedCategoriesSet.add(cat));
    }
  });
  
  // Créer les catégories principales
  const categories = Array.from(categoriesSet).map((catName, index) => ({
    id: `cat_${index + 1}`,
    name: catName,
    color: getRandomColor(),
    productOrder: []
  }));
  
  console.log(`   - Catégories principales: ${categories.length}`);
  console.log(`   - Sous-catégories uniques: ${associatedCategoriesSet.size}`);
  console.log(`   - Exemples de sous-catégories:`, Array.from(associatedCategoriesSet).slice(0, 5));
  
  return categories;
}

// Fonction pour générer le fichier TypeScript
function generateTypeScriptFile(products, categories, outputPath) {
  console.log(`📝 Génération du fichier TypeScript: ${outputPath}`);
  
  const outputContent = `// Données importées automatiquement avec système de fusion intelligent
// Généré le: ${new Date().toISOString()}
// Système: Import intelligent - préservation des données existantes

import { Product, Category } from '../types/Product';

export const products = ${JSON.stringify(products, null, 2)};

export const categories = ${JSON.stringify(categories, null, 2)};

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
  console.log('📦 Chargement des données par défaut (import intelligent)');
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

  fs.writeFileSync(outputPath, outputContent);
  console.log('✅ Fichier TypeScript généré avec succès');
}

// Fonction utilitaire pour les couleurs
function getRandomColor() {
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
    '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Fonction principale
function main() {
  try {
    console.log('🚀 Démarrage de l\'import intelligent...\n');
    
    // Configuration
    const csvFilePath = 'bdd complete v2.csv';
    const existingDataPath = './src/data/productionData.ts';
    const outputPath = './src/data/productionData-intelligent.ts';
    
    // 1. Lire le fichier CSV
    const lines = readCSVFile(csvFilePath);
    
      // 2. Analyser les en-têtes (gestion du BOM UTF-8)
  const firstLine = lines[0];
  const cleanFirstLine = firstLine.replace(/^\uFEFF/, ''); // Supprimer le BOM UTF-8
  const headers = cleanFirstLine.split('\t').map(h => h.trim());
  const mapping = analyzeHeaders(headers);
    
    // 3. Traiter les données
    console.log('\n📊 Traitement des données...');
    const newProducts = [];
    const categoriesSet = new Set();
    const associatedCategoriesSet = new Set();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = line.replace(/^\uFEFF/, ''); // Supprimer le BOM UTF-8 si présent
      const values = cleanLine.split('\t');
      if (values.length < headers.length) continue;
      
      const product = processCSVRow(values, mapping, i);
      if (product) {
        newProducts.push(product);
        categoriesSet.add(product.category);
        product.associatedCategories.forEach(cat => associatedCategoriesSet.add(cat));
      }
    }
    
    console.log(`   - Produits traités: ${newProducts.length}`);
    console.log(`   - Catégories principales: ${categoriesSet.size}`);
    console.log(`   - Sous-catégories uniques: ${associatedCategoriesSet.size}`);
    
    // 4. Fusionner avec les données existantes
    const mergedProducts = mergeWithExistingData(newProducts, existingDataPath);
    
    // 5. Générer les catégories
    const categories = generateCategories(mergedProducts);
    
    // 6. Générer le fichier TypeScript
    generateTypeScriptFile(mergedProducts, categories, outputPath);
    
    console.log('\n🎉 Import intelligent terminé avec succès !');
    console.log(`📁 Fichier généré: ${outputPath}`);
    console.log(`📊 Total produits: ${mergedProducts.length}`);
    console.log(`🏷️  Total catégories: ${categories.length}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  readCSVFile,
  analyzeHeaders,
  processCSVRow,
  mergeWithExistingData,
  generateCategories,
  generateTypeScriptFile
}; 