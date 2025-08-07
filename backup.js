const fs = require('fs');
const path = require('path');

// Fonction pour créer une sauvegarde avec timestamp
function createBackup(filePath, description = '') {
  try {
    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Fichier non trouvé: ${filePath}`);
      return;
    }

    // Créer le nom de sauvegarde avec timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    
    // Créer le nom de sauvegarde
    let backupName = `${baseName}.backup-${timestamp}${ext}`;
    if (description) {
      backupName = `${baseName}.backup-${timestamp}-${description.replace(/\s+/g, '-')}${ext}`;
    }
    
    const backupPath = path.join(dir, backupName);
    
    // Copier le fichier
    fs.copyFileSync(filePath, backupPath);
    
    console.log(`✅ Sauvegarde créée: ${backupName}`);
    return backupPath;
  } catch (error) {
    console.error(`❌ Erreur lors de la sauvegarde de ${filePath}:`, error.message);
  }
}

// Fonction pour sauvegarder plusieurs fichiers
function backupFiles(files, description = '') {
  console.log(`\n🔄 Création de sauvegardes... (${description})`);
  console.log('='.repeat(50));
  
  const backups = [];
  files.forEach(file => {
    const backupPath = createBackup(file, description);
    if (backupPath) {
      backups.push(backupPath);
    }
  });
  
  console.log('='.repeat(50));
  console.log(`✅ ${backups.length} sauvegardes créées\n`);
  
  return backups;
}

// Fonction pour sauvegarder les fichiers principaux
function backupMainFiles(description = '') {
  const mainFiles = [
    'src/components/WindowManager.tsx',
    'src/data/productionData.ts',
    'src/types/Product.ts',
    'src/App.tsx'
  ];
  
  return backupFiles(mainFiles, description);
}

// Fonction pour sauvegarder les fichiers de données
function backupDataFiles(description = '') {
  const dataFiles = [
    'bdd-complete-with-variations.csv',
    'categories-clean.csv'
  ];
  
  return backupFiles(dataFiles, description);
}

// Fonction pour sauvegarder tous les fichiers importants
function backupAll(description = '') {
  const allFiles = [
    'src/components/WindowManager.tsx',
    'src/data/productionData.ts',
    'src/types/Product.ts',
    'src/App.tsx',
    'bdd-complete-with-variations.csv',
    'categories-clean.csv'
  ];
  
  return backupFiles(allFiles, description);
}

// Exporter les fonctions
module.exports = {
  createBackup,
  backupFiles,
  backupMainFiles,
  backupDataFiles,
  backupAll
};

// Si le script est exécuté directement
if (require.main === module) {
  const description = process.argv[2] || 'auto-backup';
  backupAll(description);
} 