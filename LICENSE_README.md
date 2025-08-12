# 🔐 Système de Licence - Klick Caisse

## Vue d'ensemble

Klick Caisse est maintenant protégé par un système de licence qui permet de contrôler l'accès à l'application et de gérer les fonctionnalités disponibles.

## 🚀 Fonctionnalités

### ✅ Système de Licence Simple
- **Licence par machine** : Chaque licence est liée à un identifiant unique de machine
- **Validation locale** : Pas besoin de serveur externe pour la validation
- **Expiration automatique** : Les licences expirent à une date définie
- **Fonctionnalités par niveau** : Licences Basic et Premium

### 🔧 Composants

1. **LicenseService** (`src/services/LicenseService.ts`)
   - Gestion des licences
   - Validation des clés
   - Génération d'identifiants machine

2. **LicenseActivationModal** (`src/components/LicenseActivationModal.tsx`)
   - Interface d'activation de licence
   - Saisie des informations client
   - Validation de clé

3. **LicenseInfoModal** (`src/components/LicenseInfoModal.tsx`)
   - Affichage des informations de licence
   - Statut de validité
   - Gestion des licences

4. **Générateur de clés** (`scripts/generate-license.js`)
   - Outil en ligne de commande
   - Génération de clés de licence
   - Sauvegarde des licences

## 📋 Utilisation

### Pour l'utilisateur final

1. **Première utilisation** :
   - L'application affiche un écran d'activation de licence
   - Cliquer sur "Activer la Licence"
   - Remplir les informations demandées

2. **Licence de démonstration** :
   - Cliquer sur "Licence Démo (30j)" pour une licence temporaire
   - Valide pendant 30 jours

3. **Licence complète** :
   - Obtenir une clé de licence du développeur
   - Entrer les informations client et la clé
   - Valider l'activation

### Pour le développeur

#### Génération de clés de licence

```bash
# Utilisation du générateur
node scripts/generate-license.js <machineId> <customerName> <customerEmail> <expiryDate> [features]

# Exemples
node scripts/generate-license.js ABC123 "Jean Dupont" "jean@example.com" "2025-12-31"
node scripts/generate-license.js ABC123 "Jean Dupont" "jean@example.com" "2025-12-31" premium
```

#### Obtention de l'identifiant machine

1. L'utilisateur ouvre Klick Caisse
2. L'identifiant machine s'affiche dans le modal d'activation
3. L'utilisateur communique cet identifiant au développeur

#### Processus de vente

1. **Collecte d'informations** :
   - Nom du client
   - Email du client
   - Identifiant machine
   - Date d'expiration souhaitée
   - Niveau de licence (Basic/Premium)

2. **Génération de la clé** :
   ```bash
   node scripts/generate-license.js MACHINE123 "Client Name" "client@email.com" "2025-12-31" premium
   ```

3. **Livraison** :
   - Envoyer la clé générée au client
   - Le client active la licence dans l'application

## 🔒 Sécurité

### Mécanismes de protection

1. **Identifiant machine unique** :
   - Basé sur les caractéristiques du navigateur
   - Canvas fingerprinting
   - User agent et résolution d'écran

2. **Clés cryptographiques** :
   - Hachage des informations client
   - Clé secrète intégrée
   - Format standardisé (XXXX-XXXX-XXXX-XXXX)

3. **Validation locale** :
   - Vérification de l'identifiant machine
   - Contrôle de la date d'expiration
   - Validation de la clé

### Limitations

- **Protection basique** : Le système est conçu pour une protection simple
- **Contournement possible** : Un utilisateur technique pourrait contourner la protection
- **Pas de validation en ligne** : Pas de contrôle centralisé

## 🛠️ Développement

### Ajout de nouvelles fonctionnalités

Pour ajouter des fonctionnalités protégées par licence :

```typescript
// Vérifier si une fonctionnalité est disponible
if (licenseService.hasFeature('premium')) {
  // Fonctionnalité premium
} else {
  // Fonctionnalité basique ou message d'erreur
}
```

### Niveaux de licence

- **Basic** : Fonctionnalités de base
- **Premium** : Toutes les fonctionnalités (inclut Basic)

### Extension du système

Pour ajouter de nouveaux niveaux :

1. Modifier `LicenseService.ts`
2. Ajouter les nouvelles fonctionnalités dans `hasFeature()`
3. Mettre à jour le générateur de clés
4. Modifier les interfaces utilisateur

## 📝 Fichiers de licence

Le générateur crée des fichiers JSON avec les informations de licence :

```json
{
  "machineId": "ABC123",
  "customerName": "Jean Dupont",
  "customerEmail": "jean@example.com",
  "expiryDate": "2025-12-31",
  "features": ["premium"],
  "licenseKey": "XXXX-XXXX-XXXX-XXXX",
  "generatedAt": "2024-01-15T10:30:00.000Z"
}
```

## 🔄 Maintenance

### Renouvellement de licence

1. Générer une nouvelle clé avec une nouvelle date d'expiration
2. Le client remplace l'ancienne licence par la nouvelle

### Révoquer une licence

1. Le client peut supprimer sa licence via l'interface
2. Ou modifier manuellement le localStorage

### Migration de licence

Pour transférer une licence vers une nouvelle machine :
1. Supprimer la licence de l'ancienne machine
2. Obtenir le nouvel identifiant machine
3. Générer une nouvelle clé pour la nouvelle machine

## 🚨 Dépannage

### Problèmes courants

1. **Licence non reconnue** :
   - Vérifier l'identifiant machine
   - Contrôler la date d'expiration
   - Valider les informations client

2. **Fonctionnalités non disponibles** :
   - Vérifier le niveau de licence
   - Contrôler la validité de la licence

3. **Erreur d'activation** :
   - Vérifier le format de la clé
   - Contrôler la cohérence des informations

### Logs de débogage

Activer les logs dans la console du navigateur pour diagnostiquer les problèmes de licence.

## 📞 Support

Pour toute question concernant le système de licence :
- Vérifier ce document
- Consulter les logs de l'application
- Contacter le développeur avec les informations de licence
