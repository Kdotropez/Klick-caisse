const fs = require('fs');
const path = require('path');

// Fonction pour lire et parser le fichier CSV UTF-16
function parseUTF16CSV(filePath) {
  // Lire le fichier en tant que buffer pour détecter l'encodage
  const buffer = fs.readFileSync(filePath);
  
  // Détecter l'encodage (UTF-16 LE avec BOM)
  let content;
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    // UTF-16 LE
    content = buffer.toString('utf16le');
  } else if (buffer[0] === 0xFE && buffer[1] === 0xFF) {
    // UTF-16 BE
    content = buffer.toString('utf16be');
  } else {
    // Essayer UTF-8
    content = buffer.toString('utf8');
  }
  
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Fichier CSV vide');
  }
  
  // Première ligne = headers
  const headers = lines[0].split('\t').map(h => h.trim());
  const data = [];
  
  // Lignes de données
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return { headers, data };
}

// Fonction pour grouper les produits et leurs déclinaisons
function groupProductsWithVariations(data) {
  const productsMap = new Map();
  
  data.forEach(row => {
    const productId = row['Identifiant produit'];
    const variationId = row['Identifiant déclinaison'];
    
    if (!productsMap.has(productId)) {
      // Créer le produit principal
      productsMap.set(productId, {
        id: productId,
        name: row['Nom'],
        category: row['Nom catégorie par défaut'],
        ean13: row['ean13'],
        reference: row['Référence'],
        wholesalePrice: parseFloat(row['wholesale_price'] || row['Prix de vente HT'] || '0'),
        finalPrice: parseFloat(row['Prix de vente TTC final'] || row['Prix de vente TTC avant remises'] || '0'),
        crossedPrice: parseFloat(row['Prix barré TTC'] || '0'),
        salesCount: 0,
        position: parseInt(productId) || 1,
        variations: []
      });
    }
    
    // Ajouter la déclinaison si elle existe
    if (variationId && variationId.trim()) {
      const product = productsMap.get(productId);
      product.variations.push({
        id: variationId,
        ean13: row['ean13 décl.'] || '',
        reference: row['Référence déclinaison'] || '',
        attributes: row['Liste des attributs'] || '',
        priceImpact: parseFloat(row['Impact sur prix de vente TTC'] || '0'),
        finalPrice: parseFloat(row['Prix de vente TTC final'] || row['Prix de vente TTC avant remises'] || '0')
      });
    }
  });
  
  return Array.from(productsMap.values());
}

// Fonction pour convertir les données CSV en format TypeScript
function convertToTypeScript(csvData) {
  const { headers, data } = csvData;
  
  console.log('Headers détectés:', headers);
  
  // Grouper les produits avec leurs déclinaisons
  const productsWithVariations = groupProductsWithVariations(data);
  
  // Générer les catégories uniques
  const categories = [...new Set(productsWithVariations.map(p => p.category))].filter(Boolean);
  console.log('Catégories trouvées:', categories);
  console.log(`Produits avec déclinaisons: ${productsWithVariations.filter(p => p.variations.length > 0).length}`);
  
  // Générer le code TypeScript pour les catégories
  const categoriesCode = categories.map((cat, index) => `  {
    id: '${cat.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}',
    name: '${cat}',
    color: '#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}',
    productOrder: []
  }`).join(',\n');
  
  // Générer le code TypeScript pour les produits
  const productsCode = productsWithVariations.map((product, index) => {
    const variationsCode = product.variations.map(variation => `    {
      id: '${variation.id}',
      ean13: '${variation.ean13}',
      reference: '${variation.reference}',
      attributes: '${variation.attributes}',
      priceImpact: ${variation.priceImpact},
      finalPrice: ${variation.finalPrice}
    }`).join(',\n');
    
    return `  {
    id: '${product.id}',
    name: '${product.name.replace(/'/g, "\\'")}',
    category: '${product.category.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}',
    ean13: '${product.ean13}',
    reference: '${product.reference}',
    wholesalePrice: ${product.wholesalePrice},
    finalPrice: ${product.finalPrice},
    crossedPrice: ${product.crossedPrice},
    salesCount: ${product.salesCount},
    position: ${product.position},
    variations: [
${variationsCode}
    ]
  }`;
  }).join(',\n');
  
  return `import { Product, Category } from '../types/Product';

// Catégories générées automatiquement
export const defaultCategories: Category[] = [
${categoriesCode}
];

// Produits générés automatiquement depuis votre CSV (avec déclinaisons)
export const defaultProducts: Product[] = [
${productsCode}
];

// Fonction pour obtenir les données de production
export const getProductionData = () => {
  return {
    products: defaultProducts,
    categories: defaultCategories
  };
};

// Fonction pour sauvegarder les modifications
export const saveProductionData = (products: Product[], categories: Category[]) => {
  localStorage.setItem('klick-caisse-products', JSON.stringify(products));
  localStorage.setItem('klick-caisse-categories', JSON.stringify(categories));
};

// Fonction pour charger les données sauvegardées ou utiliser les données par défaut
export const loadProductionData = () => {
  const savedProducts = localStorage.getItem('klick-caisse-products');
  const savedCategories = localStorage.getItem('klick-caisse-categories');
  
  if (savedProducts && savedCategories) {
    return {
      products: JSON.parse(savedProducts),
      categories: JSON.parse(savedCategories)
    };
  }
  
  // Première utilisation - sauvegarder les données par défaut
  saveProductionData(defaultProducts, defaultCategories);
  return {
    products: defaultProducts,
    categories: defaultCategories
  };
};`;
}

// Fonction principale
function main() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.log('Usage: node convertWithVariations.js <chemin-vers-fichier-csv>');
    console.log('Exemple: node convertWithVariations.js "./bdd complete v2.csv"');
    return;
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Erreur: Le fichier ${csvFilePath} n'existe pas`);
    return;
  }
  
  try {
    console.log(`Lecture du fichier CSV: ${csvFilePath}`);
    const csvData = parseUTF16CSV(csvFilePath);
    
    console.log(`Trouvé ${csvData.data.length} lignes de données`);
    
    const typescriptCode = convertToTypeScript(csvData);
    
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'productionData.ts');
    fs.writeFileSync(outputPath, typescriptCode, 'utf-8');
    
    console.log(`✅ Fichier généré avec succès: ${outputPath}`);
    console.log('📝 Vos vraies données avec déclinaisons sont maintenant intégrées dans l\'application');
    
  } catch (error) {
    console.error('Erreur lors de la conversion:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { parseUTF16CSV, groupProductsWithVariations, convertToTypeScript }; 