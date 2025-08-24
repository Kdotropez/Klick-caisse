// Script de récupération avec plusieurs clôtures
console.log('=== RÉCUPÉRATION DE PLUSIEURES CLÔTURES ===');

// Plusieurs clôtures pour tester le rapport historique
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
      }
    ],
    "totalCA": 30,
    "totalTransactions": 2
  },
  {
    "zNumber": 2,
    "closedAt": "2025-08-12T23:59:59.000Z",
    "transactions": [
      {
        "id": "1755013625495",
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
          },
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
            "quantity": 3
          }
        ],
        "total": 44.5,
        "paymentMethod": "Espèces",
        "cashierName": "Caissier",
        "timestamp": "2025-08-12T15:47:05.495Z"
      },
      {
        "id": "1755013884845",
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
            "quantity": 4
          }
        ],
        "total": 34,
        "paymentMethod": "Carte",
        "cashierName": "Caissier",
        "timestamp": "2025-08-12T16:51:24.845Z"
      }
    ],
    "totalCA": 78.5,
    "totalTransactions": 2
  },
  {
    "zNumber": 3,
    "closedAt": "2025-08-13T23:59:59.000Z",
    "transactions": [
      {
        "id": "1755103625495",
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
            "quantity": 5
          },
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
            "quantity": 2
          }
        ],
        "total": 82.5,
        "paymentMethod": "SumUp",
        "cashierName": "Caissier",
        "timestamp": "2025-08-13T14:47:05.495Z"
      }
    ],
    "totalCA": 82.5,
    "totalTransactions": 1
  }
];

console.log('📊 Clôtures à récupérer:', recoveredClosures.length);

// Sauvegarder les clôtures
if (recoveredClosures.length > 0) {
  localStorage.setItem('klick_caisse_closures', JSON.stringify(recoveredClosures));
  console.log('✅ Clôtures sauvegardées');
  
  // Afficher les détails
  recoveredClosures.forEach(closure => {
    const date = new Date(closure.closedAt);
    const dateStr = date.toLocaleDateString('fr-FR');
    console.log(`Z${closure.zNumber} (${dateStr}): ${closure.transactions.length} transactions, CA: ${closure.totalCA.toFixed(2)} €`);
  });
}

// Vérifier la sauvegarde
const savedClosures = localStorage.getItem('klick_caisse_closures');
console.log('📊 Vérification:');
console.log('  Clôtures sauvegardées:', savedClosures ? JSON.parse(savedClosures).length : 0);

alert(`✅ Récupération terminée! ${recoveredClosures.length} clôtures récupérées. Rechargez la page pour voir les clôtures.`);
