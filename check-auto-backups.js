// Script pour vérifier les sauvegardes automatiques disponibles
console.log('🔍 Vérification des sauvegardes automatiques...');

// 1. Vérifier les sauvegardes automatiques dans localStorage
const autoBackups = localStorage.getItem('klick_caisse_auto_backups');
if (autoBackups) {
  try {
    const backups = JSON.parse(autoBackups);
    console.log(`✅ ${backups.length} sauvegardes automatiques trouvées :`);
    backups.forEach((backup, index) => {
      const date = new Date(backup.ts);
      console.log(`  ${index + 1}. ${date.toLocaleString('fr-FR')} - Z${backup.data.zCounter || '?'}`);
      if (backup.data.closures && backup.data.closures.length > 0) {
        console.log(`     📊 ${backup.data.closures.length} clôtures`);
      }
    });
  } catch (e) {
    console.error('❌ Erreur parsing sauvegardes auto:', e);
  }
} else {
  console.log('⚠️ Aucune sauvegarde automatique trouvée');
}

// 2. Vérifier les clôtures actuelles
const currentClosures = localStorage.getItem('klick_caisse_closures');
if (currentClosures) {
  try {
    const closures = JSON.parse(currentClosures);
    console.log(`\n📋 Clôtures actuelles : ${closures.length}`);
    closures.forEach(closure => {
      const date = new Date(closure.closedAt);
      console.log(`  Z${closure.zNumber} - ${date.toLocaleString('fr-FR')} - ${closure.totalTransactions} tickets - ${closure.totalCA}€`);
    });
  } catch (e) {
    console.error('❌ Erreur parsing clôtures:', e);
  }
} else {
  console.log('\n⚠️ Aucune clôture actuelle');
}

// 3. Vérifier le compteur Z
const zCounter = localStorage.getItem('klick_caisse_z_counter');
console.log(`\n🔢 Compteur Z actuel : ${zCounter || 'Non défini'}`);

// 4. Vérifier les transactions par jour
const transactionsByDay = localStorage.getItem('klick_caisse_transactions_by_day');
if (transactionsByDay) {
  try {
    const txMap = JSON.parse(transactionsByDay);
    const days = Object.keys(txMap);
    console.log(`\n📅 Transactions par jour : ${days.length} jours`);
    days.forEach(day => {
      const transactions = txMap[day];
      if (Array.isArray(transactions)) {
        console.log(`  ${day} : ${transactions.length} tickets`);
      }
    });
  } catch (e) {
    console.error('❌ Erreur parsing transactions:', e);
  }
}

console.log('\n✨ Vérification terminée !');
