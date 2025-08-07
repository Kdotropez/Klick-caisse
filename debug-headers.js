const fs = require('fs');

// Lire le fichier CSV
const content = fs.readFileSync('bdd complete v2.csv', 'utf8');
const lines = content.split('\n');

// Afficher la première ligne avec les indices
const headers = lines[0].split('\t');
console.log('En-têtes trouvés:');
headers.forEach((header, index) => {
  console.log(`${index}: "${header}"`);
});

console.log('\nRecherche des colonnes importantes:');
const importantColumns = [
  'Identifiant produit',
  'Nom', 
  'Nom catégorie par défaut',
  'Liste catégories associées (IDs)',
  'Prix de vente TTC final',
  'ean13',
  'Référence'
];

importantColumns.forEach(searchTerm => {
  const index = headers.findIndex(h => h.includes(searchTerm));
  console.log(`"${searchTerm}": ${index !== -1 ? `colonne ${index} ("${headers[index]}")` : 'non trouvé'}`);
}); 