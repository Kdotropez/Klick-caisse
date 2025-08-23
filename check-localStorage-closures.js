// Script pour vérifier le localStorage et récupérer les clôtures Z1 et Z2
console.log('=== VÉRIFICATION LOCALSTORAGE ===');

// Fonction pour vérifier le localStorage
function checkLocalStorage() {
  try {
    console.log('🔍 Vérification du localStorage...');
    
    // Vérifier toutes les clés
    const allKeys = Object.keys(localStorage);
    console.log('📋 Toutes les clés localStorage:', allKeys);
    
    // Chercher les clés liées à klick_caisse
    const klickKeys = allKeys.filter(key => key.includes('klick_caisse'));
    console.log('🔑 Clés klick_caisse:', klickKeys);
    
    // Vérifier spécifiquement les clôtures
    const closuresKey = 'klick_caisse_closures';
    const closuresRaw = localStorage.getItem(closuresKey);
    console.log('📊 Clôtures dans localStorage:', !!closuresRaw);
    
    if (closuresRaw) {
      try {
        const closures = JSON.parse(closuresRaw);
        console.log('✅ Clôtures parsées:', closures);
        console.log('📊 Nombre de clôtures:', closures.length);
        
        if (Array.isArray(closures) && closures.length > 0) {
          console.log('\n📋 Détail des clôtures:');
          closures.forEach((closure, index) => {
            const date = new Date(closure.closedAt).toLocaleDateString('fr-FR');
            const totalCA = closure.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
            console.log(`  ${index + 1}. Z${closure.zNumber} - ${date} - ${totalCA.toFixed(2)} € (${closure.transactions?.length || 0} transactions)`);
          });
          
          // Chercher Z1 et Z2
          const z1 = closures.find(c => c.zNumber === 1);
          const z2 = closures.find(c => c.zNumber === 2);
          
          console.log('\n🎯 Vérification Z1 et Z2:');
          if (z1) {
            const totalCA1 = z1.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
            console.log(`  ✅ Z1 trouvé: ${new Date(z1.closedAt).toLocaleDateString('fr-FR')} - ${totalCA1.toFixed(2)} €`);
          } else {
            console.log('  ❌ Z1 non trouvé');
          }
          
          if (z2) {
            const totalCA2 = z2.transactions?.reduce((sum, tx) => sum + (tx.total || 0), 0) || 0;
            console.log(`  ✅ Z2 trouvé: ${new Date(z2.closedAt).toLocaleDateString('fr-FR')} - ${totalCA2.toFixed(2)} €`);
          } else {
            console.log('  ❌ Z2 non trouvé');
          }
          
          return closures;
        } else {
          console.log('❌ Clôtures vides ou invalides');
          return null;
        }
      } catch (error) {
        console.error('❌ Erreur parsing clôtures:', error);
        return null;
      }
    } else {
      console.log('❌ Aucune clôture trouvée dans localStorage');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
    return null;
  }
}

// Vérifier les transactions par jour
function checkTransactionsByDay() {
  try {
    console.log('\n🔍 Vérification des transactions par jour...');
    
    const transactionsByDayRaw = localStorage.getItem('klick_caisse_transactions_by_day');
    console.log('📊 Transactions par jour trouvées:', !!transactionsByDayRaw);
    
    if (transactionsByDayRaw) {
      const transactionsByDay = JSON.parse(transactionsByDayRaw);
      console.log('📅 Jours avec transactions:', Object.keys(transactionsByDay));
      
      // Créer des clôtures depuis les transactions
      const recoveredClosures = [];
      let zNumber = 1;
      
      Object.entries(transactionsByDay).forEach(([dateKey, transactions]) => {
        if (Array.isArray(transactions) && transactions.length > 0) {
          console.log(`📅 Jour ${dateKey}: ${transactions.length} transactions`);
          
          const totalCA = transactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
          
          const closure = {
            zNumber: zNumber++,
            closedAt: dateKey,
            transactions: transactions,
            totalCA: totalCA,
            totalTransactions: transactions.length
          };
          
          recoveredClosures.push(closure);
          console.log(`✅ Clôture Z${closure.zNumber - 1} créée pour ${dateKey}: ${totalCA.toFixed(2)} €`);
        }
      });
      
      return recoveredClosures;
    } else {
      console.log('❌ Aucune transaction par jour trouvée');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des transactions:', error);
    return [];
  }
}

// Exécuter les vérifications
console.log('=== DÉBUT DES VÉRIFICATIONS ===');

const existingClosures = checkLocalStorage();
const recoveredClosures = checkTransactionsByDay();

console.log('\n=== RÉSUMÉ ===');

if (existingClosures && existingClosures.length > 0) {
  console.log(`✅ ${existingClosures.length} clôtures existantes dans localStorage`);
  
  const z1 = existingClosures.find(c => c.zNumber === 1);
  const z2 = existingClosures.find(c => c.zNumber === 2);
  
  if (z1 && z2) {
    console.log('🎯 Z1 et Z2 trouvés dans localStorage!');
    console.log('✅ Vos clôtures sont déjà sauvegardées.');
  } else {
    console.log('⚠️ Z1 ou Z2 manquant dans localStorage');
  }
} else {
  console.log('❌ Aucune clôture existante dans localStorage');
}

if (recoveredClosures.length > 0) {
  console.log(`📊 ${recoveredClosures.length} clôtures récupérées depuis les transactions`);
  
  const z1 = recoveredClosures.find(c => c.zNumber === 1);
  const z2 = recoveredClosures.find(c => c.zNumber === 2);
  
  if (z1 && z2) {
    console.log('🎯 Z1 et Z2 récupérés depuis les transactions!');
    console.log('💾 Sauvegarde dans localStorage...');
    
    // Sauvegarder dans localStorage
    localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
    
    // Vérifier la sauvegarde
    const saved = localStorage.getItem('klick_caisse_closures');
    const parsed = JSON.parse(saved);
    console.log(`✅ ${parsed.length} clôtures sauvegardées`);
    
    console.log('\n🔄 Rechargez la page pour voir les clôtures dans le rapport historique!');
  } else {
    console.log('⚠️ Z1 ou Z2 manquant dans les transactions récupérées');
  }
} else {
  console.log('❌ Aucune clôture récupérée depuis les transactions');
}

console.log('\n=== FIN ===');
