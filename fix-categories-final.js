const fs = require('fs');

console.log('🔧 Correction FINALE des catégories...');

// 1. D'abord, je vais créer une sauvegarde
console.log('📦 Création de sauvegarde...');
const backup = require('./backup.js');
backup.backupAll('avant-correction-finale-categories');

// 2. Modifier le fichier CSV des produits
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
    
    // Déplacer les produits de CATEGORIE 1 (maintenant PRODUITS DIVERS) vers Accueil (ID 2)
    if (category === '1') {
      parts[5] = '2'; // ID de Accueil
      modifiedLines++;
      console.log(`🔄 Produit déplacé de PRODUITS DIVERS vers Accueil`);
    }
    // Les produits de CATEGORIE 2 et 3 ont déjà été supprimés, mais au cas où
    else if (category === '2' || category === '3') {
      parts[5] = '15'; // ID de DIVERS
      modifiedLines++;
      console.log(`🔄 Produit déplacé de CATEGORIE ${category} vers DIVERS`);
    }
  }
  
  return parts.join(',');
});

// Écrire le fichier modifié
const newCsvContent = header + '\n' + newDataLines.join('\n');
fs.writeFileSync('bdd-complete-with-variations.csv', newCsvContent, 'utf8');

// 3. Modifier le fichier des catégories - supprimer PRODUITS DIVERS et réindexer
console.log('📖 Modification du fichier des catégories...');
const categoriesContent = fs.readFileSync('categories-clean.csv', 'utf8');
const categoryLines = categoriesContent.split('\n');

// Supprimer PRODUITS DIVERS (ID 1) et réindexer
const newCategoryLines = categoryLines.filter((line, index) => {
  if (index === 0) return true; // Garder l'en-tête
  if (line.trim() === '') return false; // Supprimer les lignes vides
  
  const parts = line.split(',');
  const categoryId = parts[0];
  
  // Supprimer PRODUITS DIVERS (ID 1)
  if (categoryId === '1') {
    console.log(`🗑️ Catégorie supprimée: ${parts[1]}`);
    return false;
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

// 4. Maintenant, corriger les références dans le CSV des produits avec les nouveaux IDs
console.log('🔧 Correction des références de catégories...');
const correctedCsvContent = fs.readFileSync('bdd-complete-with-variations.csv', 'utf8');
const correctedLines = correctedCsvContent.split('\n');
const correctedHeader = correctedLines[0];
const correctedDataLines = correctedLines.slice(1);

// Créer un map des anciens IDs vers les nouveaux
const idMap = new Map();
reindexedLines.slice(1).forEach(line => {
  const parts = line.split(',');
  const newId = parts[0];
  const name = parts[1].replace(/"/g, '');
  
  // Trouver l'ancien ID basé sur le nom
  categoryLines.slice(1).forEach(oldLine => {
    if (oldLine.trim() === '') return;
    const oldParts = oldLine.split(',');
    const oldName = oldParts[1].replace(/"/g, '');
    if (oldName === name) {
      idMap.set(oldParts[0], newId);
    }
  });
});

// Appliquer les corrections
let correctedCount = 0;
const finalDataLines = correctedDataLines.map(line => {
  if (line.trim() === '') return line;
  
  const parts = line.split(',');
  if (parts.length >= 6) {
    const oldCategoryId = parts[5];
    const newCategoryId = idMap.get(oldCategoryId);
    
    if (newCategoryId && newCategoryId !== oldCategoryId) {
      parts[5] = newCategoryId;
      correctedCount++;
    }
  }
  
  return parts.join(',');
});

// Écrire le fichier final
const finalCsvContent = correctedHeader + '\n' + finalDataLines.join('\n');
fs.writeFileSync('bdd-complete-with-variations.csv', finalCsvContent, 'utf8');

console.log('✅ Modifications terminées !');
console.log(`📈 Statistiques:`);
console.log(`   - Produits modifiés: ${modifiedLines}`);
console.log(`   - Références corrigées: ${correctedCount}`);
console.log(`   - PRODUITS DIVERS supprimé`);
console.log(`   - Produits déplacés vers Accueil`);
console.log(`   - IDs réindexés proprement`); 