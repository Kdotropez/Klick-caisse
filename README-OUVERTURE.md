# Scripts d'ouverture automatique Klick Caisse

## Description
Ces scripts permettent d'ouvrir automatiquement l'application Klick Caisse avec la date du jour au format YYMM (ex: 2508 pour août 2025).

## Fichiers disponibles

### 1. `ouvrir-klick-caisse.bat` (Script Batch Windows)
- Compatible avec toutes les versions de Windows
- Double-clic pour exécuter
- Affiche la date du jour au format YYMM

### 2. `ouvrir-klick-caisse.ps1` (Script PowerShell)
- Nécessite PowerShell (inclus dans Windows 10/11)
- Interface colorée et plus moderne
- Gestion d'erreurs améliorée

## Utilisation

### Méthode 1: Double-clic
1. Placez le script dans le dossier racine de Klick Caisse
2. Double-cliquez sur `ouvrir-klick-caisse.bat` ou `ouvrir-klick-caisse.ps1`
3. L'application se lance automatiquement

### Méthode 2: Raccourci bureau
1. Clic droit sur le script → "Créer un raccourci"
2. Déplacez le raccourci sur le bureau
3. Double-clic sur le raccourci pour lancer l'application

### Méthode 3: Raccourci clavier
1. Clic droit sur le raccourci → "Propriétés"
2. Dans "Raccourci clavier", tapez votre combinaison (ex: Ctrl+Alt+K)
3. Cliquez "OK"

## Format de date
- **Aujourd'hui (15 août 2025)**: 2508
- **Septembre 2025**: 2509
- **Octobre 2025**: 2510
- etc.

## Vérifications automatiques
Les scripts vérifient automatiquement :
- ✅ Présence du fichier `package.json`
- ✅ Dossier de l'application valide
- ✅ Date du jour correcte

## Dépannage

### Erreur "package.json non trouvé"
- Assurez-vous que le script est dans le dossier racine de Klick Caisse
- Vérifiez que `package.json` existe dans le dossier

### Erreur "npm non reconnu"
- Installez Node.js depuis https://nodejs.org/
- Redémarrez votre ordinateur après l'installation

### Script PowerShell ne s'exécute pas
- Ouvrez PowerShell en tant qu'administrateur
- Exécutez: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Personnalisation
Vous pouvez modifier les scripts pour :
- Changer le format de date
- Ajouter des paramètres de lancement
- Modifier les messages affichés

## Support
En cas de problème, vérifiez :
1. Node.js est installé
2. Vous êtes dans le bon dossier
3. L'application fonctionne avec `npm start`
