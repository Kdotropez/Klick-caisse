const fs = require('fs');
const path = require('path');

console.log('=== RÉCUPÉRATION DES CLÔTURES ===');

// Fonction pour analyser un fichier de sauvegarde
function analyzeBackupFile(filePath) {
  try {
    console.log(`\n📁 Analyse de: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier non trouvé');
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    console.log(`📊 Taille du fichier: ${(content.length / 1024).toFixed(1)} KB`);
    console.log(`🔍 Type de données: ${typeof data}`);
    console.log(`📋 Clés principales:`, Object.keys(data));
    
    // Chercher les clôtures dans différentes structures possibles
    let closures = null;
    
    // Structure 1: clôtures directes
    if (data.closures && Array.isArray(data.closures)) {
      closures = data.closures;
      console.log(`✅ Clôtures trouvées (direct): ${closures.length}`);
    }
    // Structure 2: dans localStorage
    else if (data.localStorage && data.localStorage.klick_caisse_closures) {
      try {
        closures = JSON.parse(data.localStorage.klick_caisse_closures);
        console.log(`✅ Clôtures trouvées (localStorage): ${closures.length}`);
      } catch (e) {
        console.log('❌ Erreur parsing localStorage clôtures');
      }
    }
    // Structure 3: dans data
    else if (data.data && data.data.closures) {
      closures = data.data.closures;
      console.log(`✅ Clôtures trouvées (data): ${closures.length}`);
    }
    // Structure 4: chercher dans toute la structure
    else {
      console.log('🔍 Recherche approfondie...');
      const searchInObject = (obj, depth = 0) => {
        if (depth > 5) return null; // Éviter la récursion infinie
        
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
        console.log(`✅ Clôtures trouvées (recherche): ${closures.length}`);
      }
    }
    
    if (closures && Array.isArray(closures)) {
      console.log('\n📋 Détail des clôtures:');
      closures.forEach((closure, index) => {
        console.log(`  Clôture ${index + 1}:`);
        console.log(`    - Z Number: ${closure.zNumber}`);
        console.log(`    - Date: ${closure.closedAt}`);
        console.log(`    - Transactions: ${closure.transactions?.length || 0}`);
        if (closure.transactions && closure.transactions.length > 0) {
          console.log(`    - Premier ticket: ${closure.transactions[0].id || 'N/A'}`);
          console.log(`    - Total CA: ${closure.transactions.reduce((sum, tx) => sum + (tx.total || 0), 0).toFixed(2)} €`);
        }
      });
      
      return closures;
    } else {
      console.log('❌ Aucune clôture trouvée dans ce fichier');
      return null;
    }
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'analyse de ${filePath}:`, error.message);
    return null;
  }
}

// Analyser les fichiers de sauvegarde
const backupFiles = [
  'klick-caisse-backup-2025-08-11-21-53-40.json',
  'base complete 15 aout.nested.json',
  'base complete 15 aout.nested.2025-08-16T18-26-22-320Z.bak.json',
  'base complete 15 aout.nested.2025-08-16T18-33-23-571Z.bak.json'
];

let allClosures = [];

backupFiles.forEach(file => {
  const closures = analyzeBackupFile(file);
  if (closures) {
    allClosures = allClosures.concat(closures);
  }
});

console.log('\n=== RÉSUMÉ ===');
console.log(`📊 Total des clôtures trouvées: ${allClosures.length}`);

if (allClosures.length > 0) {
  // Dédupliquer par Z Number
  const uniqueClosures = [];
  const seenZNumbers = new Set();
  
  allClosures.forEach(closure => {
    if (!seenZNumbers.has(closure.zNumber)) {
      seenZNumbers.add(closure.zNumber);
      uniqueClosures.push(closure);
    }
  });
  
  console.log(`📊 Clôtures uniques (après déduplication): ${uniqueClosures.length}`);
  
  // Trier par date
  uniqueClosures.sort((a, b) => new Date(a.closedAt) - new Date(b.closedAt));
  
  console.log('\n📅 Clôtures par ordre chronologique:');
  uniqueClosures.forEach((closure, index) => {
    const date = new Date(closure.closedAt).toLocaleDateString('fr-FR');
    const totalCA = closure.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
    console.log(`  ${index + 1}. Z${closure.zNumber} - ${date} - ${totalCA.toFixed(2)} € (${closure.transactions?.length || 0} transactions)`);
  });
  
  // Sauvegarder les clôtures récupérées
  const recoveredClosuresFile = 'recovered-closures.json';
  fs.writeFileSync(recoveredClosuresFile, JSON.stringify(uniqueClosures, null, 2));
  console.log(`\n💾 Clôtures sauvegardées dans: ${recoveredClosuresFile}`);
  
  // Créer un script pour importer dans localStorage
  const importScript = `
// Script pour importer les clôtures récupérées dans localStorage
console.log('=== IMPORT DES CLÔTURES RÉCUPÉRÉES ===');

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
`;

  fs.writeFileSync('import-closures.js', importScript);
  console.log(`📝 Script d'import créé: import-closures.js`);
  
} else {
  console.log('❌ Aucune clôture trouvée dans les sauvegardes');
}

console.log('\n=== FIN ===');
