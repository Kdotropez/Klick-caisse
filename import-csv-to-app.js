const fs = require('fs');
const path = require('path');

console.log('📖 Import des données CSV dans l\'application...');

// Lire le fichier CSV avec déclinaisons
const csvContent = fs.readFileSync('bdd-complete-with-variations.csv', 'utf8');
const lines = csvContent.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// Lire le fichier des catégories
const categoriesContent = fs.readFileSync('categories-clean.csv', 'utf8');
const categoryLines = categoriesContent.split('\n');

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

// Parser les produits
const products = [];
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split(',');
  
  // Gérer les valeurs entre guillemets
  let currentIndex = 0;
  const parsedValues = [];
  
  for (let j = 0; j < values.length; j++) {
    const value = values[j];
    if (value.startsWith('"') && !value.endsWith('"')) {
      // Valeur multi-colonnes
      let fullValue = value;
      let k = j + 1;
      while (k < values.length && !values[k].endsWith('"')) {
        fullValue += ',' + values[k];
        k++;
      }
      if (k < values.length) {
        fullValue += ',' + values[k];
        j = k;
      }
      parsedValues.push(fullValue.replace(/"/g, ''));
    } else {
      parsedValues.push(value.replace(/"/g, ''));
    }
  }
  
  const id = parsedValues[0];
  const nom = parsedValues[1];
  const reference = parsedValues[2];
  const image = parsedValues[3];
  const ean13 = parsedValues[4];
  const categorie = parsedValues[5];
  const prix_ht = parseFloat(parsedValues[6]) || 0;
  const prix_ttc = parseFloat(parsedValues[7]) || 0;
  const stock = parseInt(parsedValues[8]) || 0;
  const remisable = parsedValues[9] === 'true';
  const article_remisable = parsedValues[10] === 'true';
  const declinaisons = parsedValues[11] || '[]';
  
  // Parser les déclinaisons JSON
  let variations = [];
  try {
    variations = JSON.parse(declinaisons);
  } catch (e) {
    console.log(`⚠️ Erreur parsing déclinaisons pour ${nom}: ${e.message}`);
  }
  
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
    variations: variations.map(v => ({
      id: v.id,
      name: v.nom,
      ean13: v.ean13,
      reference: v.reference,
      priceImpact: v.impact_prix_ttc || 0,
      stock: v.stock || 0
    }))
  });
}

console.log(`🛍️ ${products.length} produits importés`);

// Créer le fichier de données pour l'application
const appData = {
  products: products,
  categories: categories
};

// Sauvegarder dans le fichier de données de l'application
const outputPath = path.join(__dirname, 'src', 'data', 'productionData.ts');
const outputContent = `// Données importées automatiquement depuis bdd-complete-with-variations.csv
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

console.log('\n🎉 Import terminé avec succès !'); 