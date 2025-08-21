# Système de Licence Klick Caisse

## 🔐 Code d'Autorisation Quotidien

Le système Klick Caisse utilise un code d'autorisation qui change automatiquement chaque jour pour sécuriser l'accès à l'application.

## 📋 Format du Code

**Format:** `YYYYMMDD-XX`
- `YYYYMMDD` : Date au format année-mois-jour
- `XX` : Checksum calculé à partir de la date

**Exemple:** `20250822-06` pour le 22 août 2025

## 🛠️ Générateur de Code

### Utilisation du script
```bash
# Générer le code du jour
node generate-daily-code.js

# Générer le code pour une date spécifique
node generate-daily-code.js 2025-08-22
```

### Exemple de sortie
```
GENERATEUR DE CODE D'AUTORISATION KLICK CAISSE
==============================================
Date: 22/08/2025
Code du jour: 20250822-06
Format: YYYYMMDD-XX

Codes d'autorisation de la semaine:
====================================
AUJOURD'HUI vendredi 22/08/2025: 20250822-06
JOUR samedi 23/08/2025: 20250823-14
JOUR dimanche 24/08/2025: 20250824-22
...
```

## 🔧 Algorithme de Génération

1. **Date de base:** `YYYYMMDD` (ex: 20250822)
2. **Calcul du checksum:**
   - Multiplier chaque chiffre par sa position (1-indexed)
   - Additionner tous les résultats
   - Prendre le modulo 100
3. **Code final:** `YYYYMMDD-XX`

### Exemple de calcul
```
Date: 20250822
Calcul: (2×1) + (0×2) + (2×3) + (5×4) + (0×5) + (8×6) + (2×7) + (2×8)
       = 2 + 0 + 6 + 20 + 0 + 48 + 14 + 16 = 106
Checksum: 106 % 100 = 06
Code: 20250822-06
```

## 🚀 Utilisation dans l'Application

### Au démarrage
1. L'application affiche une modale de licence
2. Saisir le code d'autorisation du jour
3. Le système valide automatiquement le code
4. Accès autorisé si le code est correct

### Fonctionnalités
- ✅ Validation automatique du code
- ✅ Affichage du code du jour (optionnel)
- ✅ Compteur de tentatives
- ✅ Messages d'erreur informatifs
- ✅ Interface utilisateur moderne

## 📁 Fichiers du Système

### `src/utils/license.ts`
- Fonctions de génération et validation
- Interface `LicenseInfo`
- Algorithmes de calcul

### `src/components/LicenseModal.tsx`
- Interface utilisateur de la licence
- Validation en temps réel
- Gestion des erreurs

### `generate-daily-code.js`
- Script de génération des codes
- Affichage des codes de la semaine
- Utilisation en ligne de commande

## 🔒 Sécurité

### Avantages
- **Code quotidien:** Change automatiquement chaque jour
- **Algorithme déterministe:** Même date = même code
- **Checksum:** Validation de l'intégrité
- **Pas de stockage:** Aucun code en dur dans l'application

### Limitations
- **Code prévisible:** L'algorithme est connu
- **Pas de chiffrement:** Code en clair
- **Validation côté client:** Peut être contournée

## 🎯 Cas d'Usage

### Utilisateur final
1. Lancer l'application
2. Saisir le code du jour
3. Accéder à Klick Caisse

### Administrateur
1. Exécuter `node generate-daily-code.js`
2. Noter le code du jour
3. Communiquer le code aux utilisateurs

### Développeur
1. Modifier l'algorithme dans `src/utils/license.ts`
2. Tester avec `generate-daily-code.js`
3. Déployer les modifications

## 🔧 Personnalisation

### Changer l'algorithme
Modifier la fonction `generateDailyCode()` dans `src/utils/license.ts`:

```typescript
export function generateDailyCode(): string {
  const today = new Date();
  // Votre nouvel algorithme ici
  return 'nouveau-code';
}
```

### Modifier l'interface
Éditer `src/components/LicenseModal.tsx` pour:
- Changer les couleurs
- Modifier les messages
- Ajouter des fonctionnalités

### Ajouter des validations
- Vérification de la date système
- Validation réseau
- Logs de sécurité

## 📞 Support

En cas de problème:
1. Vérifier la date système
2. Exécuter `node generate-daily-code.js`
3. Comparer avec le code affiché dans l'application
4. Contacter l'administrateur si nécessaire
