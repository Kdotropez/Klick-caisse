const fs = require('fs');

console.log('📖 Lecture du fichier CSV UTF-16...');

// Lire le fichier en UTF-16
const content = fs.readFileSync('bdd complete v2.csv', 'utf16le');
const lines = content.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// En-têtes (nettoyer les caractères spéciaux)
const headers = lines[0].split('\t').map(h => h.replace(/\x00/g, '').trim());
console.log('📋 En-têtes nettoyés:', headers);

// Créer le CSV propre
let cleanCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable\n';

// Traiter chaque ligne
let productCount = 0;
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const values = lines[i].split('\t').map(v => v.replace(/\x00/g, '').trim());
  
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
  
  // Ignorer les lignes sans ID
  if (!id || id === '') continue;
  
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
  productCount++;
}

// Sauvegarder
fs.writeFileSync('bdd-complete-clean.csv', cleanCsv, 'utf8');
console.log('✅ Fichier CSV propre créé!');
console.log(`📈 ${productCount} produits traités`);

// Aperçu des premières lignes
const previewLines = cleanCsv.split('\n').slice(0, 6);
console.log('\n🔍 Aperçu des premières lignes:');
previewLines.forEach(line => console.log(line)); 