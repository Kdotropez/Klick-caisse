const fs = require('fs');
const path = require('path');

console.log('=== DIAGNOSTIC DES CLÔTURES ===');

// Fonction pour analyser un fichier JSON
function analyzeFile(filePath) {
  try {
    console.log(`\n📁 Analyse de: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Fichier non trouvé');
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    console.log('✅ Fichier JSON valide');
    
    // Vérifier les clôtures
    let closures = [];
    
    // Chercher dans différentes structures possibles
    if (data.closures && Array.isArray(data.closures)) {
      closures = data.closures;
      console.log(`📊 Clôtures trouvées dans data.closures: ${closures.length}`);
    }
    
    if (data.klick_caisse_closures && Array.isArray(data.klick_caisse_closures)) {
      closures = data.klick_caisse_closures;
      console.log(`📊 Clôtures trouvées dans data.klick_caisse_closures: ${closures.length}`);
    }
    
    // Chercher dans localStorage simulé
    if (data.localStorage && data.localStorage.klick_caisse_closures) {
      try {
        const localStorageClosures = JSON.parse(data.localStorage.klick_caisse_closures);
        if (Array.isArray(localStorageClosures)) {
          closures = localStorageClosures;
          console.log(`📊 Clôtures trouvées dans localStorage: ${closures.length}`);
        }
      } catch (e) {
        console.log('❌ Erreur parsing localStorage clôtures');
      }
    }
    
    // Afficher les détails des clôtures
    if (closures.length > 0) {
      console.log('\n📋 Détails des clôtures:');
      closures.forEach((closure, index) => {
        console.log(`  Z${closure.zNumber || '?'} - ${closure.closedAt || 'date inconnue'} - ${closure.transactions?.length || 0} transactions`);
      });
    }
    
    // Vérifier les transactions par jour
    let transactionsByDay = {};
    if (data.transactionsByDay) {
      transactionsByDay = data.transactionsByDay;
      console.log(`📅 Jours avec transactions: ${Object.keys(transactionsByDay).length}`);
    }
    
    if (data.klick_caisse_transactions_by_day) {
      transactionsByDay = data.klick_caisse_transactions_by_day;
      console.log(`📅 Jours avec transactions (klick_caisse_): ${Object.keys(transactionsByDay).length}`);
    }
    
    if (Object.keys(transactionsByDay).length > 0) {
      console.log('\n📅 Jours disponibles:');
      Object.keys(transactionsByDay).forEach(date => {
        const transactions = transactionsByDay[date];
        console.log(`  ${date}: ${transactions.length} transactions`);
      });
    }
    
    return { closures, transactionsByDay };
    
  } catch (error) {
    console.log(`❌ Erreur analyse: ${error.message}`);
    return null;
  }
}

// Analyser tous les fichiers JSON dans le répertoire
const jsonFiles = [
  'klick-caisse-backup-2025-08-11-21-53-40.json',
  'base complete 15 aout.nested.json',
  'base complete 15 aout.nested - Copie.json'
];

let allClosures = [];
let allTransactionsByDay = {};

console.log('\n🔍 Recherche dans les fichiers JSON...');

jsonFiles.forEach(file => {
  const result = analyzeFile(file);
  if (result) {
    allClosures = allClosures.concat(result.closures);
    Object.assign(allTransactionsByDay, result.transactionsByDay);
  }
});

console.log(`\n📊 RÉSUMÉ GLOBAL:`);
console.log(`  Clôtures trouvées: ${allClosures.length}`);
console.log(`  Jours avec transactions: ${Object.keys(allTransactionsByDay).length}`);

// Créer un script de récupération
if (allClosures.length > 0 || Object.keys(allTransactionsByDay).length > 0) {
  console.log('\n🔄 Création du script de récupération...');
  
  let recoveryScript = `
// Script de récupération des clôtures
console.log('=== RÉCUPÉRATION DES CLÔTURES ===');

// Clôtures trouvées
const recoveredClosures = ${JSON.stringify(allClosures, null, 2)};

// Transactions par jour
const recoveredTransactionsByDay = ${JSON.stringify(allTransactionsByDay, null, 2)};

console.log('📊 Clôtures à récupérer:', recoveredClosures.length);
console.log('📅 Jours avec transactions:', Object.keys(recoveredTransactionsByDay).length);

// Sauvegarder les clôtures
if (recoveredClosures.length > 0) {
  localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
  console.log('✅ Clôtures sauvegardées');
}

// Sauvegarder les transactions par jour
if (Object.keys(recoveredTransactionsByDay).length > 0) {
  localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(recoveredTransactionsByDay));
  console.log('✅ Transactions par jour sauvegardées');
}

// Vérifier la sauvegarde
const savedClosures = localStorage.getItem('klick_caisse_closures');
const savedTransactions = localStorage.getItem('klick_caisse_transactions_by_day');

console.log('📊 Vérification:');
console.log('  Clôtures sauvegardées:', savedClosures ? JSON.parse(savedClosures).length : 0);
console.log('  Transactions sauvegardées:', savedTransactions ? Object.keys(JSON.parse(savedTransactions)).length : 0);

alert('✅ Récupération terminée! Rechargez la page pour voir les clôtures.');
`;

  fs.writeFileSync('recovery-closures.js', recoveryScript);
  console.log('✅ Script de récupération créé: recovery-closures.js');
  
  // Créer aussi un fichier JSON avec toutes les données
  const fullData = {
    closures: allClosures,
    transactionsByDay: allTransactionsByDay,
    recoveredAt: new Date().toISOString()
  };
  
  fs.writeFileSync('recovered-data.json', JSON.stringify(fullData, null, 2));
  console.log('✅ Données récupérées sauvegardées: recovered-data.json');
}

console.log('\n✅ Diagnostic terminé!');
