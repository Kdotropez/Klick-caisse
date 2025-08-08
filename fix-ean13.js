const fs = require('fs');

console.log('🔧 Correction du format des EAN13...');

// Fonction pour convertir le format scientifique en EAN13 standard
function fixEan13(ean13Str) {
  if (!ean13Str || ean13Str === '') return '';
  
  // Nettoyer la chaîne
  let cleanEan = ean13Str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
  
  // Si c'est déjà un format numérique simple, le retourner
  if (/^\d{13}$/.test(cleanEan)) {
    return cleanEan;
  }
  
  // Si c'est au format scientifique (ex: 2,06714E+12)
  if (cleanEan.includes('E') || cleanEan.includes('e')) {
    try {
      // Convertir en nombre
      const number = parseFloat(cleanEan.replace(',', '.'));
      if (!isNaN(number)) {
        // Convertir en chaîne et s'assurer qu'il y a 13 chiffres
        const fullNumber = Math.floor(number).toString();
        if (fullNumber.length >= 13) {
          return fullNumber.substring(0, 13);
        } else {
          // Ajouter des zéros si nécessaire
          return fullNumber.padEnd(13, '0');
        }
      }
    } catch (error) {
      console.log(`❌ Erreur conversion EAN13: ${cleanEan}`);
    }
  }
  
  // Si c'est un format avec virgules (ex: 2,067,140,000,577)
  if (cleanEan.includes(',')) {
    const digitsOnly = cleanEan.replace(/,/g, '');
    if (/^\d{13}$/.test(digitsOnly)) {
      return digitsOnly;
    }
  }
  
  // Si rien ne fonctionne, retourner la chaîne originale
  return cleanEan;
}

try {
  // Lire le fichier de données
  const dataPath = './src/data/productionData.ts';
  let content = fs.readFileSync(dataPath, 'utf8');
  
  console.log('📖 Fichier lu, correction des EAN13...');
  
  // Compter les EAN13 avant correction
  const beforeCount = (content.match(/"ean13":/g) || []).length;
  console.log(`📊 EAN13 trouvés: ${beforeCount}`);
  
  // Remplacer tous les EAN13
  content = content.replace(/"ean13":\s*"([^"]*)"/g, (match, ean13Value) => {
    const fixedEan = fixEan13(ean13Value);
    if (fixedEan !== ean13Value) {
      console.log(`🔄 ${ean13Value} → ${fixedEan}`);
    }
    return `"ean13": "${fixedEan}"`;
  });
  
  // Écrire le fichier corrigé
  fs.writeFileSync(dataPath, content, 'utf8');
  
  console.log('✅ EAN13 corrigés avec succès !');
  console.log('📝 Format standardisé: 13 chiffres sans format scientifique');
  
  // Vérifier quelques exemples
  const examples = content.match(/"ean13":\s*"([^"]*)"/g);
  if (examples) {
    console.log('\n📋 Exemples d\'EAN13 corrigés:');
    examples.slice(0, 5).forEach(example => {
      const ean = example.match(/"ean13":\s*"([^"]*)"/)[1];
      console.log(`   - ${ean}`);
    });
  }
  
} catch (error) {
  console.error('❌ Erreur lors de la correction:', error);
  process.exit(1);
} 