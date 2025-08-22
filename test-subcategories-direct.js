// Test direct de l'extraction des sous-catégories
const fs = require('fs');

console.log('🧪 Test direct de l\'extraction des sous-catégories...\n');

// 1. Charger le JSON original
console.log('1. Chargement du JSON original:');
const jsonData = JSON.parse(fs.readFileSync('base complete 15 aout.nested.json', 'utf8'));
console.log(`   - Produits dans JSON: ${jsonData.length}`);

// 2. Simuler la transformation comme dans productionData.ts
console.log('\n2. Transformation des données (comme dans productionData.ts):');
const transformedProducts = jsonData.map((item) => ({
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
  variations: item.variants ? item.variants.map((v) => ({
    id: v.declinaisonId,
    ean13: v.ean13,
    reference: '',
    attributes: v.attributs,
    priceImpact: 0,
    finalPrice: parseFloat(v.prixTTC.replace(',', '.'))
  })) : []
}));

console.log(`   - Produits transformés: ${transformedProducts.length}`);

// 3. Vérifier les associatedCategories
const withAssociatedCats = transformedProducts.filter(p => p.associatedCategories && p.associatedCategories.length > 0);
console.log(`   - Produits avec associatedCategories: ${withAssociatedCats.length}`);

if (withAssociatedCats.length > 0) {
  console.log('   - Exemples de associatedCategories:');
  const uniqueCats = [...new Set(withAssociatedCats.flatMap(p => p.associatedCategories))];
  uniqueCats.slice(0, 10).forEach(cat => {
    console.log(`     * "${cat}"`);
  });
  console.log(`   - Total associatedCategories uniques: ${uniqueCats.length}`);
}

// 4. Simuler la fonction d'extraction
console.log('\n3. Simulation de l\'extraction:');
const extractSubcategoriesFromProducts = (products) => {
  const subcategories = new Set();
  
  console.log(`   - Extraction depuis ${products.length} produits...`);
  
  products.forEach((product, index) => {
    // Vérifier associatedCategories
    if (product.associatedCategories && Array.isArray(product.associatedCategories)) {
      product.associatedCategories.forEach(category => {
        if (category && typeof category === 'string') {
          const clean = category.trim();
          if (clean) {
            subcategories.add(clean);
            if (index < 5) console.log(`     - associatedCategories: "${category}" -> "${clean}"`);
          }
        }
      });
    }
    
    // Vérifier sousCategorie (format JSON original)
    if (product.sousCategorie && typeof product.sousCategorie === 'string') {
      const clean = product.sousCategorie.trim();
      if (clean) {
        subcategories.add(clean);
        if (index < 5) console.log(`     - sousCategorie: "${product.sousCategorie}" -> "${clean}"`);
      }
    }
  });
  
  const result = Array.from(subcategories).sort();
  console.log(`   - Sous-catégories extraites: ${result.length}`);
  if (result.length > 0) {
    console.log(`   - Exemples: ${result.slice(0, 5).join(', ')}`);
  }
  
  return result;
};

const extracted = extractSubcategoriesFromProducts(transformedProducts);
console.log(`\n✅ Résultat final: ${extracted.length} sous-catégories extraites`);

if (extracted.length > 0) {
  console.log('   - Liste complète:');
  extracted.forEach(subcat => {
    console.log(`     * "${subcat}"`);
  });
}
