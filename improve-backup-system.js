// Script pour améliorer le système de sauvegarde et éviter les pertes futures
console.log('🚀 Amélioration du système de sauvegarde...');

// 1. Augmenter la limite des sauvegardes automatiques (de 10 à 30)
const currentBackups = localStorage.getItem('klick_caisse_auto_backups');
if (currentBackups) {
  try {
    const backups = JSON.parse(currentBackups);
    console.log(`📊 Sauvegardes actuelles : ${backups.length}`);
    
    // Garder les 30 plus récentes au lieu de 10
    const extendedBackups = backups.slice(0, 30);
    localStorage.setItem('klick_caisse_auto_backups', JSON.stringify(extendedBackups));
    console.log(`✅ Limite étendue à 30 sauvegardes (actuellement ${extendedBackups.length})`);
  } catch (e) {
    console.error('❌ Erreur extension sauvegardes:', e);
  }
}

// 2. Créer une sauvegarde de sécurité immédiate
console.log('\n💾 Création d\'une sauvegarde de sécurité...');

try {
  // Exporter toutes les données actuelles
  const fullBackup = {
    schemaVersion: "3.0",
    timestamp: new Date().toISOString(),
    products: JSON.parse(localStorage.getItem('klick_caisse_products') || '[]'),
    categories: JSON.parse(localStorage.getItem('klick_caisse_categories') || '[]'),
    closures: JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]'),
    zCounter: parseInt(localStorage.getItem('klick_caisse_z_counter') || '0'),
    settings: JSON.parse(localStorage.getItem('klick_caisse_settings') || '{}'),
    subcategories: JSON.parse(localStorage.getItem('klick_caisse_subcategories') || '[]'),
    transactionsByDay: JSON.parse(localStorage.getItem('klick_caisse_transactions_by_day') || '{}'),
    cashiers: JSON.parse(localStorage.getItem('klick_caisse_cashiers') || '[]')
  };
  
  // Ajouter à la liste des sauvegardes automatiques
  const autoBackups = JSON.parse(localStorage.getItem('klick_caisse_auto_backups') || '[]');
  const newBackup = {
    ts: new Date().toISOString(),
    data: fullBackup
  };
  
  // Insérer en première position et garder 30 maximum
  autoBackups.unshift(newBackup);
  const limitedBackups = autoBackups.slice(0, 30);
  localStorage.setItem('klick_caisse_auto_backups', JSON.stringify(limitedBackups));
  
  console.log(`✅ Sauvegarde de sécurité créée (${fullBackup.closures.length} clôtures)`);
  
  // 3. Télécharger la sauvegarde complète
  const content = JSON.stringify(fullBackup, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const filename = `klick-caisse-backup-${yyyy}-${mm}-${dd}-${hh}-${min}.json`;
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`📁 Fichier téléchargé : ${filename}`);
  
} catch (e) {
  console.error('❌ Erreur création sauvegarde:', e);
}

// 4. Afficher les statistiques finales
console.log('\n📊 Statistiques finales :');

try {
  const closures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
  const zCounter = parseInt(localStorage.getItem('klick_caisse_z_counter') || '0');
  const autoBackups = JSON.parse(localStorage.getItem('klick_caisse_auto_backups') || '[]');
  
  console.log(`📋 Clôtures : ${closures.length}`);
  console.log(`🔢 Compteur Z : ${zCounter}`);
  console.log(`💾 Sauvegardes auto : ${autoBackups.length}`);
  
  if (closures.length > 0) {
    const zNumbers = closures.map(c => c.zNumber).sort((a, b) => a - b);
    console.log(`📈 Séquence Z : ${zNumbers.join(' → ')}`);
  }
  
} catch (e) {
  console.error('❌ Erreur statistiques:', e);
}

console.log('\n✨ Système de sauvegarde amélioré !');
console.log('💡 Recommandations :');
console.log('  - Sauvegardez manuellement avant chaque nettoyage localStorage');
console.log('  - Vérifiez régulièrement les gaps de numérotation');
console.log('  - Conservez les fichiers JSON téléchargés en lieu sûr');
