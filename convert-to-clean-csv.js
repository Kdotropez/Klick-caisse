const fs = require('fs');
const path = require('path');

// Fonction pour nettoyer et parser les prix
function parsePrice(priceStr) {
  if (!priceStr || priceStr.trim() === '') return 0;
  
  // Nettoyer la chaîne
  let clean = priceStr.toString().replace(/[^\d,.-]/g, '');
  
  // Remplacer la virgule par un point pour les décimaux
  clean = clean.replace(',', '.');
  
  const price = parseFloat(clean);
  return isNaN(price) ? 0 : Math.round(price * 100) / 100;
}

// Fonction pour extraire les catégories uniques
function extractCategories(csvData) {
  const categories = new Set();
  
  csvData.forEach(row => {
    if (row['Nom catégorie par défaut']) {
      categories.add(row['Nom catégorie par défaut'].trim());
    }
  });
  
  return Array.from(categories).sort();
}

// Fonction pour traiter les déclinaisons
function processVariations(csvData) {
  const products = new Map();
  
  csvData.forEach(row => {
    const productId = row['Identifiant produit'];
    const variationId = row['Identifiant déclinaison'];
    
    if (!products.has(productId)) {
      // Produit principal
      products.set(productId, {
        id: productId,
        nom: row['Nom'],
        reference: row['Référence'],
        image: row['Photo (couverture)'] || '',
        ean13: row['ean13'] || '',
        categorie: row['Nom catégorie par défaut'],
        prix_ht: parsePrice(row['Prix de vente HT']),
        prix_ttc: parsePrice(row['Prix de vente TTC final']),
        stock: parseInt(row['Quantité disponible à la vente']) || 0,
        remisable: true,
        variations: []
      });
    }
    
    // Ajouter la déclinaison si elle existe
    if (variationId && variationId.trim() !== '') {
      const product = products.get(productId);
      product.variations.push({
        id: variationId,
        nom: row['Liste des attributs'] || '',
        ean13: row['ean13 décl.'] || '',
        reference: row['Référence déclinaison'] || '',
        impact_prix_ht: parsePrice(row['Impact sur prix de vente (HT/TTC suivant PS version)']),
        impact_prix_ttc: parsePrice(row['Impact sur prix de vente TTC']),
        stock: parseInt(row['Quantité disponible à la vente']) || 0
      });
    }
  });
  
  return Array.from(products.values());
}

// Lire le fichier CSV original
console.log('📖 Lecture du fichier CSV original...');
const csvContent = fs.readFileSync('bdd complete v2.csv', 'utf8');
const lines = csvContent.split('\n');

// Parser les en-têtes
const headers = lines[0].split('\t');
console.log('📋 En-têtes détectés:', headers.length);

// Parser les données
const csvData = [];
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split('\t');
  const row = {};
  
  headers.forEach((header, index) => {
    row[header] = values[index] || '';
  });
  
  csvData.push(row);
}

console.log('🔍 Première ligne de données:', csvData[0]);

console.log(`📊 ${csvData.length} lignes de données parsées`);

// Extraire les catégories
const categories = extractCategories(csvData);
console.log('🏷️ Catégories trouvées:', categories);

// Traiter les produits et déclinaisons
const products = processVariations(csvData);
console.log(`🛍️ ${products.length} produits traités`);

// Créer le fichier CSV propre
let cleanCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable,declinaisons\n';

products.forEach(product => {
  const line = [
    product.id,
    `"${product.nom}"`,
    product.reference,
    product.image,
    product.ean13,
    product.categorie,
    product.prix_ht.toFixed(2),
    product.prix_ttc.toFixed(2),
    product.stock,
    product.remisable,
    product.variations.length > 0 ? 'true' : ''
  ].join(',');
  
  cleanCsv += line + '\n';
});

// Sauvegarder le fichier CSV propre
fs.writeFileSync('bdd-complete-clean.csv', cleanCsv, 'utf8');
console.log('✅ Fichier CSV propre créé: bdd-complete-clean.csv');

// Créer un fichier de catégories
const categoriesCsv = 'id,nom,color,productOrder\n';
categories.forEach((category, index) => {
  const colors = {
    'VERRE': '#2196F3',
    'VETEMENT': '#FF5722',
    'PACK VERRE': '#4CAF50',
    'POCHETTE': '#9C27B0',
    'BIERE BT': '#FF9800',
    'VASQUE ET SEAU': '#795548',
    'CONSOMABLE INTERNE BOUTIQUE': '#607D8B',
    'SAC': '#E91E63',
    'PORTE CLEF & BRACELET': '#00BCD4',
    'DECAPSULEUR': '#8BC34A',
    'BRADERIE': '#FFC107'
  };
  
  const line = [
    index + 1,
    `"${category}"`,
    colors[category] || '#757575',
    '[]'
  ].join(',');
  
  categoriesCsv += line + '\n';
});

fs.writeFileSync('categories-clean.csv', categoriesCsv, 'utf8');
console.log('✅ Fichier des catégories créé: categories-clean.csv');

// Statistiques
const productsWithVariations = products.filter(p => p.variations.length > 0);
console.log(`📈 Statistiques:`);
console.log(`   - Produits totaux: ${products.length}`);
console.log(`   - Produits avec déclinaisons: ${productsWithVariations.length}`);
console.log(`   - Catégories: ${categories.length}`);

// Aperçu des premiers produits
console.log('\n🔍 Aperçu des 5 premiers produits:');
products.slice(0, 5).forEach(product => {
  console.log(`   ${product.id}: ${product.nom} - ${product.prix_ttc}€ (${product.variations.length} déclinaisons)`);
}); 