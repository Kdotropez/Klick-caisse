// Script spécialisé pour récupérer les clôtures manquantes avec sauts de numérotation
console.log('🔍 Récupération des clôtures manquantes (sauts Z30→Z34→Z38)...');

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
if (currentClosures.length > 0) {
  const zNumbers = currentClosures.map(c => c.zNumber).sort((a, b) => a - b);
  console.log(`📊 Numéros Z actuels : ${zNumbers.join(', ')}`);
}

// 2. Identifier les gaps
const zNumbers = currentClosures.map(c => c.zNumber).sort((a, b) => a - b);
const gaps = [];
for (let i = 0; i < zNumbers.length - 1; i++) {
  const current = zNumbers[i];
  const next = zNumbers[i + 1];
  if (next - current > 1) {
    for (let missing = current + 1; missing < next; missing++) {
      gaps.push(missing);
    }
  }
}

console.log(`🕳️ Clôtures manquantes détectées : Z${gaps.join(', Z')}`);

// 3. Récupérer toutes les sauvegardes automatiques
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

// 4. Chercher les clôtures manquantes dans les sauvegardes
let recoveredClosures = [];
let foundGaps = new Set();

allBackups.forEach((backup, index) => {
  if (backup.data && backup.data.closures) {
    const backupDate = new Date(backup.ts).toLocaleString('fr-FR');
    console.log(`🔍 Analyse sauvegarde ${index + 1} (${backupDate})`);
    
    backup.data.closures.forEach(closure => {
      if (gaps.includes(closure.zNumber) && !foundGaps.has(closure.zNumber)) {
        console.log(`  ✅ Clôture Z${closure.zNumber} récupérée ! (${closure.totalTransactions} tickets, ${closure.totalCA}€)`);
        recoveredClosures.push(closure);
        foundGaps.add(closure.zNumber);
      }
    });
  }
});

// 5. Afficher le résultat
console.log(`\n🎯 Récupération : ${recoveredClosures.length}/${gaps.length} clôtures manquantes trouvées`);

if (recoveredClosures.length > 0) {
  console.log('\n📊 Clôtures récupérées :');
  recoveredClosures.forEach(closure => {
    const date = new Date(closure.closedAt);
    console.log(`  🔄 Z${closure.zNumber} - ${date.toLocaleString('fr-FR')} - ${closure.totalTransactions} tickets - ${closure.totalCA}€`);
  });
  
  // 6. Fusionner avec les clôtures actuelles
  const allClosures = [...currentClosures, ...recoveredClosures];
  allClosures.sort((a, b) => a.zNumber - b.zNumber);
  
  // 7. Sauvegarder
  try {
    localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
    console.log(`\n✅ ${allClosures.length} clôtures sauvegardées au total`);
    
    // Afficher la séquence complète
    const finalZNumbers = allClosures.map(c => c.zNumber).sort((a, b) => a - b);
    console.log(`📈 Séquence Z complète : ${finalZNumbers.join(' → ')}`);
    
    // Vérifier s'il reste des gaps
    const remainingGaps = [];
    for (let i = 0; i < finalZNumbers.length - 1; i++) {
      const current = finalZNumbers[i];
      const next = finalZNumbers[i + 1];
      if (next - current > 1) {
        for (let missing = current + 1; missing < next; missing++) {
          remainingGaps.push(missing);
        }
      }
    }
    
    if (remainingGaps.length > 0) {
      console.log(`⚠️ Gaps restants : Z${remainingGaps.join(', Z')}`);
      console.log('💡 Ces clôtures ne sont pas dans les sauvegardes disponibles');
    } else {
      console.log('🎉 Tous les gaps ont été comblés !');
    }
    
  } catch (e) {
    console.error('❌ Erreur sauvegarde clôtures:', e);
  }
} else {
  console.log('❌ Aucune clôture manquante trouvée dans les sauvegardes');
  console.log('💡 Les clôtures Z31-Z33 et Z35-Z37 ont peut-être été définitivement perdues');
}

console.log('\n✨ Récupération terminée !');
