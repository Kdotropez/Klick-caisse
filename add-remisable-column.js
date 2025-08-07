const fs = require('fs');

console.log('📖 Ajout de la colonne "article_remisable"...');

// Lire le fichier CSV avec déclinaisons
const content = fs.readFileSync('bdd-complete-with-variations.csv', 'utf8');
const lines = content.split('\n');

console.log(`📊 ${lines.length} lignes lues`);

// Nouveau fichier avec la colonne ajoutée
let newCsv = 'id,nom,reference,image,ean13,categorie,prix_ht,prix_ttc,stock,remisable,article_remisable,declinaisons\n';

// Traiter chaque ligne (sauf l'en-tête)
for (let i = 1; i < lines.length; i++) {
  if (lines[i].trim() === '') continue;
  
  const line = lines[i];
  
  // Ajouter la colonne "article_remisable" avec valeur par défaut "true"
  // Insérer après la colonne "remisable" et avant "declinaisons"
  const parts = line.split(',');
  
  // Reconstruire la ligne avec la nouvelle colonne
  const newLine = [
    parts[0], // id
    parts[1], // nom
    parts[2], // reference
    parts[3], // image
    parts[4], // ean13
    parts[5], // categorie
    parts[6], // prix_ht
    parts[7], // prix_ttc
    parts[8], // stock
    parts[9], // remisable
    'true',   // article_remisable (nouvelle colonne)
    parts[10] // declinaisons
  ].join(',');
  
  newCsv += newLine + '\n';
}

// Sauvegarder le nouveau fichier
fs.writeFileSync('bdd-complete-with-variations.csv', newCsv, 'utf8');
console.log('✅ Colonne "article_remisable" ajoutée au fichier CSV');

// Statistiques
const totalLines = lines.length - 1;
console.log(`📈 Statistiques:`);
console.log(`   - Lignes traitées: ${totalLines}`);
console.log(`   - Colonne "article_remisable" ajoutée avec valeur "true" par défaut`); 