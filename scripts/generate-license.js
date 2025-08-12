#!/usr/bin/env node

/**
 * Générateur de clés de licence pour Klick Caisse
 * Usage: node scripts/generate-license.js <machineId> <customerName> <customerEmail> <expiryDate> [features]
 */

// Fonction de hachage simple (même que dans LicenseService)
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

// Générer une clé de licence
function generateLicenseKey(machineId, customerName, customerEmail, expiryDate, features = ['basic']) {
  const data = `${machineId}|${customerName}|${customerEmail}|${expiryDate}|${features.join(',')}`;
  const hash = hashString(data + 'KLICK_CAISSE_SECRET_2024');
  return `${hash.substring(0, 8)}-${hash.substring(8, 16)}-${hash.substring(16, 24)}-${hash.substring(24, 32)}`;
}

// Validation des arguments
function validateArgs() {
  const args = process.argv.slice(2);
  
  if (args.length < 4) {
    console.log(`
🔐 Générateur de Clés de Licence - Klick Caisse

Usage: node scripts/generate-license.js <machineId> <customerName> <customerEmail> <expiryDate> [features]

Arguments:
  machineId     - Identifiant unique de la machine (obtenu depuis l'application)
  customerName  - Nom du client
  customerEmail - Email du client
  expiryDate    - Date d'expiration (YYYY-MM-DD)
  features      - Fonctionnalités (basic|premium) [optionnel, défaut: basic]

Exemples:
  node scripts/generate-license.js ABC123 "Jean Dupont" "jean@example.com" "2025-12-31"
  node scripts/generate-license.js ABC123 "Jean Dupont" "jean@example.com" "2025-12-31" premium
    `);
    process.exit(1);
  }

  return args;
}

// Fonction principale
function main() {
  const args = validateArgs();
  
  const [machineId, customerName, customerEmail, expiryDate, features = 'basic'] = args;
  
  // Validation de la date
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(expiryDate)) {
    console.error('❌ Format de date invalide. Utilisez YYYY-MM-DD');
    process.exit(1);
  }

  // Validation des fonctionnalités
  const validFeatures = ['basic', 'premium'];
  const featureArray = features.split(',').map(f => f.trim());
  
  for (const feature of featureArray) {
    if (!validFeatures.includes(feature)) {
      console.error(`❌ Fonctionnalité invalide: ${feature}. Utilisez: ${validFeatures.join(', ')}`);
      process.exit(1);
    }
  }

  // Génération de la clé
  const licenseKey = generateLicenseKey(machineId, customerName, customerEmail, expiryDate, featureArray);

  // Affichage des résultats
  console.log('\n🔐 CLÉ DE LICENCE GÉNÉRÉE\n');
  console.log('='.repeat(50));
  console.log(`Machine ID:     ${machineId}`);
  console.log(`Client:         ${customerName}`);
  console.log(`Email:          ${customerEmail}`);
  console.log(`Expire le:      ${expiryDate}`);
  console.log(`Fonctionnalités: ${featureArray.join(', ')}`);
  console.log('='.repeat(50));
  console.log(`\n🔑 CLÉ DE LICENCE:`);
  console.log(`\n${licenseKey}\n`);
  console.log('='.repeat(50));

  // Informations supplémentaires
  console.log('\n📋 INFORMATIONS POUR L\'ACTIVATION:');
  console.log('1. Ouvrez Klick Caisse');
  console.log('2. Allez dans Paramètres > Licence');
  console.log('3. Entrez les informations ci-dessus');
  console.log('4. Collez la clé de licence générée');
  console.log('5. Cliquez sur "Activer la licence"');

  // Sauvegarde dans un fichier
  const fs = require('fs');
  const licenseData = {
    machineId,
    customerName,
    customerEmail,
    expiryDate,
    features: featureArray,
    licenseKey,
    generatedAt: new Date().toISOString()
  };

  const filename = `license-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(filename, JSON.stringify(licenseData, null, 2));
  
  console.log(`\n💾 Licence sauvegardée dans: ${filename}`);
}

// Exécution
if (require.main === module) {
  main();
}

module.exports = { generateLicenseKey, hashString };
