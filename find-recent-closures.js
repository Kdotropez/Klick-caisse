const fs = require('fs');
const path = require('path');

console.log('=== RECHERCHE DES CLÔTURES Z1 ET Z2 ===');

// Fonction pour chercher des clôtures dans un fichier JSON
function searchClosuresInFile(filePath) {
  try {
    console.log(`\n🔍 Analyse de: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier non trouvé');
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`📊 Taille: ${(content.length / 1024).toFixed(1)} KB`);
    
    // Chercher les clôtures dans différentes structures
    let closures = null;
    let foundIn = '';
    
    // Structure 1: clôtures directes
    if (data.closures && Array.isArray(data.closures)) {
      closures = data.closures;
      foundIn = 'clôtures directes';
    }
    // Structure 2: dans localStorage
    else if (data.localStorage && data.localStorage.klick_caisse_closures) {
      try {
        closures = JSON.parse(data.localStorage.klick_caisse_closures);
        foundIn = 'localStorage';
      } catch (e) {
        console.log('❌ Erreur parsing localStorage clôtures');
      }
    }
    // Structure 3: chercher dans toute la structure
    else {
      const searchInObject = (obj, depth = 0) => {
        if (depth > 5) return null;
        
        for (const [key, value] of Object.entries(obj)) {
          if (key === 'closures' && Array.isArray(value)) {
            return value;
          }
          if (key === 'klick_caisse_closures' && typeof value === 'string') {
            try {
              return JSON.parse(value);
            } catch (e) {
              console.log('❌ Erreur parsing klick_caisse_closures');
            }
          }
          if (typeof value === 'object' && value !== null) {
            const found = searchInObject(value, depth + 1);
            if (found) return found;
          }
        }
        return null;
      };
      
      closures = searchInObject(data);
      if (closures) {
        foundIn = 'recherche approfondie';
      }
    }
    
    if (closures && Array.isArray(closures)) {
      console.log(`✅ Clôtures trouvées (${foundIn}): ${closures.length}`);
      
      // Chercher spécifiquement Z1 et Z2
      const z1 = closures.find(c => c.zNumber === 1);
      const z2 = closures.find(c => c.zNumber === 2);
      
      if (z1) {
        console.log(`🎯 Z1 trouvé:`);
        console.log(`   - Date: ${z1.closedAt}`);
        console.log(`   - Transactions: ${z1.transactions?.length || 0}`);
        if (z1.transactions && z1.transactions.length > 0) {
          const totalCA = z1.transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
          console.log(`   - CA Total: ${totalCA.toFixed(2)} €`);
          console.log(`   - Premier ticket: ${z1.transactions[0].id || 'N/A'}`);
        }
      } else {
        console.log(`❌ Z1 non trouvé`);
      }
      
      if (z2) {
        console.log(`🎯 Z2 trouvé:`);
        console.log(`   - Date: ${z2.closedAt}`);
        console.log(`   - Transactions: ${z2.transactions?.length || 0}`);
        if (z2.transactions && z2.transactions.length > 0) {
          const totalCA = z2.transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
          console.log(`   - CA Total: ${totalCA.toFixed(2)} €`);
          console.log(`   - Premier ticket: ${z2.transactions[0].id || 'N/A'}`);
        }
      } else {
        console.log(`❌ Z2 non trouvé`);
      }
      
      // Afficher toutes les clôtures trouvées
      console.log('\n📋 Toutes les clôtures:');
      closures.forEach((closure, index) => {
        const date = new Date(closure.closedAt).toLocaleDateString('fr-FR');
        const totalCA = closure.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
        console.log(`  ${index + 1}. Z${closure.zNumber} - ${date} - ${totalCA.toFixed(2)} € (${closure.transactions?.length || 0} transactions)`);
      });
      
      return { closures, foundIn };
    } else {
      console.log('❌ Aucune clôture trouvée dans ce fichier');
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
    return null;
  }
}

// Analyser tous les fichiers JSON possibles
const jsonFiles = [
  'klick-caisse-backup-2025-08-11-21-53-40.json',
  'base complete 15 aout.nested.json',
  'base complete 15 aout.nested.2025-08-16T18-26-22-320Z.bak.json',
  'base complete 15 aout.nested.2025-08-16T18-33-23-571Z.bak.json',
  'base complete 15 aout.nested - Copie.json',
  'EXPORT_COMBINE_ARTICLES_DECLINAISONS.nested.json',
  'EXPORT_COMBINE_ARTICLES_DECLINAISONS.flat.json'
];

let foundClosures = [];

jsonFiles.forEach(file => {
  const result = searchClosuresInFile(file);
  if (result && result.closures) {
    foundClosures.push({
      file,
      closures: result.closures,
      foundIn: result.foundIn
    });
  }
});

console.log('\n=== RÉSUMÉ ===');
console.log(`📊 Fichiers avec clôtures: ${foundClosures.length}`);

if (foundClosures.length > 0) {
  // Combiner toutes les clôtures trouvées
  let allClosures = [];
  foundClosures.forEach(({ file, closures }) => {
    allClosures = allClosures.concat(closures);
  });
  
  // Dédupliquer par Z Number
  const uniqueClosures = [];
  const seenZNumbers = new Set();
  
  allClosures.forEach(closure => {
    if (!seenZNumbers.has(closure.zNumber)) {
      seenZNumbers.add(closure.zNumber);
      uniqueClosures.push(closure);
    }
  });
  
  console.log(`📊 Clôtures uniques trouvées: ${uniqueClosures.length}`);
  
  // Trier par Z Number
  uniqueClosures.sort((a, b) => a.zNumber - b.zNumber);
  
  console.log('\n📅 Clôtures par ordre Z:');
  uniqueClosures.forEach((closure) => {
    const date = new Date(closure.closedAt).toLocaleDateString('fr-FR');
    const totalCA = closure.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
    console.log(`  Z${closure.zNumber} - ${date} - ${totalCA.toFixed(2)} € (${closure.transactions?.length || 0} transactions)`);
  });
  
  // Vérifier si Z1 et Z2 sont présents
  const hasZ1 = uniqueClosures.some(c => c.zNumber === 1);
  const hasZ2 = uniqueClosures.some(c => c.zNumber === 2);
  
  console.log(`\n🎯 Vérification:`);
  console.log(`  Z1: ${hasZ1 ? '✅ Trouvé' : '❌ Manquant'}`);
  console.log(`  Z2: ${hasZ2 ? '✅ Trouvé' : '❌ Manquant'}`);
  
  if (hasZ1 && hasZ2) {
    console.log('\n✅ Z1 et Z2 trouvés! Création du script d\'import...');
    
    // Créer un script pour importer dans localStorage
    const importScript = `
// Script pour importer les clôtures Z1 et Z2 dans localStorage
console.log('=== IMPORT DES CLÔTURES Z1 ET Z2 ===');

const recoveredClosures = ${JSON.stringify(uniqueClosures, null, 2)};

console.log(\`📊 Import de \${recoveredClosures.length} clôtures...\`);

// Sauvegarder dans localStorage
localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));

console.log('✅ Clôtures importées avec succès!');
console.log('🔄 Rechargez la page pour voir les clôtures dans le rapport historique.');

// Vérifier l'import
const saved = localStorage.getItem('klick_caisse_closures');
const parsed = JSON.parse(saved);
console.log(\`📋 Vérification: \${parsed.length} clôtures sauvegardées\`);

// Afficher les Z1 et Z2
const z1 = parsed.find(c => c.zNumber === 1);
const z2 = parsed.find(c => c.zNumber === 2);

if (z1) {
  const totalCA1 = z1.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
  console.log(\`✅ Z1: \${new Date(z1.closedAt).toLocaleDateString('fr-FR')} - \${totalCA1.toFixed(2)} €\`);
}

if (z2) {
  const totalCA2 = z2.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
  console.log(\`✅ Z2: \${new Date(z2.closedAt).toLocaleDateString('fr-FR')} - \${totalCA2.toFixed(2)} €\`);
}
`;

    fs.writeFileSync('import-z1-z2.js', importScript);
    console.log(`📝 Script d'import créé: import-z1-z2.js`);
    
  } else {
    console.log('\n❌ Z1 ou Z2 manquant. Vérifiez les sauvegardes.');
  }
  
} else {
  console.log('❌ Aucune clôture trouvée dans les fichiers analysés');
}

console.log('\n=== FIN ===');
