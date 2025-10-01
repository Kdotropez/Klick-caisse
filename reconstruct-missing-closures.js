// Script pour reconstruire les clôtures Z manquantes à partir des transactions
console.log('🔧 Reconstruction des clôtures Z manquantes...');

// 1. Récupérer toutes les transactions archivées
function getAllArchivedTransactions() {
  const transactionsByDay = localStorage.getItem('klick_caisse_transactions_by_day');
  if (!transactionsByDay) {
    console.log('❌ Aucune transaction archivée trouvée');
    return [];
  }
  
  try {
    const txMap = JSON.parse(transactionsByDay);
    const allTransactions = [];
    
    // Parcourir tous les jours
    Object.keys(txMap).forEach(day => {
      if (Array.isArray(txMap[day])) {
        txMap[day].forEach(tx => {
          allTransactions.push({
            ...tx,
            day: day
          });
        });
      }
    });
    
    console.log(`📊 ${allTransactions.length} transactions archivées trouvées`);
    return allTransactions;
  } catch (e) {
    console.error('❌ Erreur lecture transactions:', e);
    return [];
  }
}

// 2. Reconstruire les clôtures manquantes
function reconstructMissingClosures() {
  const allTransactions = getAllArchivedTransactions();
  const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
  
  // Identifier les gaps
  const existingZNumbers = new Set(currentClosures.map(c => c.zNumber));
  const missingZNumbers = [];
  
  for (let z = 1; z <= 50; z++) {
    if (!existingZNumbers.has(z)) {
      missingZNumbers.push(z);
    }
  }
  
  console.log(`🕳️ Z manquants détectés: ${missingZNumbers.join(', ')}`);
  
  // Grouper les transactions par jour
  const transactionsByDay = {};
  allTransactions.forEach(tx => {
    if (!transactionsByDay[tx.day]) {
      transactionsByDay[tx.day] = [];
    }
    transactionsByDay[tx.day].push(tx);
  });
  
  // Reconstruire les clôtures manquantes
  const reconstructedClosures = [];
  const days = Object.keys(transactionsByDay).sort();
  
  missingZNumbers.forEach((zNumber, index) => {
    const day = days[index];
    if (day && transactionsByDay[day]) {
      const dayTransactions = transactionsByDay[day];
      const totalCA = dayTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
      const totalTransactions = dayTransactions.length;
      
      // Calculer les remises
      let totalDiscounts = 0;
      dayTransactions.forEach(tx => {
        if (tx.globalDiscount) {
          totalDiscounts += tx.globalDiscount;
        }
        if (tx.itemDiscounts) {
          Object.values(tx.itemDiscounts).forEach((discount: any) => {
            if (discount.type === 'euro') {
              totalDiscounts += (discount.value || 0) * (tx.items?.length || 0);
            }
          });
        }
      });
      
      const netCA = totalCA - totalDiscounts;
      
      const reconstructedClosure = {
        zNumber: zNumber,
        closedAt: new Date(day + 'T23:59:59.000Z').toISOString(),
        transactions: dayTransactions,
        totalCA: netCA,
        totalTransactions: totalTransactions,
        totalDiscounts: totalDiscounts,
        reconstructed: true // Marquer comme reconstruite
      };
      
      reconstructedClosures.push(reconstructedClosure);
      console.log(`✅ Z${zNumber} reconstruit pour le ${day}: ${totalTransactions} tickets, ${netCA}€`);
    }
  });
  
  return reconstructedClosures;
}

// 3. Exécuter la reconstruction
try {
  const reconstructedClosures = reconstructMissingClosures();
  
  if (reconstructedClosures.length > 0) {
    // Fusionner avec les clôtures existantes
    const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
    const allClosures = [...currentClosures, ...reconstructedClosures];
    allClosures.sort((a, b) => a.zNumber - b.zNumber);
    
    // Sauvegarder
    localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
    
    // Mettre à jour le compteur Z
    const maxZ = Math.max(...allClosures.map(c => c.zNumber));
    localStorage.setItem('klick_caisse_z_counter', String(maxZ));
    
    console.log(`🎉 Reconstruction terminée !`);
    console.log(`📊 ${reconstructedClosures.length} clôtures reconstruites`);
    console.log(`📋 Total: ${allClosures.length} clôtures`);
    
    const zNumbers = allClosures.map(c => c.zNumber);
    console.log(`📈 Séquence Z: ${zNumbers.join(' → ')}`);
    
    alert(`🎉 Reconstruction réussie !\n\n` +
          `📊 ${reconstructedClosures.length} clôtures reconstruites\n` +
          `📋 Total: ${allClosures.length} clôtures\n` +
          `📈 Séquence: ${zNumbers.join(' → ')}\n\n` +
          `Les clôtures ont été reconstruites à partir des transactions archivées.`);
    
  } else {
    console.log('ℹ️ Aucune clôture à reconstruire');
    alert('ℹ️ Aucune clôture manquante détectée ou aucune transaction archivée disponible.');
  }
  
} catch (e) {
  console.error('❌ Erreur reconstruction:', e);
  alert('❌ Erreur lors de la reconstruction: ' + e.message);
}

console.log('✨ Reconstruction terminée !');
