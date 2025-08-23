// Script de test pour vérifier les clôtures
console.log('=== TEST DES CLÔTURES ===');

// Vérifier toutes les clés localStorage
const allKeys = Object.keys(localStorage).filter(key => key.includes('klick_caisse'));
console.log('Clés klick_caisse trouvées:', allKeys);

// Vérifier spécifiquement les clôtures
const closuresKey = 'klick_caisse_closures';
const closuresData = localStorage.getItem(closuresKey);
console.log('Données clôtures brutes:', closuresData);

if (closuresData) {
  try {
    const closures = JSON.parse(closuresData);
    console.log('Clôtures parsées:', closures);
    console.log('Nombre de clôtures:', closures.length);
    
    if (closures.length > 0) {
      console.log('Première clôture:', closures[0]);
      console.log('Structure première clôture:', Object.keys(closures[0]));
    }
  } catch (error) {
    console.error('Erreur parsing clôtures:', error);
  }
} else {
  console.log('Aucune donnée de clôture trouvée');
}

// Vérifier les transactions par jour
const transactionsKey = 'klick_caisse_transactions_by_day';
const transactionsData = localStorage.getItem(transactionsKey);
console.log('Données transactions brutes:', transactionsData);

if (transactionsData) {
  try {
    const transactions = JSON.parse(transactionsData);
    console.log('Transactions parsées:', transactions);
    console.log('Clés de transactions:', Object.keys(transactions));
  } catch (error) {
    console.error('Erreur parsing transactions:', error);
  }
}
