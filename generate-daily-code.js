// Script pour générer le code d'autorisation du jour
// Usage: node generate-daily-code.js

function generateDailyCode() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Algorithme de génération du code
  // Format: JJMM (jour-mois) - 4 chiffres seulement
  return `${day.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
}

// Fonction pour générer le code d'une date spécifique
function generateCodeForDate(day, month) {
  return `${day.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}`;
}

// Fonction pour afficher les codes de la semaine
function showWeekCodes() {
  const today = new Date();
  console.log('\nCodes d\'autorisation de la semaine:');
  console.log('====================================');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const code = generateCodeForDate(day, month);
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    const dateStr = date.toLocaleDateString('fr-FR');
    
    const isToday = i === 0;
    const prefix = isToday ? 'AUJOURD\'HUI' : 'JOUR';
    
    console.log(`${prefix} ${dayName} ${dateStr}: ${code}`);
  }
}

// Fonction principale
function main() {
  const today = new Date();
  const todayCode = generateDailyCode();
  
  console.log('GENERATEUR DE CODE D\'AUTORISATION KLICK CAISSE');
  console.log('==============================================');
  console.log(`Date: ${today.toLocaleDateString('fr-FR')}`);
  console.log(`Code du jour: ${todayCode}`);
  console.log(`Format: JJMM (4 chiffres)`);
  
  // Afficher les codes de la semaine
  showWeekCodes();
  
  console.log('\nUtilisation:');
  console.log('- Ce code change automatiquement chaque jour');
  console.log('- Le checksum est calculé a partir de la date');
  console.log('- Format: JJMM (ex: 2208)');
  
  // Vérifier si un argument a été passé
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const inputDate = args[0];
    const [day, month] = inputDate.split('-').map(Number);
    console.log(`\nCode pour ${day}/${month}: ${generateCodeForDate(day, month)}`);
  }
}

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = {
  generateDailyCode,
  generateCodeForDate,
  showWeekCodes
};
