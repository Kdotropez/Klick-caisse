// Script pour forcer l'import des clôtures depuis Z8-23082025-tropez.json
console.log('=== FORCE IMPORT DES CLÔTURES ===');

// Créer un input file
const input = document.createElement('input');
input.type = 'file';
input.accept = '.json';
input.style.display = 'none';

input.onchange = function(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      console.log('📊 Analyse du fichier:');
      console.log(`  Produits: ${data.products?.length || 0}`);
      console.log(`  Catégories: ${data.categories?.length || 0}`);
      console.log(`  Clôtures: ${data.closures?.length || 0}`);
      console.log(`  Z Counter: ${data.zCounter || 0}`);
      
      if (data.closures && data.closures.length > 0) {
        console.log('📋 Détail des clôtures:');
        data.closures.forEach(closure => {
          const date = new Date(closure.closedAt);
          const dateStr = date.toLocaleDateString('fr-FR');
          console.log(`  Z${closure.zNumber} (${dateStr}): ${closure.transactions?.length || 0} transactions`);
        });
        
        // Forcer l'import des clôtures
        console.log('🔄 Import forcé des clôtures...');
        localStorage.setItem('klick_caisse_closures', JSON.stringify(data.closures));
        localStorage.setItem('klick_caisse_z_counter', data.zCounter || data.closures.length);
        
        // Vérifier l'import
        const savedClosures = localStorage.getItem('klick_caisse_closures');
        const savedZCounter = localStorage.getItem('klick_caisse_z_counter');
        
        console.log('✅ Vérification après import:');
        console.log(`  Clôtures sauvegardées: ${savedClosures ? JSON.parse(savedClosures).length : 0}`);
        console.log(`  Z Counter: ${savedZCounter}`);
        
        if (savedClosures) {
          const closures = JSON.parse(savedClosures);
          console.log('📋 Clôtures importées:');
          closures.forEach(closure => {
            const date = new Date(closure.closedAt);
            const dateStr = date.toLocaleDateString('fr-FR');
            console.log(`  Z${closure.zNumber} (${dateStr}): ${closure.transactions?.length || 0} transactions`);
          });
        }
        
        alert(`✅ Import forcé terminé! ${data.closures.length} clôtures importées. Rechargez la page pour voir les clôtures.`);
        
      } else {
        console.log('❌ Aucune clôture trouvée dans le fichier');
        alert('❌ Aucune clôture trouvée dans le fichier');
      }
      
    } catch (error) {
      console.error('❌ Erreur import:', error);
      alert('❌ Erreur lors de l\'import: ' + error.message);
    }
  };
  
  reader.readAsText(file);
};

document.body.appendChild(input);
input.click();
document.body.removeChild(input);
