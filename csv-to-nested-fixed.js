const fs = require('fs');

console.log('🔄 Conversion CSV → JSON NESTED (CORRIGÉ)...');

try {
    // Lire le fichier CSV
    const csvData = fs.readFileSync('src/components/base complete 15 aout.csv', 'utf8');
    const lines = csvData.split('\n');
    
    console.log(`📊 Lecture de ${lines.length} lignes du CSV...`);
    
    // Parser l'en-tête
    const headers = lines[0].split(';').map(h => h.trim());
    console.log('📋 En-têtes:', headers);
    
    // Trouver l'index de la colonne sous-catégorie
    const sousCategorieIndex = headers.findIndex(h => h.includes('sous categorie'));
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
    
    // Vérifier les sous-catégories dans les articles
    console.log('\n🔍 Vérification des sous-catégories dans les articles:');
    const articlesWithSubcats = articles.filter(a => {
        const subcat = a[headers[sousCategorieIndex]];
        return subcat && subcat.trim();
    });
    console.log(`📂 Articles avec sous-catégories: ${articlesWithSubcats.length}`);
    
    if (articlesWithSubcats.length > 0) {
        console.log('📋 Exemples de sous-catégories trouvées:');
        const subcats = new Set();
        articlesWithSubcats.slice(0, 10).forEach(a => {
            const subcat = a[headers[sousCategorieIndex]];
            subcats.add(subcat);
            console.log(`   - "${subcat}" (article: ${a['Nom']})`);
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
            categorie: article['Nom catégorie par défaut'],
            ean13: article['ean13'],
            prixTTC: article['Prix de vente TTC'],
            sousCategorie: article[headers[sousCategorieIndex]] || '', // CORRIGÉ: Utilise l'index exact
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
    
    // Statistiques
    const withVariants = nestedData.filter(p => p.variants.length > 0).length;
    const withoutVariants = nestedData.filter(p => p.variants.length === 0).length;
    const totalVariants = nestedData.reduce((sum, p) => sum + p.variants.length, 0);
    const withSubcategories = nestedData.filter(p => p.sousCategorie && p.sousCategorie.trim());
    
    console.log(`📈 Résultat:`);
    console.log(`   - Articles avec déclinaisons: ${withVariants}`);
    console.log(`   - Articles simples: ${withoutVariants}`);
    console.log(`   - Total déclinaisons: ${totalVariants}`);
    console.log(`   - Articles avec sous-catégories: ${withSubcategories.length}`);
    
    // Vérifier les prix
    const zeroPrice = nestedData.filter(p => !p.prixTTC || parseFloat(p.prixTTC.replace(',', '.')) === 0);
    if (zeroPrice.length > 0) {
        console.log(`⚠️ Articles à 0€: ${zeroPrice.length}`);
    }
    
    // Sauvegarder le fichier JSON
    fs.writeFileSync('base complete 15 aout.nested.json', JSON.stringify(nestedData, null, 4));
    console.log(`💾 Fichier JSON NESTED créé: base complete 15 aout.nested.json`);
    
    // Aperçu
    console.log(`\n🔍 Aperçu des produits:`);
    nestedData.slice(0, 5).forEach((p, i) => {
        console.log(`${i+1}. ${p.nom} (${p.categorie}) - ${p.prixTTC}€`);
        console.log(`   Sous-catégorie: "${p.sousCategorie}"`);
        console.log(`   Déclinaisons: ${p.variants.length}`);
        if (p.variants.length > 0) {
            p.variants.slice(0, 2).forEach(v => {
                console.log(`     - ${v.attributs || 'Sans attributs'} (${v.declinaisonId}) - ${v.prixTTC}€`);
            });
        }
    });
    
    console.log(`\n🎉 Conversion CSV → JSON terminée avec succès !`);
    console.log(`📋 Instructions d'import:`);
    console.log(`   1. Ouvrir l'application (port 3001)`);
    console.log(`   2. Aller dans "Paramètres" (⚙️)`);
    console.log(`   3. Cliquer sur "Importer JSON"`);
    console.log(`   4. Sélectionner: "base complete 15 aout.nested.json"`);
    console.log(`   5. Cliquer sur "Importer"`);
    console.log(`   6. Les onglets de sous-catégories devraient maintenant apparaître !`);
    
} catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
}
