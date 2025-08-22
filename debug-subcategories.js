// Script de debug pour vérifier les sous-catégories
const fs = require('fs');

console.log('🔍 Debug des sous-catégories...\n');

// 1. Vérifier le fichier JSON original
console.log('1. Vérification du fichier JSON original:');
try {
  const jsonData = JSON.parse(fs.readFileSync('base complete 15 aout.nested.json', 'utf8'));
  console.log(`   - Nombre total de produits: ${jsonData.length}`);
  
  const withSubcats = jsonData.filter(item => item.sousCategorie && item.sousCategorie.trim());
  console.log(`   - Produits avec sousCategorie: ${withSubcats.length}`);
  
  if (withSubcats.length > 0) {
    console.log('   - Exemples de sous-catégories:');
    const uniqueSubcats = [...new Set(withSubcats.map(item => item.sousCategorie))];
    uniqueSubcats.slice(0, 10).forEach(subcat => {
      console.log(`     * "${subcat}"`);
    });
    console.log(`   - Total sous-catégories uniques: ${uniqueSubcats.length}`);
  }
} catch (error) {
  console.log('   ❌ Erreur lecture JSON:', error.message);
}

console.log('\n2. Vérification des données intégrées:');
try {
  const productionData = require('./src/data/productionData.ts');
  console.log('   - Données intégrées chargées');
  
  // Vérifier les produits intégrés
  const products = productionData.products;
  console.log(`   - Nombre de produits intégrés: ${products.length}`);
  
  const withAssociatedCats = products.filter(p => p.associatedCategories && p.associatedCategories.length > 0);
  console.log(`   - Produits avec associatedCategories: ${withAssociatedCats.length}`);
  
  if (withAssociatedCats.length > 0) {
    console.log('   - Exemples de associatedCategories:');
    const uniqueCats = [...new Set(withAssociatedCats.flatMap(p => p.associatedCategories))];
    uniqueCats.slice(0, 10).forEach(cat => {
      console.log(`     * "${cat}"`);
    });
    console.log(`   - Total associatedCategories uniques: ${uniqueCats.length}`);
  }
} catch (error) {
  console.log('   ❌ Erreur chargement données intégrées:', error.message);
}

console.log('\n3. Test de la fonction d\'extraction:');
try {
  const { StorageService } = require('./src/services/StorageService.ts');
  const products = require('./src/data/productionData.ts').products;
  
  const extracted = StorageService.extractSubcategoriesFromProducts(products);
  console.log(`   - Sous-catégories extraites: ${extracted.length}`);
  
  if (extracted.length > 0) {
    console.log('   - Liste des sous-catégories extraites:');
    extracted.forEach(subcat => {
      console.log(`     * "${subcat}"`);
    });
  }
} catch (error) {
  console.log('   ❌ Erreur extraction:', error.message);
}

console.log('\n✅ Debug terminé');
