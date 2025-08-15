const fs = require('fs');

console.log('🧪 Test d\'import des sous-catégories...');

try {
    // Lire le fichier JSON
    const jsonData = fs.readFileSync('base complete 15 aout.nested.json', 'utf8');
    const products = JSON.parse(jsonData);
    
    console.log(`📊 ${products.length} produits chargés`);
    
    // Compter les produits avec sous-catégories
    const withSubcategories = products.filter(p => p.sousCategorie && p.sousCategorie.trim());
    console.log(`📂 Produits avec sous-catégories: ${withSubcategories.length}`);
    
    // Lister toutes les sous-catégories uniques
    const subcategories = new Set();
    withSubcategories.forEach(p => {
        if (p.sousCategorie && p.sousCategorie.trim()) {
            subcategories.add(p.sousCategorie);
        }
    });
    
    console.log(`\n📋 Sous-catégories trouvées (${subcategories.size}):`);
    Array.from(subcategories).sort().forEach(sub => {
        const count = withSubcategories.filter(p => p.sousCategorie === sub).length;
        console.log(`   - "${sub}" (${count} produits)`);
    });
    
    // Simuler l'import comme le fait l'application
    console.log(`\n🔍 Simulation de l'import:`);
    let importedWithSubcats = 0;
    
    products.forEach(product => {
        // Simuler la logique d'import du CSVImportService
        const associatedCategories = [];
        
        // NOUVEAU: Champ sousCategorie du JSON nested
        if (product.sousCategorie) {
            associatedCategories.push(product.sousCategorie);
        }
        
        if (associatedCategories.length > 0) {
            importedWithSubcats++;
            if (importedWithSubcats <= 5) {
                console.log(`   ✅ ${product.nom} → sous-catégories: [${associatedCategories.join(', ')}]`);
            }
        }
    });
    
    console.log(`\n📈 Résultat de la simulation:`);
    console.log(`   - Produits avec sous-catégories importées: ${importedWithSubcats}`);
    console.log(`   - Sous-catégories uniques: ${subcategories.size}`);
    
    if (importedWithSubcats > 0) {
        console.log(`\n✅ L'import devrait fonctionner ! Les onglets de sous-catégories devraient apparaître.`);
    } else {
        console.log(`\n❌ Problème: Aucune sous-catégorie n'a été importée.`);
    }
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
}
