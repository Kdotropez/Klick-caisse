// Script pour trouver les fichiers de sauvegarde Klick Caisse
// Utilisation: Ouvrez la console du navigateur (F12) et collez ce script

function findBackupFiles() {
  console.log('🔍 Recherche des fichiers de sauvegarde Klick Caisse...');
  console.log('');
  console.log('📁 Formats de fichiers à rechercher :');
  console.log('   • klick-auto-backup-*.json');
  console.log('   • klick-manual-backup-*.json');
  console.log('   • klick-backup-*.json');
  console.log('');
  console.log('📂 Emplacements à vérifier :');
  console.log('   1. Dossier Téléchargements : %USERPROFILE%\\Downloads');
  console.log('   2. Bureau : %USERPROFILE%\\Desktop');
  console.log('   3. Documents : %USERPROFILE%\\Documents');
  console.log('');
  console.log('💡 Conseils :');
  console.log('   • Triez par date de modification (plus récent en premier)');
  console.log('   • Cherchez les fichiers avec "Z" suivi d\'un numéro (ex: Z8, Z9)');
  console.log('   • Les fichiers les plus récents sont généralement les plus complets');
  console.log('');
  console.log('🔧 Si vous ne trouvez pas vos fichiers :');
  console.log('   1. Vérifiez les paramètres de téléchargement de votre navigateur');
  console.log('   2. Regardez dans l\'historique des téléchargements (Ctrl+J)');
  console.log('   3. Utilisez la recherche Windows : klick-*.json');
  console.log('');
  console.log('✅ Une fois que vous avez trouvé votre fichier, utilisez le script restore-backup.js');
}

// Lancer la recherche
findBackupFiles();
