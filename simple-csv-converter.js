const fs = require('fs');

console.log('📖 Lecture du fichier CSV...');

// Lire le fichier
const content = fs.readFileSync('bdd complete v2.csv', 'utf8');
const lines = content.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// En-têtes
const headers = lines[0].split('\t');
console.log('📋 En-têtes:', headers);

// Créer le CSV propre
let cleanCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable\n';

// Traiter chaque ligne
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split('\t');
  
  // Extraire les données
  const id = values[2] || ''; // Identifiant produit
  const nom = values[1] || ''; // Nom
  const reference = values[3] || ''; // Référence
  const image = values[4] || ''; // Photo
  const ean13 = values[5] || ''; // EAN13
  const categorie = values[7] || ''; // Catégorie
  const prix_ht = parseFloat(values[9]?.replace(',', '.')) || 0; // Prix HT
  const prix_ttc = parseFloat(values[14]?.replace(',', '.')) || 0; // Prix TTC final
  const stock = parseInt(values[15]) || 0; // Stock
  
  // Vérifier si c'est une déclinaison (si Identifiant déclinaison n'est pas vide)
  const variationId = values[19]; // Identifiant déclinaison
  
  // Si c'est une déclinaison, on l'ignore pour l'instant
  if (variationId && variationId.trim() !== '') {
    continue;
  }
  
  // Ajouter au CSV propre
  const line = [
    id,
    `"${nom}"`,
    reference,
    image,
    ean13,
    categorie,
    prix_ht.toFixed(2),
    prix_ttc.toFixed(2),
    stock,
    'true'
  ].join(',');
  
  cleanCsv += line + '\n';
}

// Sauvegarder
fs.writeFileSync('bdd-complete-clean.csv', cleanCsv, 'utf8');
console.log('✅ Fichier CSV propre créé!');

// Compter les lignes
const cleanLines = cleanCsv.split('\n').length - 1;
console.log(`📈 ${cleanLines} produits traités`); 