const fs = require('fs');
const path = require('path');

// Configuration du mapping CSV
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

// Fonction pour nettoyer l'encodage
function cleanEncoding(text) {
  if (!text) return '';
  
  // Supprimer les caractères UTF-16 et autres caractères spéciaux
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caractères de contrôle
    .replace(/[\uFEFF\uFFFE]/g, '') // BOM UTF-8/UTF-16
    .replace(/[\u00C0-\u00FF]/g, char => {
      // Convertir les caractères accentués UTF-16 vers UTF-8
      const accents = {
        '\u00C0': 'À', '\u00C1': 'Á', '\u00C2': 'Â', '\u00C3': 'Ã', '\u00C4': 'Ä', '\u00C5': 'Å',
        '\u00C6': 'Æ', '\u00C7': 'Ç', '\u00C8': 'È', '\u00C9': 'É', '\u00CA': 'Ê', '\u00CB': 'Ë',
        '\u00CC': 'Ì', '\u00CD': 'Í', '\u00CE': 'Î', '\u00CF': 'Ï', '\u00D0': 'Ð', '\u00D1': 'Ñ',
        '\u00D2': 'Ò', '\u00D3': 'Ó', '\u00D4': 'Ô', '\u00D5': 'Õ', '\u00D6': 'Ö', '\u00D7': '×',
        '\u00D8': 'Ø', '\u00D9': 'Ù', '\u00DA': 'Ú', '\u00DB': 'Û', '\u00DC': 'Ü', '\u00DD': 'Ý',
        '\u00DE': 'Þ', '\u00DF': 'ß', '\u00E0': 'à', '\u00E1': 'á', '\u00E2': 'â', '\u00E3': 'ã',
        '\u00E4': 'ä', '\u00E5': 'å', '\u00E6': 'æ', '\u00E7': 'ç', '\u00E8': 'è', '\u00E9': 'é',
        '\u00EA': 'ê', '\u00EB': 'ë', '\u00EC': 'ì', '\u00ED': 'í', '\u00EE': 'î', '\u00EF': 'ï',
        '\u00F0': 'ð', '\u00F1': 'ñ', '\u00F2': 'ò', '\u00F3': 'ó', '\u00F4': 'ô', '\u00F5': 'õ',
        '\u00F6': 'ö', '\u00F7': '÷', '\u00F8': 'ø', '\u00F9': 'ù', '\u00FA': 'ú', '\u00FB': 'û',
        '\u00FC': 'ü', '\u00FD': 'ý', '\u00FE': 'þ', '\u00FF': 'ÿ'
      };
      return accents[char] || char;
    })
    .trim();
}

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
      const cleanHeader = cleanEncoding(h).replace(/[^\w\s]/g, '').toLowerCase();
      const cleanExpected = expectedHeader.replace(/[^\w\s]/g, '').toLowerCase();
      return cleanHeader.includes(cleanExpected) || cleanExpected.includes(cleanHeader);
    });
    
    if (index !== -1) {
      mapping[key] = index;
      console.log(`✅ ${key}: colonne ${index} ("${cleanEncoding(headers[index])}")`);
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
    // Extraire et nettoyer les valeurs de base
    const id = cleanEncoding(values[mapping.id]) || `prod_${rowIndex}`;
    const name = cleanEncoding(values[mapping.name]) || 'Produit sans nom';
    const category = cleanEncoding(values[mapping.category]) || 'Général';
    const finalPrice = parseFloat(cleanEncoding(values[mapping.finalPrice])) || 0;
    const ean13 = cleanEncoding(values[mapping.ean13]) || '';
    const reference = cleanEncoding(values[mapping.reference]) || '';
    
    // Traiter les catégories associées
    const associatedCategoriesStr = cleanEncoding(values[mapping.associatedCategories]) || '';
    const associatedCategories = associatedCategoriesStr
      .split(',')
      .map(cat => cleanEncoding(cat))
      .filter(cat => cat && cat.length > 0);
    
    // Valeurs optionnelles
    const wholesalePrice = mapping.wholesalePrice !== undefined ? 
      parseFloat(cleanEncoding(values[mapping.wholesalePrice])) || finalPrice * 0.8 : 
      finalPrice * 0.8;
    
    const stock = mapping.stock !== undefined ? 
      parseInt(cleanEncoding(values[mapping.stock])) || 0 : 
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
// Source: bdd complete v2.csv

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
    console.log('🚀 Démarrage de l\'import intelligent final...\n');
    
    // Configuration
    const csvFilePath = 'bdd complete v2.csv';
    const existingDataPath = './src/data/productionData.ts';
    const outputPath = './src/data/productionData.ts'; // Remplacer le fichier existant
    
    // 1. Lire le fichier CSV
    const lines = readCSVFile(csvFilePath);
    
    // 2. Analyser les en-têtes (gestion du BOM UTF-8)
    const firstLine = lines[0];
    const cleanFirstLine = cleanEncoding(firstLine);
    const headers = cleanFirstLine.split('\t').map(h => h.trim());
    const mapping = analyzeHeaders(headers);
    
    // 3. Traiter les données
    console.log('\n📊 Traitement des données...');
    const newProducts = [];
    const categoriesSet = new Set();
    const associatedCategoriesSet = new Set();
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = cleanEncoding(line);
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
    console.log('\n💡 Système d\'import intelligent configuré !');
    console.log('   - Les articles sont identifiés par leur "Identifiant produit"');
    console.log('   - Les données existantes sont préservées (ventes, position, etc.)');
    console.log('   - Les nouveaux articles sont ajoutés automatiquement');
    console.log('   - Les prix et informations sont mis à jour');
    
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
  generateTypeScriptFile,
  cleanEncoding
}; 