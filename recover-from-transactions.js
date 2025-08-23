// Script pour récupérer les clôtures depuis les transactions quotidiennes
console.log('=== RÉCUPÉRATION DEPUIS LES TRANSACTIONS ===');

// Fonction pour analyser les transactions par jour et créer des clôtures
function recoverClosuresFromTransactions() {
  try {
    // Récupérer les transactions par jour
    const transactionsByDayRaw = localStorage.getItem('klick_caisse_transactions_by_day');
    console.log('📊 Transactions par jour trouvées:', !!transactionsByDayRaw);
    
    if (!transactionsByDayRaw) {
      console.log('❌ Aucune transaction par jour trouvée');
      return [];
    }
    
    const transactionsByDay = JSON.parse(transactionsByDayRaw);
    console.log('📅 Jours avec transactions:', Object.keys(transactionsByDay));
    
    const recoveredClosures = [];
    let zNumber = 1;
    
    // Parcourir chaque jour
    Object.entries(transactionsByDay).forEach(([dateKey, transactions]) => {
      if (Array.isArray(transactions) && transactions.length > 0) {
        console.log(`📅 Jour ${dateKey}: ${transactions.length} transactions`);
        
        // Calculer le total CA
        const totalCA = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
        
        // Créer une clôture
        const closure = {
          zNumber: zNumber++,
          closedAt: dateKey, // La clé est déjà au format YYYY-MM-DD
          transactions: transactions,
          totalCA: totalCA,
          totalTransactions: transactions.length
        };
        
        recoveredClosures.push(closure);
        console.log(`✅ Clôture Z${closure.zNumber - 1} créée pour ${dateKey}: ${totalCA.toFixed(2)} €`);
      }
    });
    
    return recoveredClosures;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    return [];
  }
}

// Fonction pour analyser les transactions globales
function recoverClosuresFromGlobalTransactions() {
  try {
    // Récupérer les transactions globales
    const transactionsRaw = localStorage.getItem('klick_caisse_transactions');
    console.log('📊 Transactions globales trouvées:', !!transactionsRaw);
    
    if (!transactionsRaw) {
      console.log('❌ Aucune transaction globale trouvée');
      return [];
    }
    
    const transactions = JSON.parse(transactionsRaw);
    console.log('📊 Nombre total de transactions:', transactions.length);
    
    // Grouper par date
    const transactionsByDate = {};
    
    transactions.forEach(tx => {
      if (tx.timestamp) {
        const date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (!transactionsByDate[date]) {
          transactionsByDate[date] = [];
        }
        transactionsByDate[date].push(tx);
      }
    });
    
    console.log('📅 Jours trouvés:', Object.keys(transactionsByDate));
    
    const recoveredClosures = [];
    let zNumber = 1;
    
    // Créer des clôtures par jour
    Object.entries(transactionsByDate).forEach(([date, dayTransactions]) => {
      if (dayTransactions.length > 0) {
        console.log(`📅 Jour ${date}: ${dayTransactions.length} transactions`);
        
        // Calculer le total CA
        const totalCA = dayTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
        
        // Créer une clôture
        const closure = {
          zNumber: zNumber++,
          closedAt: date,
          transactions: dayTransactions,
          totalCA: totalCA,
          totalTransactions: dayTransactions.length
        };
        
        recoveredClosures.push(closure);
        console.log(`✅ Clôture Z${closure.zNumber - 1} créée pour ${date}: ${totalCA.toFixed(2)} €`);
      }
    });
    
    return recoveredClosures;
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération globale:', error);
    return [];
  }
}

// Exécuter la récupération
console.log('\n🔍 Récupération depuis les transactions par jour...');
const closuresFromDaily = recoverClosuresFromTransactions();

console.log('\n🔍 Récupération depuis les transactions globales...');
const closuresFromGlobal = recoverClosuresFromGlobalTransactions();

// Combiner et dédupliquer
const allClosures = [...closuresFromDaily, ...closuresFromGlobal];

console.log('\n=== RÉSUMÉ ===');
console.log(`📊 Clôtures récupérées depuis transactions par jour: ${closuresFromDaily.length}`);
console.log(`📊 Clôtures récupérées depuis transactions globales: ${closuresFromGlobal.length}`);
console.log(`📊 Total: ${allClosures.length}`);

if (allClosures.length > 0) {
  // Dédupliquer par date
  const uniqueClosures = [];
  const seenDates = new Set();
  
  allClosures.forEach(closure => {
    if (!seenDates.has(closure.closedAt)) {
      seenDates.add(closure.closedAt);
      uniqueClosures.push(closure);
    }
  });
  
  console.log(`📊 Clôtures uniques (après déduplication): ${uniqueClosures.length}`);
  
  // Trier par date
  uniqueClosures.sort((a, b) => a.closedAt.localeCompare(b.closedAt));
  
  console.log('\n📅 Clôtures récupérées:');
  uniqueClosures.forEach((closure, index) => {
    const date = new Date(closure.closedAt).toLocaleDateString('fr-FR');
    console.log(`  ${index + 1}. Z${closure.zNumber} - ${date} - ${closure.totalCA.toFixed(2)} € (${closure.totalTransactions} transactions)`);
  });
  
  // Sauvegarder dans localStorage
  console.log('\n💾 Sauvegarde dans localStorage...');
  localStorage.setItem('klick_caisse_closures', JSON.stringify(uniqueClosures));
  
  // Vérifier la sauvegarde
  const saved = localStorage.getItem('klick_caisse_closures');
  const parsed = JSON.parse(saved);
  console.log(`✅ Vérification: ${parsed.length} clôtures sauvegardées`);
  
  console.log('\n🔄 Rechargez la page pour voir les clôtures dans le rapport historique!');
  
} else {
  console.log('❌ Aucune clôture récupérée');
}

console.log('\n=== FIN ===');
