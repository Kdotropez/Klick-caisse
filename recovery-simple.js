// Script simple de récupération des clôtures
console.log('=== RÉCUPÉRATION DES CLÔTURES ===');

// Clôture Z1 récupérée depuis les transactions du 11/08/2025
const recoveredClosures = [
  {
    "zNumber": 1,
    "closedAt": "2025-08-11T23:59:59.000Z",
    "transactions": [
      {
        "id": "1754923625495",
        "items": [
          {
            "product": {
              "id": "6050",
              "name": "ICE TROPEZ PECHE LITRE",
              "reference": "6050",
              "ean13": "3760004440796",
              "category": "ICE TROPEZ",
              "associatedCategories": ["ICE", "ICE TROPEZ"],
              "wholesalePrice": 3.25,
              "finalPrice": 6.5,
              "crossedPrice": 6.5,
              "salesCount": 0,
              "position": 0,
              "remisable": true,
              "variations": []
            },
            "quantity": 2
          }
        ],
        "total": 13,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-11T14:47:05.495Z"
      },
      {
        "id": "1754923884845",
        "items": [
          {
            "product": {
              "id": "7876",
              "name": "VERTICAL BEACH OPTIQUE TROPEZ",
              "reference": "7876",
              "ean13": "2052323213870",
              "category": "VERRE",
              "associatedCategories": ["VERRE", "VERRES 10"],
              "wholesalePrice": 2.85,
              "finalPrice": 8.5,
              "crossedPrice": 8.5,
              "salesCount": 0,
              "position": 0,
              "remisable": true,
              "variations": []
            },
            "quantity": 2
          }
        ],
        "total": 17,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-11T14:51:24.845Z"
      },
      {
        "id": "1754923984345",
        "items": [
          {
            "product": {
              "id": "7175",
              "name": "FOUTA TROPEZ FUSHIA",
              "reference": "7175",
              "ean13": "5282214719366",
              "category": "SERVIETTE",
              "associatedCategories": ["SERVIETTE", "Serviettes"],
              "wholesalePrice": 9.5,
              "finalPrice": 25,
              "crossedPrice": 25,
              "salesCount": 0,
              "position": 0,
              "remisable": true,
              "variations": []
            },
            "quantity": 1
          }
        ],
        "total": 25,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-11T14:53:04.345Z"
      },
      {
        "id": "1754924084345",
        "items": [
          {
            "product": {
              "id": "6050",
              "name": "ICE TROPEZ PECHE LITRE",
              "reference": "6050",
              "ean13": "3760004440796",
              "category": "ICE TROPEZ",
              "associatedCategories": ["ICE", "ICE TROPEZ"],
              "wholesalePrice": 3.25,
              "finalPrice": 6.5,
              "crossedPrice": 6.5,
              "salesCount": 0,
              "position": 0,
              "remisable": true,
              "variations": []
            },
            "quantity": 1
          }
        ],
        "total": 6.5,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-11T14:54:44.345Z"
      },
      {
        "id": "1754924184345",
        "items": [
          {
            "product": {
              "id": "6050",
              "name": "ICE TROPEZ PECHE LITRE",
              "reference": "6050",
              "ean13": "3760004440796",
              "category": "ICE TROPEZ",
              "associatedCategories": ["ICE", "ICE TROPEZ"],
              "wholesalePrice": 3.25,
              "finalPrice": 6.5,
              "crossedPrice": 6.5,
              "salesCount": 0,
              "position": 0,
              "remisable": true,
              "variations": []
            },
            "quantity": 1
          }
        ],
        "total": 6.5,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-11T14:56:24.345Z"
      }
    ],
    "totalCA": 68,
    "totalTransactions": 5
  }
];

console.log('📊 Clôtures à récupérer:', recoveredClosures.length);

// Sauvegarder les clôtures
if (recoveredClosures.length > 0) {
  localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
  console.log('✅ Clôtures sauvegardées');
  
  // Afficher les détails
  recoveredClosures.forEach(closure => {
    console.log(`Z${closure.zNumber}: ${closure.transactions.length} transactions, CA: ${closure.totalCA.toFixed(2)} €`);
  });
}

// Vérifier la sauvegarde
const savedClosures = localStorage.getItem('klick_caisse_closures');
console.log('📊 Vérification:');
console.log('  Clôtures sauvegardées:', savedClosures ? JSON.parse(savedClosures).length : 0);

alert('✅ Récupération terminée! 1 clôture récupérée. Rechargez la page pour voir les clôtures.');
