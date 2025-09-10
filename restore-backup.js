// Script de restauration de sauvegarde JSON
// Utilisation: Ouvrez la console du navigateur (F12) et collez ce script

function restoreBackup() {
  // Créer un input file pour sélectionner le fichier de sauvegarde
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        console.log('📁 Lecture du fichier:', file.name);
        var text = e.target.result;
        var data = JSON.parse(text);
        
        console.log('📊 Contenu du fichier:', {
          products: data.products ? data.products.length : 0,
          categories: data.categories ? data.categories.length : 0,
          closures: data.closures ? data.closures.length : 0,
          zCounter: data.zCounter || 0,
          hasSettings: !!data.settings,
          hasSubcategories: !!data.subcategories,
          hasTransactions: !!data.transactionsByDay
        });
        
        // Restaurer les données
        if (data.products) {
          localStorage.setItem('klick_caisse_products', JSON.stringify(data.products));
          console.log('✅ Produits restaurés:', data.products.length);
        }
        
        if (data.categories) {
          localStorage.setItem('klick_caisse_categories', JSON.stringify(data.categories));
          console.log('✅ Catégories restaurées:', data.categories.length);
        }
        
        if (data.settings) {
          localStorage.setItem('klick_caisse_settings', JSON.stringify(data.settings));
          console.log('✅ Paramètres restaurés');
        }
        
        if (data.subcategories) {
          localStorage.setItem('klick_caisse_subcategories', JSON.stringify(data.subcategories));
          console.log('✅ Sous-catégories restaurées:', data.subcategories.length);
        }
        
        if (data.closures) {
          localStorage.setItem('klick_caisse_closures', JSON.stringify(data.closures));
          console.log('✅ Clôtures restaurées:', data.closures.length);
        }
        
        if (data.zCounter !== undefined) {
          localStorage.setItem('klick_caisse_z_counter', String(data.zCounter));
          console.log('✅ Compteur Z restauré:', data.zCounter);
        }
        
        if (data.transactionsByDay) {
          localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(data.transactionsByDay));
          console.log('✅ Transactions restaurées');
        }
        
        if (data.cashiers) {
          localStorage.setItem('klick_caisse_cashiers', JSON.stringify(data.cashiers));
          console.log('✅ Caissiers restaurés:', data.cashiers.length);
        }
        
        var message = '✅ Restauration terminée avec succès !\n\n' +
                     '📦 ' + (data.products ? data.products.length : 0) + ' produits\n' +
                     '📂 ' + (data.categories ? data.categories.length : 0) + ' catégories\n' +
                     '🔒 ' + (data.closures ? data.closures.length : 0) + ' clôtures\n' +
                     '💰 Z' + (data.zCounter || 0) + '\n\n' +
                     'Rechargez la page pour voir les changements.';
        
        alert(message);
        
      } catch (error) {
        console.error('❌ Erreur lors de la restauration:', error);
        alert('❌ Erreur lors de la restauration: ' + error.message);
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Lancer la restauration
console.log('🔄 Script de restauration chargé. Appelez restoreBackup() pour commencer.');
restoreBackup();
