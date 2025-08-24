// Script de diagnostic des clôtures
console.log('=== DIAGNOSTIC DES CLÔTURES ===');

// Vérifier les clôtures actuelles
const currentClosures = localStorage.getItem('klick_caisse_closures');
const currentZCounter = localStorage.getItem('klick_caisse_z_counter');

console.log('📊 État actuel:');
console.log(`  Clôtures en mémoire: ${currentClosures ? JSON.parse(currentClosures).length : 0}`);
console.log(`  Z Counter: ${currentZCounter || 0}`);

if (currentClosures) {
  const closures = JSON.parse(currentClosures);
  console.log('📋 Clôtures actuelles:');
  closures.forEach(closure => {
    const date = new Date(closure.closedAt);
    const dateStr = date.toLocaleDateString('fr-FR');
    console.log(`  Z${closure.zNumber} (${dateStr}): ${closure.transactions?.length || 0} transactions`);
  });
}

// Vérifier les autres données
const products = localStorage.getItem('klick_caisse_products');
const categories = localStorage.getItem('klick_caisse_categories');
const settings = localStorage.getItem('klick_caisse_settings');
const subcategories = localStorage.getItem('klick_caisse_subcategories');
const transactionsByDay = localStorage.getItem('klick_caisse_transactions_by_day');
const cashiers = localStorage.getItem('klick_caisse_cashiers');

console.log('\n📊 Autres données:');
console.log(`  Produits: ${products ? JSON.parse(products).length : 0}`);
console.log(`  Catégories: ${categories ? JSON.parse(categories).length : 0}`);
console.log(`  Paramètres: ${settings ? 'Présents' : 'Absents'}`);
console.log(`  Sous-catégories: ${subcategories ? JSON.parse(subcategories).length : 0}`);
console.log(`  Transactions par jour: ${transactionsByDay ? Object.keys(JSON.parse(transactionsByDay)).length : 0} jours`);
console.log(`  Caissiers: ${cashiers ? JSON.parse(cashiers).length : 0}`);

console.log('\n✅ Diagnostic terminé!');
