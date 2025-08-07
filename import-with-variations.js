const fs = require('fs');

console.log('📖 Lecture du fichier CSV UTF-16 avec déclinaisons...');

// Lire le fichier en UTF-16
const content = fs.readFileSync('bdd complete v2.csv', 'utf16le');
const lines = content.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// En-têtes (nettoyer les caractères spéciaux)
const headers = lines[0].split('\t').map(h => h.replace(/\x00/g, '').trim());
console.log('📋 En-têtes nettoyés:', headers);

// Structure pour stocker les produits et leurs déclinaisons
const productsMap = new Map();

// Traiter chaque ligne
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split('\t').map(v => v.replace(/\x00/g, '').trim());
  
  // Extraire les données de base
  const productId = values[2] || ''; // Identifiant produit
  const nom = values[1] || ''; // Nom
  const reference = values[3] || ''; // Référence
  const image = values[4] || ''; // Photo
  const ean13 = values[5] || ''; // EAN13
  const categorie = values[7] || ''; // Catégorie
  const prix_ht = parseFloat(values[9]?.replace(',', '.')) || 0; // Prix HT
  const prix_ttc = parseFloat(values[14]?.replace(',', '.')) || 0; // Prix TTC final
  const stock = parseInt(values[15]) || 0; // Stock
  
  // Données de déclinaison
  const variationId = values[19]; // Identifiant déclinaison
  const variationNom = values[17] || ''; // Liste des attributs
  const variationEan13 = values[20] || ''; // EAN13 déclinaison
  const variationReference = values[21] || ''; // Référence déclinaison
  const impactPrixHt = parseFloat(values[23]?.replace(',', '.')) || 0; // Impact prix HT
  const impactPrixTtc = parseFloat(values[24]?.replace(',', '.')) || 0; // Impact prix TTC
  
  // Ignorer les lignes sans ID produit
  if (!productId || productId === '') continue;
  
  // Si le produit n'existe pas encore, le créer
  if (!productsMap.has(productId)) {
    productsMap.set(productId, {
      id: productId,
      nom: nom,
      reference: reference,
      image: image,
      ean13: ean13,
      categorie: categorie,
      prix_ht: prix_ht,
      prix_ttc: prix_ttc,
      stock: stock,
      remisable: true,
      variations: []
    });
  }
  
  const product = productsMap.get(productId);
  
  // Si c'est une déclinaison, l'ajouter
  if (variationId && variationId.trim() !== '') {
    product.variations.push({
      id: variationId,
      nom: variationNom,
      ean13: variationEan13,
      reference: variationReference,
      impact_prix_ht: impactPrixHt,
      impact_prix_ttc: impactPrixTtc,
      stock: stock
    });
  }
}

// Convertir en tableau
const products = Array.from(productsMap.values());

console.log(`🛍️ ${products.length} produits traités`);

// Créer le fichier CSV avec déclinaisons
let cleanCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable,declinaisons\n';

products.forEach(product => {
  // Convertir les déclinaisons en JSON
  const variationsJson = JSON.stringify(product.variations);
  
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
    `"${variationsJson}"`
  ].join(',');
  
  cleanCsv += line + '\n';
});

// Sauvegarder
fs.writeFileSync('bdd-complete-with-variations.csv', cleanCsv, 'utf8');
console.log('✅ Fichier CSV avec déclinaisons créé: bdd-complete-with-variations.csv');

// Statistiques
const productsWithVariations = products.filter(p => p.variations.length > 0);
const totalVariations = products.reduce((sum, p) => sum + p.variations.length, 0);

console.log(`📈 Statistiques:`);
console.log(`   - Produits totaux: ${products.length}`);
console.log(`   - Produits avec déclinaisons: ${productsWithVariations.length}`);
console.log(`   - Total déclinaisons: ${totalVariations}`);

// Aperçu des produits avec déclinaisons
console.log('\n🔍 Aperçu des produits avec déclinaisons:');
productsWithVariations.slice(0, 3).forEach(product => {
  console.log(`   ${product.id}: ${product.nom} - ${product.variations.length} déclinaisons`);
  product.variations.forEach(v => {
    console.log(`     - ${v.id}: ${v.nom} (EAN: ${v.ean13})`);
  });
});

// Créer aussi un fichier séparé pour les déclinaisons
let variationsCsv = 'product_id,variation_id,nom,ean13,reference,impact_prix_ht,impact_prix_ttc,stock\n';

productsWithVariations.forEach(product => {
  product.variations.forEach(variation => {
    const line = [
      product.id,
      variation.id,
      `"${variation.nom}"`,
      variation.ean13,
      variation.reference,
      variation.impact_prix_ht.toFixed(2),
      variation.impact_prix_ttc.toFixed(2),
      variation.stock
    ].join(',');
    
    variationsCsv += line + '\n';
  });
});

fs.writeFileSync('variations-clean.csv', variationsCsv, 'utf8');
console.log('✅ Fichier des déclinaisons créé: variations-clean.csv'); 