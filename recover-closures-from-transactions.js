const fs = require('fs');

console.log('=== RÉCUPÉRATION DES CLÔTURES DEPUIS LES TRANSACTIONS ===');

// Lire le fichier de données récupérées
try {
  const recoveredData = JSON.parse(fs.readFileSync('recovered-data.json', 'utf8'));
  
  console.log('📊 Données récupérées:');
  console.log(`  Jours avec transactions: ${Object.keys(recoveredData.transactionsByDay).length}`);
  
  const transactionsByDay = recoveredData.transactionsByDay;
  const closures = [];
  
  // Parcourir chaque jour et créer des clôtures
  Object.keys(transactionsByDay).forEach(date => {
    const transactions = transactionsByDay[date];
    
    if (transactions.length > 0) {
      // Calculer le total CA
      const totalCA = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
      
      // Créer une clôture
      const closure = {
        zNumber: closures.length + 1, // Z1, Z2, etc.
        closedAt: `${date}T23:59:59.000Z`, // Fin de journée
        transactions: transactions,
        totalCA: totalCA,
        totalTransactions: transactions.length
      };
      
      closures.push(closure);
      
      console.log(`📅 ${date}: ${transactions.length} transactions, CA: ${totalCA.toFixed(2)} € -> Z${closure.zNumber}`);
    }
  });
  
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`  Clôtures créées: ${closures.length}`);
  
  if (closures.length > 0) {
    // Créer le script de récupération pour le navigateur
    const recoveryScript = `
// Script de récupération des clôtures depuis les transactions
console.log('=== RÉCUPÉRATION DES CLÔTURES ===');

// Clôtures récupérées depuis les transactions
const recoveredClosures = ${JSON.stringify(closures, null, 2)};

console.log('📊 Clôtures à récupérer:', recoveredClosures.length);

// Sauvegarder les clôtures
if (recoveredClosures.length > 0) {
  localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
  console.log('✅ Clôtures sauvegardées');
  
  // Afficher les détails
  recoveredClosures.forEach(closure => {
    console.log(\`Z\${closure.zNumber}: \${closure.transactions.length} transactions, CA: \${closure.totalCA.toFixed(2)} €\`);
  });
}

// Vérifier la sauvegarde
const savedClosures = localStorage.getItem('klick_caisse_closures');
console.log('📊 Vérification:');
console.log('  Clôtures sauvegardées:', savedClosures ? JSON.parse(savedClosures).length : 0);

alert(\`✅ Récupération terminée! \${recoveredClosures.length} clôtures récupérées. Rechargez la page pour voir les clôtures.\`);
`;

    fs.writeFileSync('recovery-closures-from-transactions.js', recoveryScript);
    console.log('✅ Script de récupération créé: recovery-closures-from-transactions.js');
    
    // Créer aussi un fichier JSON avec les clôtures
    const closuresData = {
      closures: closures,
      recoveredAt: new Date().toISOString(),
      source: 'transactions_by_day'
    };
    
    fs.writeFileSync('recovered-closures.json', JSON.stringify(closuresData, null, 2));
    console.log('✅ Clôtures récupérées sauvegardées: recovered-closures.json');
    
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Ouvrez la console du navigateur (F12)');
    console.log('2. Copiez-collez le contenu de recovery-closures-from-transactions.js');
    console.log('3. Appuyez sur Entrée');
    console.log('4. Rechargez la page pour voir les clôtures');
    
  } else {
    console.log('❌ Aucune transaction trouvée pour créer des clôtures');
  }
  
} catch (error) {
  console.error('❌ Erreur:', error.message);
  console.log('\n📋 Vérifiez que le fichier recovered-data.json existe');
}

console.log('\n✅ Diagnostic terminé!');
