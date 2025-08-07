const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE ET NETTOYAGE DU PROJET');
console.log('=====================================\n');

// 1. ANALYSE DES FICHIERS DE SAUVEGARDE
console.log('📊 ANALYSE DES FICHIERS DE SAUVEGARDE:');

const backupFiles = {
  root: [],
  src: [],
  components: [],
  data: []
};

// Analyser les fichiers de sauvegarde dans le répertoire racine
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(file => {
  if (file.includes('backup') && (file.endsWith('.csv') || file.endsWith('.js'))) {
    backupFiles.root.push(file);
  }
});

// Analyser les fichiers de sauvegarde dans src/
if (fs.existsSync('src')) {
  const srcFiles = fs.readdirSync('src');
  srcFiles.forEach(file => {
    if (file.includes('backup')) {
      backupFiles.src.push(file);
    }
  });
}

// Analyser les fichiers de sauvegarde dans src/components/
if (fs.existsSync('src/components')) {
  const componentFiles = fs.readdirSync('src/components');
  componentFiles.forEach(file => {
    if (file.includes('backup')) {
      backupFiles.components.push(file);
    }
  });
}

// Analyser les fichiers de sauvegarde dans src/data/
if (fs.existsSync('src/data')) {
  const dataFiles = fs.readdirSync('src/data');
  dataFiles.forEach(file => {
    if (file.includes('backup')) {
      backupFiles.data.push(file);
    }
  });
}

console.log(`📁 Répertoire racine: ${backupFiles.root.length} fichiers de sauvegarde`);
console.log(`📁 src/: ${backupFiles.src.length} fichiers de sauvegarde`);
console.log(`📁 src/components/: ${backupFiles.components.length} fichiers de sauvegarde`);
console.log(`📁 src/data/: ${backupFiles.data.length} fichiers de sauvegarde`);

// 2. ANALYSE DES FICHIERS INUTILES
console.log('\n🗑️ ANALYSE DES FICHIERS INUTILES:');

const unusedFiles = [];
const duplicateFiles = [];

// Vérifier les fichiers CSV dupliqués
const csvFiles = rootFiles.filter(file => file.endsWith('.csv'));
const csvGroups = {};
csvFiles.forEach(file => {
  const baseName = file.replace(/\.backup.*\.csv$/, '.csv');
  if (!csvGroups[baseName]) {
    csvGroups[baseName] = [];
  }
  csvGroups[baseName].push(file);
});

Object.entries(csvGroups).forEach(([baseName, files]) => {
  if (files.length > 1) {
    duplicateFiles.push({
      type: 'CSV',
      baseName,
      files: files.slice(1) // Garder le premier, marquer les autres comme dupliqués
    });
  }
});

// Vérifier les fichiers JS de script inutiles
const scriptFiles = rootFiles.filter(file => file.endsWith('.js') && file !== 'backup.js' && file !== 'analyze-and-clean.js');
scriptFiles.forEach(file => {
  if (!file.includes('fix-') && !file.includes('import-') && !file.includes('convert-')) {
    unusedFiles.push(file);
  }
});

console.log(`📄 Fichiers CSV dupliqués: ${duplicateFiles.length} groupes`);
console.log(`📄 Fichiers JS inutiles: ${unusedFiles.length} fichiers`);

// 3. ANALYSE DES IMPORTS INUTILES
console.log('\n📦 ANALYSE DES IMPORTS INUTILES:');

const importIssues = [
  'src/App.tsx:13:26 - setIsLayoutLocked assigned but never used',
  'src/components/CSVMapping.tsx:17:10 - CheckCircle defined but never used',
  'src/components/CategoryManagementModal.tsx:16:3 - Chip defined but never used',
  'src/components/WindowManager.tsx:12:3 - ListItemSecondaryAction defined but never used',
  'src/components/WindowManager.tsx:209:10 - isTouchDevice assigned but never used',
  'src/components/WindowManager.tsx:455:9 - handleMouseDown assigned but never used',
  'src/components/WindowManager.tsx:542:9 - handleResizeStart assigned but never used',
  'src/components/WindowManager.tsx:597:9 - toggleMinimize assigned but never used',
  'src/components/WindowManager.tsx:604:9 - toggleMaximize assigned but never used'
];

console.log(`⚠️ Imports/variables inutilisés: ${importIssues.length} problèmes`);

// 4. ANALYSE DES HOOKS REACT
console.log('\n⚛️ ANALYSE DES HOOKS REACT:');

const hookIssues = [
  'src/components/WindowManager.tsx:96:6 - useEffect missing dependency: categoriesVersion',
  'src/components/WindowManager.tsx:569:6 - useEffect missing dependency: handleMouseMove'
];

console.log(`⚠️ Hooks React avec dépendances manquantes: ${hookIssues.length} problèmes`);

// 5. ANALYSE DES EXPORTS
console.log('\n📤 ANALYSE DES EXPORTS:');

const exportIssues = [
  'src/data/productionData.ts:16842:1 - Anonymous default export should be assigned to variable'
];

console.log(`⚠️ Problèmes d'export: ${exportIssues.length} problèmes`);

// 6. RECOMMANDATIONS
console.log('\n💡 RECOMMANDATIONS:');
console.log('=====================================');

console.log('\n1. 🧹 NETTOYAGE DES SAUVEGARDES:');
console.log('   - Garder seulement les 3 dernières sauvegardes de chaque fichier');
console.log('   - Supprimer les anciennes sauvegardes pour libérer de l\'espace');

console.log('\n2. 🗑️ SUPPRESSION DES FICHIERS INUTILES:');
console.log('   - Supprimer les fichiers CSV dupliqués');
console.log('   - Supprimer les scripts JS obsolètes');

console.log('\n3. 📦 OPTIMISATION DES IMPORTS:');
console.log('   - Supprimer les imports inutilisés');
console.log('   - Supprimer les variables non utilisées');

console.log('\n4. ⚛️ CORRECTION DES HOOKS REACT:');
console.log('   - Ajouter les dépendances manquantes aux useEffect');
console.log('   - Ou supprimer les variables non utilisées');

console.log('\n5. 📤 CORRECTION DES EXPORTS:');
console.log('   - Assigner l\'export par défaut à une variable');

// 7. STATISTIQUES FINALES
console.log('\n📈 STATISTIQUES FINALES:');
console.log('=====================================');

const totalBackups = backupFiles.root.length + backupFiles.src.length + backupFiles.components.length + backupFiles.data.length;
const totalIssues = importIssues.length + hookIssues.length + exportIssues.length + duplicateFiles.length + unusedFiles.length;

console.log(`📊 Total fichiers de sauvegarde: ${totalBackups}`);
console.log(`📊 Total problèmes identifiés: ${totalIssues}`);
console.log(`📊 Fichiers dupliqués: ${duplicateFiles.length}`);
console.log(`📊 Fichiers inutiles: ${unusedFiles.length}`);
console.log(`📊 Problèmes de code: ${importIssues.length + hookIssues.length + exportIssues.length}`);

console.log('\n✅ Analyse terminée !');
console.log('\n💡 Pour nettoyer automatiquement, exécutez: node clean-project.js'); 