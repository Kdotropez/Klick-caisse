const fs = require('fs');
const path = require('path');

console.log('📖 Import avec déclinaisons séparées...');

// Lire le fichier CSV principal (sans déclinaisons)
const csvContent = fs.readFileSync('bdd-complete-clean.csv', 'utf8');
const lines = csvContent.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// Lire le fichier des catégories
const categoriesContent = fs.readFileSync('categories-clean.csv', 'utf8');
const categoryLines = categoriesContent.split('\n');

// Lire le fichier des variations
const variationsContent = fs.readFileSync('variations-clean.csv', 'utf8');
const variationLines = variationsContent.split('\n');

// Parser les catégories
const categories = [];
for (let i = 1; i < categoryLines.length; i++) {
  if (categoryLines[i].trim() === '') continue;
  
  const values = categoryLines[i].split(',');
  const id = values[0];
  const name = values[1]?.replace(/"/g, '') || '';
  const color = values[2] || '#757575';
  const productOrder = values[3] || '[]';
  
  categories.push({
    id: id,
    name: name,
    color: color,
    productOrder: productOrder === '[]' ? [] : JSON.parse(productOrder)
  });
}

console.log(`🏷️ ${categories.length} catégories importées`);

// Parser les variations
const variationsMap = new Map();
for (let i = 1; i < variationLines.length; i++) {
  if (variationLines[i].trim() === '') continue;
  
  const values = variationLines[i].split(',');
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
    name: nom,
    ean13: ean13,
    reference: reference,
    priceImpact: impactPrixTtc,
    stock: stock
  });
}

console.log(`🔄 ${variationsMap.size} produits avec déclinaisons trouvés`);

// Parser les produits
const products = [];
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split(',');
  
  const id = values[0];
  const nom = values[1]?.replace(/"/g, '') || '';
  const reference = values[2] || '';
  const image = values[3] || '';
  const ean13 = values[4] || '';
  const categorie = values[5] || '';
  const prix_ht = parseFloat(values[6]) || 0;
  const prix_ttc = parseFloat(values[7]) || 0;
  const stock = parseInt(values[8]) || 0;
  const remisable = values[9] === 'true';
  
  // Récupérer les déclinaisons pour ce produit
  const variations = variationsMap.get(id) || [];
  
  // Trouver la catégorie correspondante
  const categoryObj = categories.find(c => c.name === categorie);
  const categoryId = categoryObj ? categoryObj.id : '1';
  
  products.push({
    id: id,
    name: nom,
    reference: reference,
    image: image,
    ean13: ean13,
    category: categoryId,
    price: prix_ttc,
    stock: stock,
    remisable: remisable,
    variations: variations
  });
}

console.log(`🛍️ ${products.length} produits importés`);

// Sauvegarder dans le fichier de données de l'application
const outputPath = path.join(__dirname, 'src', 'data', 'productionData.ts');
const outputContent = `// Données importées automatiquement depuis bdd-complete-clean.csv + variations-clean.csv
// Généré le: ${new Date().toISOString()}

export const products = ${JSON.stringify(products, null, 2)};

export const categories = ${JSON.stringify(categories, null, 2)};

export default {
  products,
  categories
};
`;

fs.writeFileSync(outputPath, outputContent, 'utf8');
console.log(`✅ Données importées dans ${outputPath}`);

// Statistiques finales
const productsWithVariations = products.filter(p => p.variations.length > 0);
const totalVariations = products.reduce((sum, p) => sum + p.variations.length, 0);

console.log(`\n📈 Statistiques finales:`);
console.log(`   - Produits totaux: ${products.length}`);
console.log(`   - Catégories: ${categories.length}`);
console.log(`   - Produits avec déclinaisons: ${productsWithVariations.length}`);
console.log(`   - Total déclinaisons: ${totalVariations}`);

// Aperçu des catégories
console.log(`\n🏷️ Catégories importées:`);
categories.forEach(cat => {
  const catProducts = products.filter(p => p.category === cat.id);
  console.log(`   - ${cat.name} (${catProducts.length} produits)`);
});

// Aperçu des produits avec déclinaisons
if (productsWithVariations.length > 0) {
  console.log(`\n🔍 Aperçu des produits avec déclinaisons:`);
  productsWithVariations.slice(0, 3).forEach(product => {
    console.log(`   - ${product.name} (${product.variations.length} déclinaisons)`);
    product.variations.slice(0, 2).forEach(v => {
      console.log(`     * ${v.name} (EAN: ${v.ean13})`);
    });
  });
}

console.log('\n🎉 Import terminé avec succès !'); 