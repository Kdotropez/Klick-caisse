const fs = require('fs');
const path = require('path');

// Lire le fichier CSV avec encodage UTF-8
const csvContent = fs.readFileSync('bdd complete v2.csv', { encoding: 'utf8', flag: 'r' });
const lines = csvContent.split('\n');

// En-têtes (première ligne)
const headers = lines[0].split('\t');

// Fonction pour nettoyer et convertir les prix
const parsePrice = (priceStr) => {
  if (!priceStr || priceStr.trim() === '') return 0;
  
  // Nettoyer complètement la chaîne
  let cleanStr = priceStr.trim();
  
  // Supprimer tous les caractères non numériques sauf virgule et point
  cleanStr = cleanStr.replace(/[^\d,.-]/g, '');
  
  // Remplacer la virgule par un point
  cleanStr = cleanStr.replace(',', '.');
  
  // Conversion manuelle
  const parts = cleanStr.split('.');
  if (parts.length === 1) {
    return parseInt(parts[0]) || 0;
  } else {
    const integerPart = parseInt(parts[0]) || 0;
    const decimalPart = parseInt(parts[1]) || 0;
    return integerPart + (decimalPart / Math.pow(10, parts[1].length));
  }
};

// Fonction pour nettoyer les chaînes
const cleanString = (str) => {
  if (!str) return '';
  // Supprimer les caractères null et autres caractères problématiques
  let cleaned = str.trim().replace(/"/g, '').replace(/\u0000/g, '');
  // Supprimer les espaces multiples
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
};

// Traiter les lignes de données
const products = [];
const categories = new Map();

lines.slice(1).forEach((line, index) => {
  if (!line.trim()) return;
  
  const values = line.split('\t');
  
  // S'assurer qu'on a assez de colonnes
  if (values.length < 25) {
    console.log(`Ligne ${index + 2} ignorée: pas assez de colonnes (${values.length})`);
    return;
  }

  const productId = cleanString(values[2]); // Identifiant produit
  const name = cleanString(values[1]); // Nom
  const reference = cleanString(values[3]); // Référence
  const ean13 = cleanString(values[5]); // ean13
  const categoryName = cleanString(values[7]); // Nom catégorie par défaut
  const wholesalePrice = parsePrice(values[8]); // wholesale_price
  const finalPrice = parsePrice(values[14]); // Prix de vente TTC final (colonne 15)
  const crossedPrice = parsePrice(values[13]); // Prix barré TTC (colonne 14)

  // Créer la catégorie si elle n'existe pas
  if (!categories.has(categoryName)) {
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-');
    categories.set(categoryName, {
      id: categoryId,
      name: categoryName,
      color: '#' + Math.floor(Math.random()*16777215).toString(16), // Couleur aléatoire
      productOrder: []
    });
  }

  // Créer le produit
  const product = {
    id: productId,
    name: name,
    ean13: ean13,
    reference: reference,
    category: categoryName,
    wholesalePrice: wholesalePrice,
    finalPrice: finalPrice,
    crossedPrice: crossedPrice,
    salesCount: 0,
    position: parseInt(productId) || index + 1,
    remisable: true,
    variations: []
  };

  // Ajouter le produit à sa catégorie
  const category = categories.get(categoryName);
  if (category) {
    category.productOrder.push(productId);
  }

  products.push(product);
});

// Convertir les catégories en array
const categoriesArray = Array.from(categories.values());

// Créer le contenu du fichier TypeScript
const outputContent = `// Données importées depuis bdd complete v2.csv
// Import effectué le ${new Date().toLocaleString('fr-FR')}

import { Product, Category } from '../types/Product';

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export const categories: Category[] = ${JSON.stringify(categoriesArray, null, 2)};

export const getProductionData = () => {
  return { products, categories };
};

export const saveProductionData = (products: Product[], categories: Category[]) => {
  // Cette fonction peut être implémentée plus tard pour sauvegarder les données
  console.log('Sauvegarde des données...');
};

export const loadProductionData = () => {
  return { products, categories };
};
`;

// Écrire le fichier
fs.writeFileSync('src/data/productionData.ts', outputContent, 'utf8');

console.log(`\nImport terminé !`);
console.log(`- ${products.length} produits importés`);
console.log(`- ${categoriesArray.length} catégories créées`);
console.log(`- Fichier sauvegardé dans src/data/productionData.ts`);

// Afficher quelques exemples de prix pour vérification
console.log('\nExemples de prix importés :');
products.slice(0, 5).forEach(product => {
  console.log(`${product.name}: ${product.finalPrice}€`);
}); 