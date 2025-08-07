const fs = require('fs');

console.log('📖 Fusion des produits avec leurs déclinaisons...');

// Lire les fichiers
const productsContent = fs.readFileSync('bdd-complete-clean.csv', 'utf8');
const variationsContent = fs.readFileSync('variations-clean.csv', 'utf8');

const productsLines = productsContent.split('\n');
const variationsLines = variationsContent.split('\n');

// Parser les variations
const variationsMap = new Map();
for (let i = 1; i < variationsLines.length; i++) {
  if (variationsLines[i].trim() === '') continue;
  
  const values = variationsLines[i].split(',');
  const productId = values[0];
  const variationId = values[1];
  const nom = values[2]?.replace(/"/g, '') || '';
  const ean13 = values[3] || '';
  const reference = values[4] || '';
  const impactPrixHt = parseFloat(values[5]) || 0;
  const impactPrixTtc = parseFloat(values[6]) || 0;
  const stock = parseInt(values[7]) || 0;
  
  if (!variationsMap.has(productId)) {
    variationsMap.set(productId, []);
  }
  
  variationsMap.get(productId).push({
    id: variationId,
    nom: nom,
    ean13: ean13,
    reference: reference,
    impact_prix_ht: impactPrixHt,
    impact_prix_ttc: impactPrixTtc,
    stock: stock
  });
}

console.log(`📊 ${variationsMap.size} produits avec déclinaisons trouvés`);

// Créer le fichier final
let finalCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable,declinaisons\n';

for (let i = 1; i < productsLines.length; i++) {
  if (productsLines[i].trim() === '') continue;
  
  const values = productsLines[i].split(',');
  const productId = values[0];
  
  // Récupérer les déclinaisons pour ce produit
  const variations = variationsMap.get(productId) || [];
  const variationsJson = JSON.stringify(variations);
  
  // Reconstruire la ligne avec les déclinaisons
  const line = [
    productId,
    values[1], // nom
    values[2], // reference
    values[3], // image
    values[4], // ean13
    values[5], // categorie
    values[6], // prix_ht
    values[7], // prix_ttc
    values[8], // stock
    values[9], // remisable
    `"${variationsJson}"`
  ].join(',');
  
  finalCsv += line + '\n';
}

// Sauvegarder
fs.writeFileSync('bdd-complete-final.csv', finalCsv, 'utf8');
console.log('✅ Fichier final créé: bdd-complete-final.csv');

// Statistiques
const totalProducts = productsLines.length - 1;
const productsWithVariations = Array.from(variationsMap.keys()).length;
const totalVariations = Array.from(variationsMap.values()).reduce((sum, vars) => sum + vars.length, 0);

console.log(`📈 Statistiques finales:`);
console.log(`   - Produits totaux: ${totalProducts}`);
console.log(`   - Produits avec déclinaisons: ${productsWithVariations}`);
console.log(`   - Total déclinaisons: ${totalVariations}`);

// Aperçu des produits avec déclinaisons
console.log('\n🔍 Aperçu des produits avec déclinaisons:');
let count = 0;
for (const [productId, variations] of variationsMap) {
  if (count >= 3) break;
  
  // Trouver le nom du produit
  const productLine = productsLines.find(line => line.startsWith(productId + ','));
  const productName = productLine ? productLine.split(',')[1]?.replace(/"/g, '') : 'Inconnu';
  
  console.log(`   ${productId}: ${productName} - ${variations.length} déclinaisons`);
  variations.slice(0, 3).forEach(v => {
    console.log(`     - ${v.id}: ${v.nom} (EAN: ${v.ean13})`);
  });
  count++;
} 