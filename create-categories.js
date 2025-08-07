const fs = require('fs');

console.log('📖 Extraction des catégories...');

// Lire le fichier CSV propre
const content = fs.readFileSync('bdd-complete-clean.csv', 'utf8');
const lines = content.split('\n');

// Extraire les catégories uniques
const categories = new Set();
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split(',');
  const categorie = values[5]; // Index de la catégorie
  
  if (categorie && categorie.trim() !== '') {
    categories.add(categorie.trim());
  }
}

const categoriesList = Array.from(categories).sort();
console.log('🏷️ Catégories trouvées:', categoriesList);

// Créer le fichier des catégories
let categoriesCsv = 'id,nom,color,productOrder\n';

const colors = {
  'VERRE': '#2196F3',
  'VETEMENT': '#FF5722',
  'PACK VERRE': '#4CAF50',
  'POCHETTE': '#9C27B0',
  'BIERE BT': '#FF9800',
  'VASQUE ET SEAU': '#795548',
  'CONSOMABLE INTERNE BOUTIQUE': '#607D8B',
  'SAC': '#E91E63',
  'PORTE CLEF & BRACELET': '#00BCD4',
  'DECAPSULEUR': '#8BC34A',
  'BRADERIE': '#FFC107'
};

categoriesList.forEach((category, index) => {
  const line = [
    index + 1,
    `"${category}"`,
    colors[category] || '#757575',
    '[]'
  ].join(',');
  
  categoriesCsv += line + '\n';
});

fs.writeFileSync('categories-clean.csv', categoriesCsv, 'utf8');
console.log('✅ Fichier des catégories créé: categories-clean.csv');

// Aperçu
console.log('\n🔍 Aperçu des catégories:');
categoriesList.forEach((category, index) => {
  console.log(`   ${index + 1}: ${category} (${colors[category] || '#757575'})`);
}); 