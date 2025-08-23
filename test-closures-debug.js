// Script de debug pour vérifier les clôtures dans localStorage
console.log('=== DEBUG CLÔTURES ===');

// Vérifier toutes les clés localStorage
const allKeys = Object.keys(localStorage);
console.log('Toutes les clés localStorage:', allKeys);

// Chercher les clés liées à klick_caisse
const klickKeys = allKeys.filter(key => key.includes('klick_caisse'));
console.log('Clés klick_caisse:', klickKeys);

// Vérifier spécifiquement les clôtures
const closuresKey = 'klick_caisse_closures';
const closuresRaw = localStorage.getItem(closuresKey);
console.log('Clés des clôtures trouvée:', !!closuresRaw);
console.log('Valeur brute des clôtures:', closuresRaw);

if (closuresRaw) {
  try {
    const closures = JSON.parse(closuresRaw);
    console.log('Clôtures parsées:', closures);
    console.log('Nombre de clôtures:', closures.length);
    console.log('Type de closures:', typeof closures);
    console.log('Est-ce un tableau?', Array.isArray(closures));
    
    if (Array.isArray(closures)) {
      closures.forEach((closure, index) => {
        console.log(`Clôture ${index + 1}:`, closure);
        console.log(`  - Z Number: ${closure.zNumber}`);
        console.log(`  - Date: ${closure.closedAt}`);
        console.log(`  - Transactions: ${closure.transactions?.length || 0}`);
      });
    }
  } catch (error) {
    console.error('Erreur parsing JSON:', error);
  }
} else {
  console.log('AUCUNE CLÔTURE TROUVÉE dans localStorage!');
}

// Vérifier aussi les transactions
const transactionsKey = 'klick_caisse_transactions';
const transactionsRaw = localStorage.getItem(transactionsKey);
console.log('Transactions trouvées:', !!transactionsRaw);
if (transactionsRaw) {
  try {
    const transactions = JSON.parse(transactionsRaw);
    console.log('Nombre de transactions:', transactions.length);
  } catch (error) {
    console.error('Erreur parsing transactions:', error);
  }
}

console.log('=== FIN DEBUG ===');
