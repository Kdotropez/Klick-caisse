const fs = require('fs');
const path = require('path');

// Fonction pour lire et parser un fichier CSV
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
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

// Fonction pour convertir les données CSV en format TypeScript
function convertToTypeScript(csvData) {
  const { headers, data } = csvData;
  
  // Générer les catégories uniques
  const categories = [...new Set(data.map(row => row['Nom catégorie par défaut'] || row.category || row.Category || row.CATEGORY))].filter(Boolean);
  
  // Générer le code TypeScript pour les catégories
  const categoriesCode = categories.map((cat, index) => `  {
    id: '${cat.toLowerCase().replace(/\s+/g, '-')}',
    name: '${cat}',
    color: '#${Math.floor(Math.random()*16777215).toString(16)}',
    productOrder: []
  }`).join(',\n');
  
  // Générer le code TypeScript pour les produits
  const productsCode = data.map((row, index) => {
    const id = row['Identifiant produit'] || row.id || row.ID || (index + 1).toString();
    const name = row['Nom'] || row.name || row.Name || row.NAME || row.product || row.Product || row.PRODUCT || 'Produit ' + id;
    const category = row['Nom catégorie par défaut'] || row.category || row.Category || row.CATEGORY || 'default';
    const price = parseFloat(row['Prix de vente TTC final'] || row['Prix de vente TTC avant remises'] || row.price || row.Price || row.PRICE || row.prix || row.Prix || row.PRIX || '0');
    const ean13 = row['ean13'] || row.ean13 || row.EAN13 || row.barcode || row.Barcode || row.BARCODE || '';
    const reference = row['Référence'] || row.reference || row.REF || 'REF' + id;
    const wholesalePrice = parseFloat(row['wholesale_price'] || row['Prix de vente HT'] || '0');
    
    return `  {
    id: '${id}',
    name: '${name.replace(/'/g, "\\'")}',
    category: '${category.toLowerCase().replace(/\s+/g, '-')}',
    ean13: '${ean13}',
    reference: '${reference}',
    wholesalePrice: ${wholesalePrice},
    finalPrice: ${price},
    crossedPrice: ${price * 1.1},
    salesCount: 0,
    position: ${index + 1},
    variations: []
  }`;
  }).join(',\n');
  
  return `import { Product, Category } from '../types/Product';

// Catégories générées automatiquement
export const defaultCategories: Category[] = [
${categoriesCode}
];

// Produits générés automatiquement depuis votre CSV
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
    console.log('Usage: node convertCSVToData.js <chemin-vers-fichier-csv>');
    console.log('Exemple: node convertCSVToData.js ./mes-produits.csv');
    return;
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Erreur: Le fichier ${csvFilePath} n'existe pas`);
    return;
  }
  
  try {
    console.log(`Lecture du fichier CSV: ${csvFilePath}`);
    const csvData = parseCSV(csvFilePath);
    
    console.log(`Trouvé ${csvData.data.length} produits et ${new Set(csvData.data.map(row => row.category || row.Category || row.CATEGORY)).size} catégories`);
    
    const typescriptCode = convertToTypeScript(csvData);
    
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'productionData.ts');
    fs.writeFileSync(outputPath, typescriptCode, 'utf-8');
    
    console.log(`✅ Fichier généré avec succès: ${outputPath}`);
    console.log('📝 Vous pouvez maintenant remplacer le contenu de src/data/productionData.ts par ce nouveau fichier');
    
  } catch (error) {
    console.error('Erreur lors de la conversion:', error.message);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { parseCSV, convertToTypeScript }; 