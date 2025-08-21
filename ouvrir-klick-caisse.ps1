# Script PowerShell pour ouvrir Klick Caisse avec la date du jour
# Auteur: Assistant IA
# Date: 2025-08-15

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    OUVERTURE KLICK CAISSE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtenir la date du jour au format YYMM
$date = Get-Date
$dateFormat = $date.ToString("yyMM")

Write-Host "Date du jour: $($date.ToString('dd/MM/yyyy'))" -ForegroundColor Green
Write-Host "Format date: $dateFormat" -ForegroundColor Green
Write-Host ""

# Vérifier si on est dans le bon dossier
$currentPath = Get-Location
Write-Host "Dossier actuel: $currentPath" -ForegroundColor Yellow

# Vérifier si package.json existe
if (-not (Test-Path "package.json")) {
    Write-Host "ERREUR: Fichier package.json non trouvé" -ForegroundColor Red
    Write-Host "Assurez-vous d'être dans le dossier de l'application Klick Caisse" -ForegroundColor Red
    Write-Host ""
    Read-Host "Appuyez sur Entrée pour fermer"
    exit 1
}

Write-Host "Démarrage de Klick Caisse..." -ForegroundColor Green
Write-Host "Date utilisée: $dateFormat" -ForegroundColor Green
Write-Host ""

try {
    # Démarrer l'application
    Start-Process -FilePath "npm" -ArgumentList "start" -NoNewWindow
    Write-Host "Application démarrée avec succès !" -ForegroundColor Green
    Write-Host "Date format: $dateFormat" -ForegroundColor Green
} catch {
    Write-Host "ERREUR lors du démarrage: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Appuyez sur Entrée pour fermer cette fenêtre..." -ForegroundColor Gray
Read-Host
