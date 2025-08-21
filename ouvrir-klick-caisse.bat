@echo off
REM Script pour ouvrir Klick Caisse avec la date du jour
REM Auteur: Assistant IA
REM Date: 2025-08-15

echo ========================================
echo    OUVERTURE KLICK CAISSE
echo ========================================

REM Obtenir la date du jour au format YYMM
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (
    set jour=%%a
    set mois=%%b
    set annee=%%c
)

REM Extraire l'année (2 derniers chiffres) et le mois
set annee_courte=%annee:~-2%
set mois_num=

if "%mois%"=="janvier" set mois_num=01
if "%mois%"=="février" set mois_num=02
if "%mois%"=="mars" set mois_num=03
if "%mois%"=="avril" set mois_num=04
if "%mois%"=="mai" set mois_num=05
if "%mois%"=="juin" set mois_num=06
if "%mois%"=="juillet" set mois_num=07
if "%mois%"=="août" set mois_num=08
if "%mois%"=="septembre" set mois_num=09
if "%mois%"=="octobre" set mois_num=10
if "%mois%"=="novembre" set mois_num=11
if "%mois%"=="décembre" set mois_num=12

REM Si le mois n'est pas trouvé, essayer avec les numéros
if "%mois_num%"=="" (
    if "%mois%"=="01" set mois_num=01
    if "%mois%"=="02" set mois_num=02
    if "%mois%"=="03" set mois_num=03
    if "%mois%"=="04" set mois_num=04
    if "%mois%"=="05" set mois_num=05
    if "%mois%"=="06" set mois_num=06
    if "%mois%"=="07" set mois_num=07
    if "%mois%"=="08" set mois_num=08
    if "%mois%"=="09" set mois_num=09
    if "%mois%"=="10" set mois_num=10
    if "%mois%"=="11" set mois_num=11
    if "%mois%"=="12" set mois_num=12
)

REM Construire la date au format YYMM
set date_format=%annee_courte%%mois_num%

echo Date du jour: %date_format%
echo.

REM Vérifier si le dossier existe
if not exist "%~dp0" (
    echo ERREUR: Dossier de l'application non trouvé
    pause
    exit /b 1
)

REM Aller dans le dossier de l'application
cd /d "%~dp0"

REM Vérifier si package.json existe
if not exist "package.json" (
    echo ERREUR: Fichier package.json non trouvé
    echo Assurez-vous d'être dans le bon dossier
    pause
    exit /b 1
)

echo Démarrage de Klick Caisse...
echo Date format: %date_format%
echo.

REM Démarrer l'application
start npm start

echo.
echo Application démarrée avec succès !
echo Date utilisée: %date_format%
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause > nul
