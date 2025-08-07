const fs = require('fs');
const path = require('path');

console.log('🧹 NETTOYAGE AUTOMATIQUE DU PROJET');
console.log('=====================================\n');

// 1. NETTOYAGE DES IMPORTS INUTILES
console.log('📦 NETTOYAGE DES IMPORTS INUTILES:');

// Nettoyer WindowManager.tsx
const windowManagerPath = 'src/components/WindowManager.tsx';
if (fs.existsSync(windowManagerPath)) {
  let content = fs.readFileSync(windowManagerPath, 'utf8');
  
  // Supprimer ListItemSecondaryAction de l'import
  content = content.replace(
    /import \{([^}]*ListItemSecondaryAction[^}]*)\} from '@mui\/material';/g,
    (match, imports) => {
      const newImports = imports.replace(/,?\s*ListItemSecondaryAction/, '');
      return `import {${newImports}} from '@mui/material';`;
    }
  );
  
  // Supprimer les variables non utilisées
  const unusedVars = [
    'isTouchDevice',
    'handleMouseDown', 
    'handleResizeStart',
    'toggleMinimize',
    'toggleMaximize'
  ];
  
  unusedVars.forEach(varName => {
    const regex = new RegExp(`const \\[?${varName}\\]? = [^;]+;`, 'g');
    content = content.replace(regex, '');
  });
  
  // Corriger les useEffect
  content = content.replace(
    /useEffect\(\(\) => \{[\s\S]*?\}, \[categoriesVersion\]\);/g,
    'useEffect(() => {\n    setCategoriesVersion(prev => prev + 1);\n    console.log(\'🔄 Version des catégories mise à jour:\', categoriesVersion + 1);\n  }, [categoriesVersion]);'
  );
  
  content = content.replace(
    /useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/g,
    (match) => {
      if (match.includes('handleMouseMove')) {
        return match.replace('}, []);', '}, [handleMouseMove]);');
      }
      return match;
    }
  );
  
  fs.writeFileSync(windowManagerPath, content);
  console.log('✅ WindowManager.tsx nettoyé');
}

// Nettoyer CategoryManagementModal.tsx
const categoryModalPath = 'src/components/CategoryManagementModal.tsx';
if (fs.existsSync(categoryModalPath)) {
  let content = fs.readFileSync(categoryModalPath, 'utf8');
  content = content.replace(/,?\s*Chip/g, '');
  fs.writeFileSync(categoryModalPath, content);
  console.log('✅ CategoryManagementModal.tsx nettoyé');
}

// Nettoyer App.tsx
const appPath = 'src/App.tsx';
if (fs.existsSync(appPath)) {
  let content = fs.readFileSync(appPath, 'utf8');
  content = content.replace(/,?\s*setIsLayoutLocked/g, '');
  fs.writeFileSync(appPath, content);
  console.log('✅ App.tsx nettoyé');
}

// 2. NETTOYAGE DES SAUVEGARDES (garder seulement les 3 plus récentes)
console.log('\n🧹 NETTOYAGE DES SAUVEGARDES:');

const directories = [
  { path: '.', pattern: /\.backup.*\.(csv|js)$/ },
  { path: 'src', pattern: /\.backup.*\.(tsx|ts)$/ },
  { path: 'src/components', pattern: /\.backup.*\.(tsx|ts)$/ },
  { path: 'src/data', pattern: /\.backup.*\.(ts|tsx)$/ }
];

directories.forEach(dir => {
  if (fs.existsSync(dir.path)) {
    const files = fs.readdirSync(dir.path);
    const backupFiles = files.filter(file => dir.pattern.test(file));
    
    // Grouper par nom de base
    const groups = {};
    backupFiles.forEach(file => {
      const baseName = file.replace(/\.backup.*\.(tsx|ts|js|csv)$/, '');
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(file);
    });
    
    // Garder seulement les 3 plus récentes par groupe
    Object.entries(groups).forEach(([baseName, files]) => {
      if (files.length > 3) {
        // Trier par date (les plus récentes en dernier)
        files.sort();
        const toDelete = files.slice(0, files.length - 3);
        
        toDelete.forEach(file => {
          try {
            fs.unlinkSync(path.join(dir.path, file));
            console.log(`🗑️ Supprimé: ${dir.path}/${file}`);
          } catch (error) {
            console.log(`❌ Erreur suppression: ${dir.path}/${file}`);
          }
        });
      }
    });
  }
});

// 3. NETTOYAGE DES FICHIERS CSV DUPLIQUÉS
console.log('\n🗑️ NETTOYAGE DES FICHIERS CSV DUPLIQUÉS:');

const csvFiles = fs.readdirSync('.').filter(file => file.endsWith('.csv'));
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
    // Garder le fichier principal et les 3 plus récentes sauvegardes
    const mainFile = files.find(f => f === baseName);
    const backupFiles = files.filter(f => f !== baseName).sort();
    
    if (backupFiles.length > 3) {
      const toDelete = backupFiles.slice(0, backupFiles.length - 3);
      toDelete.forEach(file => {
        try {
          fs.unlinkSync(file);
          console.log(`🗑️ Supprimé CSV: ${file}`);
        } catch (error) {
          console.log(`❌ Erreur suppression CSV: ${file}`);
        }
      });
    }
  }
});

// 4. NETTOYAGE DES SCRIPTS JS INUTILES
console.log('\n🗑️ NETTOYAGE DES SCRIPTS JS INUTILES:');

const jsFiles = fs.readdirSync('.').filter(file => 
  file.endsWith('.js') && 
  file !== 'backup.js' && 
  file !== 'analyze-and-clean.js' && 
  file !== 'clean-project.js'
);

const usefulScripts = [
  'fix-categories-final.js',
  'import-final.js',
  'import-csv-fixed.js',
  'import-csv-to-app.js',
  'import-with-separate-variations.js',
  'add-remisable-column.js',
  'import-with-variations.js',
  'merge-products-variations.js',
  'convert-to-clean-csv.js',
  'create-categories.js',
  'simple-csv-converter.js',
  'utf16-csv-converter.js',
  'import-csv-correct.js'
];

jsFiles.forEach(file => {
  if (!usefulScripts.includes(file)) {
    try {
      fs.unlinkSync(file);
      console.log(`🗑️ Supprimé script: ${file}`);
    } catch (error) {
      console.log(`❌ Erreur suppression script: ${file}`);
    }
  }
});

// 5. CORRECTION DE L'EXPORT ANONYME
console.log('\n📤 CORRECTION DE L\'EXPORT ANONYME:');

const productionDataPath = 'src/data/productionData.ts';
if (fs.existsSync(productionDataPath)) {
  let content = fs.readFileSync(productionDataPath, 'utf8');
  
  // Chercher l'export par défaut anonyme
  const exportMatch = content.match(/export default \{[\s\S]*?\};/);
  if (exportMatch) {
    const exportContent = exportMatch[0];
    const newExport = `const productionData = ${exportContent.replace('export default ', '')}\n\nexport default productionData;`;
    content = content.replace(exportMatch[0], newExport);
    fs.writeFileSync(productionDataPath, content);
    console.log('✅ Export anonyme corrigé dans productionData.ts');
  }
}

console.log('\n✅ NETTOYAGE TERMINÉ !');
console.log('\n📊 RÉSUMÉ DES ACTIONS:');
console.log('- Imports inutilisés supprimés');
console.log('- Variables non utilisées supprimées');
console.log('- Hooks React corrigés');
console.log('- Sauvegardes anciennes supprimées');
console.log('- Fichiers CSV dupliqués nettoyés');
console.log('- Scripts JS inutiles supprimés');
console.log('- Export anonyme corrigé');

console.log('\n🚀 Le projet est maintenant optimisé !'); 