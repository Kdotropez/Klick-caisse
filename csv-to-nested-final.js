const fs = require('fs');

console.log('🔄 Conversion CSV → JSON NESTED (FINAL AVEC CATÉGORIES)...');

try {
    // Lire le fichier CSV
    const csvData = fs.readFileSync('src/components/base complete 15 aout.csv', 'utf8');
    const lines = csvData.split('\n');
    
    console.log(`📊 Lecture de ${lines.length} lignes du CSV...`);
    
    // Parser l'en-tête
    const headers = lines[0].split(';').map(h => h.trim());
    console.log('📋 En-têtes:', headers);
    
    // Trouver les index des colonnes importantes (gérer l'encodage)
    const categorieIndex = headers.findIndex(h => h.includes('cat') && h.includes('gorie'));
    const sousCategorieIndex = headers.findIndex(h => h.includes('sous categorie'));
    
    console.log(`🔍 Index colonne catégorie: ${categorieIndex} (${headers[categorieIndex]})`);
    console.log(`🔍 Index colonne sous-catégorie: ${sousCategorieIndex} (${headers[sousCategorieIndex]})`);
    
    // Parser les données
    const articles = [];
    const declinaisons = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(';').map(v => v.trim());
        if (values.length < headers.length) continue;
        
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        
        // Séparer articles et déclinaisons
        if (row['Type'] === 'ARTICLE') {
            articles.push(row);
        } else if (row['Type'] === 'DECLINAISON') {
            declinaisons.push(row);
        }
    }
    
    console.log(`📦 Articles trouvés: ${articles.length}`);
    console.log(`🔗 Déclinaisons trouvées: ${declinaisons.length}`);
    
    // Vérifier les catégories et sous-catégories
    console.log('\n🔍 Vérification des catégories:');
    const categories = new Set();
    articles.forEach(a => {
        const cat = a[headers[categorieIndex]];
        if (cat && cat.trim()) categories.add(cat);
    });
    console.log(`🏷️ Catégories trouvées (${categories.size}):`);
    Array.from(categories).sort().forEach(cat => {
        const count = articles.filter(a => a[headers[categorieIndex]] === cat).length;
        console.log(`   - "${cat}" (${count} produits)`);
    });
    
    console.log('\n🔍 Vérification des sous-catégories:');
    const articlesWithSubcats = articles.filter(a => {
        const subcat = a[headers[sousCategorieIndex]];
        return subcat && subcat.trim();
    });
    console.log(`📂 Articles avec sous-catégories: ${articlesWithSubcats.length}`);
    
    if (articlesWithSubcats.length > 0) {
        const subcats = new Set();
        articlesWithSubcats.forEach(a => {
            const subcat = a[headers[sousCategorieIndex]];
            subcats.add(subcat);
        });
        console.log(`📋 Sous-catégories trouvées (${subcats.size}):`);
        Array.from(subcats).sort().forEach(sub => {
            const count = articlesWithSubcats.filter(a => a[headers[sousCategorieIndex]] === sub).length;
            console.log(`   - "${sub}" (${count} produits)`);
        });
    }
    
    // Créer la structure nested
    const nestedData = articles.map(article => {
        const productId = article['Identifiant produit'];
        const variants = declinaisons.filter(d => d['Identifiant produit'] === productId);
        
        return {
            type: 'ARTICLE',
            productId: productId,
            nom: article['Nom'],
            categorie: article[headers[categorieIndex]] || '', // CORRIGÉ: Ajout de la catégorie
            ean13: article['ean13'],
            prixTTC: article['Prix de vente TTC'],
            sousCategorie: article[headers[sousCategorieIndex]] || '', // CORRIGÉ: Sous-catégorie
            variants: variants.map(v => ({
                declinaisonId: v['Identifiant dclinaison'],
                nom: v['Nom'],
                attributs: v['Liste des attributs'],
                ean13: v['ean13'],
                prixTTC: v['Prix de vente TTC']
            }))
        };
    });
    
    console.log(`✅ Conversion terminée: ${nestedData.length} articles mères`);
    
    // Statistiques finales
    const withVariants = nestedData.filter(p => p.variants.length > 0).length;
    const withoutVariants = nestedData.filter(p => p.variants.length === 0).length;
    const totalVariants = nestedData.reduce((sum, p) => sum + p.variants.length, 0);
    const withSubcategories = nestedData.filter(p => p.sousCategorie && p.sousCategorie.trim());
    const withCategories = nestedData.filter(p => p.categorie && p.categorie.trim());
    
    console.log(`📈 Résultat final:`);
    console.log(`   - Articles avec déclinaisons: ${withVariants}`);
    console.log(`   - Articles simples: ${withoutVariants}`);
    console.log(`   - Total déclinaisons: ${totalVariants}`);
    console.log(`   - Articles avec catégories: ${withCategories.length}`);
    console.log(`   - Articles avec sous-catégories: ${withSubcategories.length}`);
    
    // Vérifier les prix
    const zeroPrice = nestedData.filter(p => !p.prixTTC || parseFloat(p.prixTTC.replace(',', '.')) === 0);
    if (zeroPrice.length > 0) {
        console.log(`⚠️ Articles à 0€: ${zeroPrice.length}`);
    }
    
    // Sauvegarder le fichier JSON
    fs.writeFileSync('base complete 15 aout.nested.json', JSON.stringify(nestedData, null, 4));
    console.log(`💾 Fichier JSON NESTED créé: base complete 15 aout.nested.json`);
    
    // Aperçu final
    console.log(`\n🔍 Aperçu des produits:`);
    nestedData.slice(0, 5).forEach((p, i) => {
        console.log(`${i+1}. ${p.nom}`);
        console.log(`   Catégorie: "${p.categorie}"`);
        console.log(`   Sous-catégorie: "${p.sousCategorie}"`);
        console.log(`   Prix: ${p.prixTTC}€`);
        console.log(`   Déclinaisons: ${p.variants.length}`);
        if (p.variants.length > 0) {
            p.variants.slice(0, 2).forEach(v => {
                console.log(`     - ${v.attributs || 'Sans attributs'} (${v.declinaisonId}) - ${v.prixTTC}€`);
            });
        }
        console.log('');
    });
    
    console.log(`\n🎉 Conversion CSV → JSON terminée avec succès !`);
    console.log(`📋 Instructions d'import:`);
    console.log(`   1. Ouvrir l'application (port 3001)`);
    console.log(`   2. Aller dans "Paramètres" (⚙️)`);
    console.log(`   3. Cliquer sur "Importer JSON"`);
    console.log(`   4. Sélectionner: "base complete 15 aout.nested.json"`);
    console.log(`   5. Cliquer sur "Importer"`);
    console.log(`   6. Les catégories ET sous-catégories devraient maintenant apparaître !`);
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}
