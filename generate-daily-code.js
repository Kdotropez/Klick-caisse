// Script pour générer le code d'autorisation du jour
// Usage: node generate-daily-code.js

function generateDailyCode() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  
  // Algorithme de génération du code
  // Format: YYYYMMDD + checksum
  const baseCode = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  
  // Calcul du checksum simple
  let checksum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    checksum += parseInt(baseCode[i]) * (i + 1);
  }
  checksum = checksum % 100;
  
  // Code final: YYYYMMDD-XX (XX = checksum)
  return `${baseCode}-${checksum.toString().padStart(2, '0')}`;
}

// Fonction pour générer le code d'une date spécifique
function generateCodeForDate(year, month, day) {
  const baseCode = `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
  
  let checksum = 0;
  for (let i = 0; i < baseCode.length; i++) {
    checksum += parseInt(baseCode[i]) * (i + 1);
  }
  checksum = checksum % 100;
  
  return `${baseCode}-${checksum.toString().padStart(2, '0')}`;
}

// Fonction pour afficher les codes de la semaine
function showWeekCodes() {
  const today = new Date();
  console.log('\nCodes d\'autorisation de la semaine:');
  console.log('====================================');
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const code = generateCodeForDate(year, month, day);
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
  console.log(`Format: YYYYMMDD-XX`);
  
  // Afficher les codes de la semaine
  showWeekCodes();
  
  console.log('\nUtilisation:');
  console.log('- Ce code change automatiquement chaque jour');
  console.log('- Le checksum est calculé a partir de la date');
  console.log('- Format: YYYYMMDD-XX (ex: 20250815-45)');
  
  // Vérifier si un argument a été passé
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const inputDate = args[0];
    console.log(`\nCode pour ${inputDate}: ${generateCodeForDate(...inputDate.split('-').map(Number))}`);
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
