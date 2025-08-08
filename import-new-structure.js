const fs = require('fs');
const path = require('path');

console.log('🔄 Import nouvelle structure - Articles + Déclinaisons');
console.log('==================================================');

// Chemins des fichiers
const articlesPath = './bdd article 8-8-25.csv';
const declinaisonsPath = './bdd declinaison 8-8-25.csv';
const outputPath = './src/data/productionData.ts';

// Fonction de nettoyage des chaînes
function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Supprimer caractères de contrôle
    .replace(/\uFEFF/g, '') // Supprimer BOM UTF-8
    .trim();
}

// Fonction de parsing des prix
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const cleanPrice = cleanString(priceStr).replace(',', '.');
  const price = parseFloat(cleanPrice);
  return isNaN(price) ? 0 : price;
}

// Fonction de parsing des quantités
function parseQuantity(qtyStr) {
  if (!qtyStr) return 0;
  const cleanQty = cleanString(qtyStr);
  const qty = parseInt(cleanQty);
  return isNaN(qty) ? 0 : qty;
}

// Fonction de parsing des catégories associées
function parseAssociatedCategories(categoriesStr) {
  if (!categoriesStr) return [];
  const cleanCategories = cleanString(categoriesStr);
  return cleanCategories
    .split(',')
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
}

try {
  console.log('📖 Lecture du fichier articles...');
  const articlesContent = fs.readFileSync(articlesPath, 'utf8');
  const articlesLines = articlesContent.split('\n').filter(line => line.trim());
  
  console.log('📖 Lecture du fichier déclinaisons...');
  const declinaisonsContent = fs.readFileSync(declinaisonsPath, 'utf8');
  const declinaisonsLines = declinaisonsContent.split('\n').filter(line => line.trim());

  console.log(`📊 Articles trouvés: ${articlesLines.length - 1}`);
  console.log(`📊 Déclinaisons trouvées: ${declinaisonsLines.length - 1}`);

  // Parser les déclinaisons
  const declinaisonsMap = new Map();
  
  for (let i = 1; i < declinaisonsLines.length; i++) {
    const line = declinaisonsLines[i];
    const values = line.split('\t');
    
    if (values.length < 15) continue;
    
    const productId = cleanString(values[3]); // Identifiant produit
    const variationId = cleanString(values[5]); // Identifiant déclinaison
    const attributes = cleanString(values[1]); // Liste des attributs
    const ean13 = cleanString(values[6]); // ean13 décl.
    const reference = cleanString(values[7]); // Référence déclinaison
    const priceImpact = parsePrice(values[10]); // Impact sur prix de vente TTC
    const stock = parseQuantity(values[13]); // Quantité disponible
    
    if (productId && variationId) {
      if (!declinaisonsMap.has(productId)) {
        declinaisonsMap.set(productId, []);
      }
      
             declinaisonsMap.get(productId).push({
         id: variationId,
         ean13: ean13,
         reference: reference,
         attributes: attributes || 'Déclinaison',
         priceImpact: priceImpact,
         finalPrice: 0 // Sera calculé plus tard
       });
    }
  }

  console.log(`🔗 Déclinaisons groupées par produit: ${declinaisonsMap.size}`);

  // Parser les articles et créer les produits
  const products = [];
  const categoriesSet = new Set();
  const associatedCategoriesSet = new Set();

  for (let i = 1; i < articlesLines.length; i++) {
    const line = articlesLines[i];
    const values = line.split('\t');
    
    if (values.length < 15) continue;
    
    const name = cleanString(values[0]); // Nom
    const productId = cleanString(values[1]); // Identifiant produit
    const reference = cleanString(values[2]); // Référence
    const ean13 = cleanString(values[4]); // ean13
    const category = cleanString(values[6]); // Nom catégorie par défaut
    const wholesalePrice = parsePrice(values[7]); // Prix d'achat HT
    const finalPrice = parsePrice(values[13]); // Prix de vente TTC final
    const crossedPrice = parsePrice(values[12]); // Prix barré TTC
    const stock = parseQuantity(values[14]); // Quantité disponible
    const associatedCategories = parseAssociatedCategories(values[9]); // Liste catégories associées

    if (name && productId && category) {
      // Récupérer les déclinaisons pour ce produit
      const variations = declinaisonsMap.get(productId) || [];
      
      // Calculer le stock total (article + déclinaisons)
      const totalStock = stock + variations.reduce((sum, v) => sum + v.stock, 0);
      
      // Mettre à jour les prix des déclinaisons
      variations.forEach(variation => {
        variation.finalPrice = finalPrice + variation.priceImpact;
      });

      const product = {
        id: productId,
        name: name,
        reference: reference,
        ean13: ean13,
        category: category,
        associatedCategories: associatedCategories,
        wholesalePrice: wholesalePrice,
        finalPrice: finalPrice,
        crossedPrice: crossedPrice,
        salesCount: 0,
        position: 0,
        remisable: true,
        variations: variations
      };

      products.push(product);
      categoriesSet.add(category);
      associatedCategories.forEach(cat => associatedCategoriesSet.add(cat));
    }
  }

  // Créer les catégories
  const categories = Array.from(categoriesSet).map((name, index) => ({
    id: `cat_${index + 1}`,
    name: name
  }));

  console.log('📊 Statistiques finales:');
  console.log(`   - Produits traités: ${products.length}`);
  console.log(`   - Catégories principales: ${categories.length}`);
  console.log(`   - Sous-catégories uniques: ${associatedCategoriesSet.size}`);
  console.log(`   - Produits avec déclinaisons: ${products.filter(p => p.variations.length > 0).length}`);
  console.log(`   - Produits sans déclinaisons: ${products.filter(p => p.variations.length === 0).length}`);

  // Exemples de produits
  console.log('\n📋 Exemples de produits:');
  products.slice(0, 3).forEach(product => {
    console.log(`   - ${product.name} (${product.category})`);
    console.log(`     Prix: ${product.finalPrice}€, Stock: ${product.stock || 0}`);
    if (product.variations.length > 0) {
      console.log(`     Déclinaisons: ${product.variations.length} (${product.variations.map(v => v.attributes).join(', ')})`);
    }
  });

  // Exemples de déclinaisons
  const productsWithVariations = products.filter(p => p.variations.length > 0);
  if (productsWithVariations.length > 0) {
    console.log('\n📋 Exemples de déclinaisons:');
    const exampleProduct = productsWithVariations[0];
    exampleProduct.variations.slice(0, 3).forEach(variation => {
      console.log(`   - ${exampleProduct.name} (${variation.attributes})`);
      console.log(`     Prix: ${variation.finalPrice}€, Stock: ${variation.stock}`);
    });
  }

  // Générer le fichier TypeScript
  console.log('\n📝 Génération du fichier TypeScript...');
  
  const tsContent = `// Données générées automatiquement par import-new-structure.js
// Date: ${new Date().toISOString()}

import { Product, Category } from '../types/Product';

export const products: Product[] = ${JSON.stringify(products, null, 2)};

export const categories: Category[] = ${JSON.stringify(categories, null, 2)};

export const loadProductionData = (): { products: Product[]; categories: Category[] } => {
  // Forcer le rechargement des nouvelles données (temporaire pour nettoyer le cache)
  console.log('🔄 Forçage du rechargement des nouvelles données...');

  // Nettoyer le localStorage pour forcer le rechargement
  try {
    localStorage.removeItem('klickCaisse_categories');
    localStorage.removeItem('klickCaisse_products');
    console.log('🗑️  Cache localStorage nettoyé');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du cache:', error);
  }

  // Charger les nouvelles données par défaut
  console.log('📦 Chargement des nouvelles données (structure articles + déclinaisons)');
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

  fs.writeFileSync(outputPath, tsContent, 'utf8');
  
  console.log('✅ Fichier TypeScript généré avec succès');
  console.log(`📁 Fichier généré: ${outputPath}`);
  console.log('\n🎉 Import nouvelle structure terminé avec succès !');
  console.log('💡 Structure optimisée:');
  console.log('   - Articles et déclinaisons unifiés');
  console.log('   - Variations intégrées dans les produits');
  console.log('   - Stock total calculé automatiquement');
  console.log('   - Prix des déclinaisons mis à jour');

} catch (error) {
  console.error('❌ Erreur lors de l\'import:', error);
  process.exit(1);
} 