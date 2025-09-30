// Script pour récupérer les clôtures manquantes depuis les sauvegardes automatiques
console.log('🔄 Récupération des clôtures manquantes...');

// 1. Récupérer les clôtures actuelles
let currentClosures = [];
try {
  const current = localStorage.getItem('klick_caisse_closures');
  if (current) {
    currentClosures = JSON.parse(current);
  }
} catch (e) {
  console.error('❌ Erreur lecture clôtures actuelles:', e);
}

console.log(`📋 Clôtures actuelles : ${currentClosures.length}`);

// 2. Récupérer toutes les sauvegardes automatiques
let allBackups = [];
try {
  const autoBackups = localStorage.getItem('klick_caisse_auto_backups');
  if (autoBackups) {
    allBackups = JSON.parse(autoBackups);
  }
} catch (e) {
  console.error('❌ Erreur lecture sauvegardes:', e);
}

console.log(`💾 Sauvegardes disponibles : ${allBackups.length}`);

// 3. Collecter toutes les clôtures des sauvegardes
let recoveredClosures = [];
let allClosureNumbers = new Set();

// Ajouter les clôtures actuelles
currentClosures.forEach(closure => {
  allClosureNumbers.add(closure.zNumber);
});

// Parcourir toutes les sauvegardes pour trouver des clôtures manquantes
allBackups.forEach((backup, index) => {
  if (backup.data && backup.data.closures) {
    console.log(`🔍 Analyse sauvegarde ${index + 1} (${new Date(backup.ts).toLocaleString('fr-FR')})`);
    
    backup.data.closures.forEach(closure => {
      if (!allClosureNumbers.has(closure.zNumber)) {
        console.log(`  ✅ Clôture Z${closure.zNumber} trouvée et récupérée !`);
        recoveredClosures.push(closure);
        allClosureNumbers.add(closure.zNumber);
      }
    });
  }
});

console.log(`\n🎯 Résultat : ${recoveredClosures.length} clôtures récupérées`);

// 4. Fusionner avec les clôtures actuelles
if (recoveredClosures.length > 0) {
  const allClosures = [...currentClosures, ...recoveredClosures];
  
  // Trier par numéro Z
  allClosures.sort((a, b) => a.zNumber - b.zNumber);
  
  // Sauvegarder
  try {
    localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
    console.log(`✅ ${allClosures.length} clôtures sauvegardées au total`);
    
    // Afficher le résumé
    console.log('\n📊 Résumé des clôtures :');
    allClosures.forEach(closure => {
      const date = new Date(closure.closedAt);
      const recovered = recoveredClosures.some(rc => rc.zNumber === closure.zNumber);
      const marker = recovered ? '🔄' : '✅';
      console.log(`  ${marker} Z${closure.zNumber} - ${date.toLocaleString('fr-FR')} - ${closure.totalTransactions} tickets - ${closure.totalCA}€`);
    });
    
    // Mettre à jour le compteur Z si nécessaire
    const maxZ = Math.max(...allClosures.map(c => c.zNumber));
    const currentCounter = parseInt(localStorage.getItem('klick_caisse_z_counter') || '0');
    
    if (maxZ > currentCounter) {
      localStorage.setItem('klick_caisse_z_counter', String(maxZ));
      console.log(`🔢 Compteur Z mis à jour : ${maxZ}`);
    }
    
  } catch (e) {
    console.error('❌ Erreur sauvegarde clôtures:', e);
  }
} else {
  console.log('ℹ️ Aucune clôture manquante trouvée');
}

console.log('\n✨ Récupération terminée !');
