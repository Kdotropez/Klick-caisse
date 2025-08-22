// Script de debug simplifié pour vérifier les sous-catégories
const fs = require('fs');

console.log('🔍 Debug des sous-catégories (version simplifiée)...\n');

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
    
    // Simuler la fonction d'extraction
    console.log('\n2. Simulation de l\'extraction:');
    const extracted = [...new Set(uniqueSubcats)];
    console.log(`   - Sous-catégories extraites: ${extracted.length}`);
    
    if (extracted.length > 0) {
      console.log('   - Liste complète des sous-catégories:');
      extracted.sort().forEach(subcat => {
        console.log(`     * "${subcat}"`);
      });
    }
  }
} catch (error) {
  console.log('   ❌ Erreur lecture JSON:', error.message);
}

console.log('\n✅ Debug terminé');
