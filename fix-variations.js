const fs = require('fs');

console.log('🔧 Nettoyage des variations...');

try {
  // Lire le fichier de données
  const dataPath = './src/data/productionData.ts';
  let content = fs.readFileSync(dataPath, 'utf8');
  
  console.log('📖 Fichier lu, nettoyage en cours...');
  
  // Supprimer la propriété "stock" de toutes les variations
  // Pattern: "stock": number, ou "stock": number}
  content = content.replace(/"stock":\s*\d+(?:\.\d+)?,?\s*/g, '');
  
  // Nettoyer les virgules en trop qui pourraient rester
  content = content.replace(/,\s*}/g, '}');
  content = content.replace(/,\s*]/g, ']');
  
  // Écrire le fichier nettoyé
  fs.writeFileSync(dataPath, content, 'utf8');
  
  console.log('✅ Variations nettoyées avec succès !');
  console.log('🗑️  Propriété "stock" supprimée de toutes les variations');
  
} catch (error) {
  console.error('❌ Erreur lors du nettoyage:', error);
  process.exit(1);
} 