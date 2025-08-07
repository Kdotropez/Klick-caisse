const fs = require('fs');

console.log('🔧 Correction des catégories...');

// 1. Modifier le fichier CSV des produits
console.log('📖 Lecture du fichier CSV des produits...');
const csvContent = fs.readFileSync('bdd-complete-with-variations.csv', 'utf8');
const lines = csvContent.split('\n');
const header = lines[0];
const dataLines = lines.slice(1);

console.log(`📊 ${dataLines.length} lignes de produits lues`);

// Modifier les catégories
let modifiedLines = 0;
const newDataLines = dataLines.map(line => {
  if (line.trim() === '') return line;
  
  const parts = line.split(',');
  if (parts.length >= 6) {
    const category = parts[5];
    
    // Déplacer CATEGORIE 1 vers Accueil
    if (category === '1') {
      parts[5] = '6'; // ID de Accueil
      modifiedLines++;
      console.log(`🔄 Produit déplacé de CATEGORIE 1 vers Accueil`);
    }
    // Supprimer CATEGORIE 2 et 3 (les produits ne seront plus dans ces catégories)
    else if (category === '2' || category === '3') {
      parts[5] = '19'; // ID de DIVERS (catégorie par défaut)
      modifiedLines++;
      console.log(`🔄 Produit déplacé de CATEGORIE ${category} vers DIVERS`);
    }
  }
  
  return parts.join(',');
});

// Écrire le fichier modifié
const newCsvContent = header + '\n' + newDataLines.join('\n');
fs.writeFileSync('bdd-complete-with-variations.csv', newCsvContent, 'utf8');

// 2. Modifier le fichier des catégories
console.log('📖 Modification du fichier des catégories...');
const categoriesContent = fs.readFileSync('categories-clean.csv', 'utf8');
const categoryLines = categoriesContent.split('\n');
const categoryHeader = categoryLines[0];

// Supprimer les lignes 2 et 3 (CATEGORIE 2 et 3)
const newCategoryLines = categoryLines.filter((line, index) => {
  if (index === 0) return true; // Garder l'en-tête
  if (line.trim() === '') return false; // Supprimer les lignes vides
  
  const parts = line.split(',');
  const categoryId = parts[0];
  
  // Supprimer CATEGORIE 2 et 3
  if (categoryId === '2' || categoryId === '3') {
    console.log(`🗑️ Catégorie supprimée: ${parts[1]}`);
    return false;
  }
  
  // Renommer CATEGORIE 1 en "PRODUITS DIVERS"
  if (categoryId === '1') {
    parts[1] = '"PRODUITS DIVERS"';
    console.log(`✏️ CATEGORIE 1 renommée en PRODUITS DIVERS`);
    return parts.join(',');
  }
  
  return line;
});

// Réindexer les IDs des catégories
let newId = 1;
const reindexedLines = newCategoryLines.map((line, index) => {
  if (index === 0) return line; // Garder l'en-tête
  
  const parts = line.split(',');
  const oldId = parts[0];
  parts[0] = newId.toString();
  newId++;
  
  return parts.join(',');
});

// Écrire le fichier des catégories modifié
const newCategoriesContent = reindexedLines.join('\n');
fs.writeFileSync('categories-clean.csv', newCategoriesContent, 'utf8');

console.log('✅ Modifications terminées !');
console.log(`📈 Statistiques:`);
console.log(`   - Produits modifiés: ${modifiedLines}`);
console.log(`   - Catégories supprimées: 2 (CATEGORIE 2 et 3)`);
console.log(`   - CATEGORIE 1 renommée en PRODUITS DIVERS`);
console.log(`   - Produits de CATEGORIE 1 déplacés vers Accueil`);
console.log(`   - Produits de CATEGORIE 2 et 3 déplacés vers DIVERS`); 