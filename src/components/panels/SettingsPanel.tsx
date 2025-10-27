import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
import ExcludeDiscountCategoriesModal from '../modals/ExcludeDiscountCategoriesModal';
import { CheckCircle, Update, Assessment } from '@mui/icons-material';
import { resetToEmbeddedBase } from '../../data/productionData';
import { StorageService } from '../../services/StorageService';
import { UpdateService } from '../../services/UpdateService';
import { APP_VERSION } from '../../version';
import HistoricalReportModal from '../modals/HistoricalReportModal';

interface SettingsPanelProps {
  width: number;
  height: number;
  getScaledFontSize: (base: string) => string;
  importStatus?: "error" | "success" | "idle" | "importing";
  onImportCSV?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onImportVariationsCSV?: (file: File) => Promise<void>;
  onOpenCategoryManagement: () => void;
  onOpenSubcategoryManagement: () => void;
  isEditMode: boolean;
  onToggleEditMode?: () => void;
  selectedProductsForDeletionSize?: number;
  areAllProductsSelected?: boolean;
  onDeleteSelectedProducts?: () => void;
  onToggleSelectAllProducts?: () => void;
  onExportAll?: () => void;
  onImportAll?: (file: File) => Promise<void>;
  onImportTxOnly?: (file: File) => Promise<void>;
  onClearAllCategories?: () => void;
  onOpenDiscountRules?: () => void; // nouveau
}

// Fonction pour reconstruire à partir des fichiers JSON
const reconstructFromFiles = async (files: File[]) => {
  console.log('📁 Reconstruction à partir des fichiers JSON...');
  
  const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
  const existingZNumbers = new Set(currentClosures.map((c: any) => c.zNumber));
  const missingZNumbers: number[] = [];
  
  for (let z = 1; z <= 50; z++) {
    if (!existingZNumbers.has(z)) {
      missingZNumbers.push(z);
    }
  }
  
  console.log(`🕳️ Z manquants détectés: ${missingZNumbers.join(', ')}`);
  
  const reconstructedClosures: any[] = [];
  
  // Analyser chaque fichier pour extraire les transactions par jour
  for (const file of files) {
    try {
      console.log(`🔍 Analyse du fichier : ${file.name}`);
      const text = await file.text();
      const backupData = JSON.parse(text);
      
      if (backupData.closures && Array.isArray(backupData.closures)) {
        // Extraire les transactions de chaque clôture
        backupData.closures.forEach((closure: any) => {
          if (closure.transactions && Array.isArray(closure.transactions)) {
            // Grouper les transactions par jour
            const transactionsByDay: { [key: string]: any[] } = {};
            
            closure.transactions.forEach((tx: any) => {
              const day = new Date(tx.timestamp).toISOString().split('T')[0];
              if (!transactionsByDay[day]) {
                transactionsByDay[day] = [];
              }
              transactionsByDay[day].push(tx);
            });
            
            // Reconstruire les clôtures manquantes pour chaque jour
            Object.keys(transactionsByDay).forEach((day, index) => {
              const dayTransactions = transactionsByDay[day];
              const missingZ = missingZNumbers[index];
              
              if (missingZ && dayTransactions.length > 0) {
                const totalCA = dayTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
                const totalTransactions = dayTransactions.length;
                
                // Calculer les remises
                let totalDiscounts = 0;
                dayTransactions.forEach((tx: any) => {
                  if (tx.globalDiscount) {
                    totalDiscounts += tx.globalDiscount;
                  }
                  if (tx.itemDiscounts) {
                    Object.values(tx.itemDiscounts).forEach((discount: any) => {
                      if (discount.type === 'euro') {
                        totalDiscounts += (discount.value || 0) * (tx.items?.length || 0);
                      }
                    });
                  }
                });
                
                const netCA = totalCA - totalDiscounts;
                
                const reconstructedClosure = {
                  zNumber: missingZ,
                  closedAt: new Date(day + 'T23:59:59.000Z').toISOString(),
                  transactions: dayTransactions,
                  totalCA: netCA,
                  totalTransactions: totalTransactions,
                  totalDiscounts: totalDiscounts,
                  reconstructed: true,
                  source: file.name
                };
                
                reconstructedClosures.push(reconstructedClosure);
                console.log(`✅ Z${missingZ} reconstruit pour le ${day} depuis ${file.name}: ${totalTransactions} tickets, ${netCA}€`);
              }
            });
          }
        });
      }
    } catch (e) {
      console.error(`❌ Erreur lecture fichier ${file.name}:`, e);
    }
  }
  
  if (reconstructedClosures.length > 0) {
    // Fusionner avec les clôtures existantes
    const allClosures = [...currentClosures, ...reconstructedClosures];
    allClosures.sort((a: any, b: any) => a.zNumber - b.zNumber);
    
    // Sauvegarder
    localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
    
    // Mettre à jour le compteur Z
    const maxZ = Math.max(...allClosures.map((c: any) => c.zNumber));
    localStorage.setItem('klick_caisse_z_counter', String(maxZ));
    
    console.log(`🎉 Reconstruction terminée !`);
    console.log(`📊 ${reconstructedClosures.length} clôtures reconstruites`);
    console.log(`📋 Total: ${allClosures.length} clôtures`);
    
    const zNumbers = allClosures.map((c: any) => c.zNumber);
    console.log(`📈 Séquence Z: ${zNumbers.join(' → ')}`);
    
    // Forcer le rafraîchissement
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
    alert(`🎉 Reconstruction réussie depuis les fichiers !\n\n` +
          `📊 ${reconstructedClosures.length} clôtures reconstruites\n` +
          `📋 Total: ${allClosures.length} clôtures\n` +
          `📈 Séquence: ${zNumbers.join(' → ')}\n\n` +
          `Les clôtures ont été reconstruites à partir des fichiers JSON.\n` +
          `La page va se recharger dans 2 secondes...`);
    
  } else {
    alert('❌ Aucune clôture reconstruite depuis les fichiers sélectionnés.');
  }
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  width,
  height,
  getScaledFontSize,
  onImportCSV,
  onOpenCategoryManagement,
  onOpenSubcategoryManagement,
  isEditMode,
  onClearAllCategories,
  onOpenDiscountRules,
}) => {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showHistoricalReport, setShowHistoricalReport] = useState(false);
  const [showExcludeCats, setShowExcludeCats] = useState(false);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const updateInfo = await UpdateService.checkForUpdates(APP_VERSION);
      if (updateInfo) {
        const message = `Nouvelle version disponible : ${updateInfo.version}\n\n${updateInfo.releaseNotes}`;
        if (window.confirm(`${message}\n\nVoulez-vous rafraîchir l'application maintenant ?`)) {
          window.location.reload();
        }
      } else {
        window.alert('Aucune mise à jour disponible. Votre application est à jour !');
      }
    } catch (error) {
              window.alert('Erreur lors de la vérification des mises à jour.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };
  const gap = 2;
  const totalGapsWidth = 4;
  const totalGapsHeight = 6;
  const totalPaddingWidth = 8;
  const totalPaddingHeight = 8;
  const availableWidth = width - totalGapsWidth - totalPaddingWidth;
  const availableHeight = height - totalGapsHeight - totalPaddingHeight;
  const buttonWidth = Math.floor(availableWidth / 3);
  const buttonHeight = Math.floor(availableHeight / 4);

  

  return (
    <Box
      sx={{
        height: '100%',
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${buttonWidth}px)`,
        gridAutoRows: `${buttonHeight}px`,
        gap: `${gap}px`,
        p: 0.5,
        boxSizing: 'border-box',
        justifyContent: 'center',
        alignItems: 'center',
        overflowY: 'auto',
      }}
    >
      {/* Input de fichier JSON caché pour import nested */}
      <input
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={onImportCSV}
        id="klick-import-json-input"
      />

      {/* Indication "base intégrée" retirée sur demande */}

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#9c27b0',
          '&:hover': { backgroundColor: '#7b1fa2' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => (document.getElementById('klick-import-json-input') as HTMLInputElement)?.click()}
      >
        Importer JSON (nested)
      </Button>

      <Button
        variant="contained"
        sx={{ width: '100%', height: '100%', fontSize: getScaledFontSize('0.5rem'), fontWeight: 'bold', backgroundColor: '#795548', '&:hover': { backgroundColor: '#5d4037' }, boxSizing: 'border-box', overflow: 'hidden', textTransform: 'none', lineHeight: 1.0, padding: '1px' }}
        onClick={() => setShowExcludeCats(true)}
      >
        Exclure catégories (remises)
      </Button>

      <ExcludeDiscountCategoriesModal open={showExcludeCats} onClose={() => setShowExcludeCats(false)} />

      {/* Diagnostics sous-catégories */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#607d8b',
          '&:hover': { backgroundColor: '#546e7a' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            const products = StorageService.loadProducts() as any[];
            const categories = StorageService.loadCategories() as any[];
            const subcats = StorageService.loadSubcategories();
            const sample = products.slice(0, 5).map(p => ({ id: p.id, cat: p.category, sub: p.associatedCategories }));
            alert(`Produits: ${products.length}\nCatégories: ${categories.length}\nSous-catégories (registre): ${subcats.length}\nExemples:\n${JSON.stringify(sample, null, 2)}`);
          } catch (e) { alert('Erreur diagnostics'); }
        }}
      >
        Diagnostics sous-catégories
      </Button>

      {/* Restaurer base par défaut (purge + recharger base intégrée et sous-catégories) */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#455a64',
          '&:hover': { backgroundColor: '#37474f' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            localStorage.removeItem('klick_caisse_products');
            localStorage.removeItem('klick_caisse_categories');
            localStorage.removeItem('klick_caisse_settings');
            // Réinjecter immédiatement la base intégrée et les sous-catégories
            resetToEmbeddedBase();
            alert('Données locales réinitialisées. Base intégrée restaurée. Rechargement...');
            window.location.reload();
          } catch (e) { alert('Erreur réinitialisation données'); }
        }}
      >
        Restaurer base par défaut
      </Button>

      {/* Reconstituer sous-catégories depuis les produits (sans reload) */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#607d8b',
          '&:hover': { backgroundColor: '#546e7a' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            const products = StorageService.loadProducts() as any[];
            const set = new Set<string>();
            for (const p of products) {
              const list = Array.isArray((p as any).associatedCategories) ? (p as any).associatedCategories as string[] : [];
              for (const raw of list) {
                const clean = StorageService.sanitizeLabel(String(raw || '')).trim();
                if (clean) set.add(clean);
              }
            }
            const subcats = Array.from(set).sort((a,b)=>a.localeCompare(b,'fr',{sensitivity:'base'}));
            StorageService.saveSubcategories(subcats);
            alert(`Sous-catégories reconstruites (${subcats.length}).`);
          } catch (e) { alert('Erreur reconstitution sous-catégories'); }
        }}
      >
        Reconstituer sous-catégories
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#009688',
          '&:hover': { backgroundColor: '#00796b' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={onOpenCategoryManagement}
      >
        Gestion Catégories
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#4caf50',
          '&:hover': { backgroundColor: '#388e3c' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            // Forcer la réinitialisation vers la base intégrée pour tester
            const { resetToEmbeddedBase } = require('../../data/productionData');
            resetToEmbeddedBase();
            const subcats = StorageService.loadSubcategories();
            alert(`Synchronisation réussie ! ${subcats.length} sous-catégories disponibles.`);
          } catch (e) { 
            const errorMessage = e instanceof Error ? e.message : String(e);
            alert('Erreur lors de la synchronisation des sous-catégories: ' + errorMessage); 
          }
        }}
      >
        Sync Sous-catégories
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#673ab7',
          '&:hover': { backgroundColor: '#5e35b1' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={onOpenSubcategoryManagement}
      >
        Gestion Sous-catégories
      </Button>

      <Button
        variant="contained"
        disabled={isCheckingUpdate}
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#ff9800',
          '&:hover': { backgroundColor: '#f57c00' },
          '&:disabled': { backgroundColor: '#ccc' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={handleCheckUpdate}
      >
        {isCheckingUpdate ? 'Vérification...' : `Vérifier MAJ (v${APP_VERSION})`}
      </Button>

      {isEditMode && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            p: 1,
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: getScaledFontSize('0.6rem'), color: '#856404' }}>
            Mode édition activé
          </span>
        </Box>
      )}

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#607d8b',
          '&:hover': { backgroundColor: '#546e7a' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={onClearAllCategories}
      >
        Effacer toutes les catégories
      </Button>

      {/* Bouton libre: Barèmes remises */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#ff9800',
          '&:hover': { backgroundColor: '#f57c00' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={onOpenDiscountRules}
      >
        Barèmes remises
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#795548',
          '&:hover': { backgroundColor: '#6d4c41' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => setShowHistoricalReport(true)}
      >
        <Assessment sx={{ fontSize: '1.2em', mr: 0.5 }} />
        Rapport Historique
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#4caf50',
          '&:hover': { backgroundColor: '#388e3c' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            StorageService.saveImmediateBackup();
          } catch (e) {
            console.error('Erreur sauvegarde manuelle:', e);
            alert('❌ Erreur lors de la sauvegarde');
          }
        }}
      >
        💾 Sauvegarde
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#ff9800',
          '&:hover': { backgroundColor: '#f57c00' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            // Créer un input file pour sélectionner le fichier de sauvegarde
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
              const file = (event.target as HTMLInputElement).files?.[0];
              if (!file) return;
              
              try {
                console.log('📁 Lecture du fichier:', file.name);
                const text = await file.text();
                const data = JSON.parse(text);
                
                console.log('📊 Contenu du fichier:', {
                  products: data.products?.length || 0,
                  categories: data.categories?.length || 0,
                  closures: data.closures?.length || 0,
                  zCounter: data.zCounter || 0,
                  hasSettings: !!data.settings,
                  hasSubcategories: !!data.subcategories,
                  hasTransactions: !!data.transactionsByDay
                });
                
                // Restaurer les données
                if (data.products) {
                  localStorage.setItem('klick_caisse_products', JSON.stringify(data.products));
                  console.log('✅ Produits restaurés:', data.products.length);
                }
                
                if (data.categories) {
                  localStorage.setItem('klick_caisse_categories', JSON.stringify(data.categories));
                  console.log('✅ Catégories restaurées:', data.categories.length);
                }
                
                if (data.settings) {
                  localStorage.setItem('klick_caisse_settings', JSON.stringify(data.settings));
                  console.log('✅ Paramètres restaurés');
                }
                
                if (data.subcategories) {
                  localStorage.setItem('klick_caisse_subcategories', JSON.stringify(data.subcategories));
                  console.log('✅ Sous-catégories restaurées:', data.subcategories.length);
                }
                
                if (data.closures) {
                  // Fusionner intelligemment les clôtures au lieu de les remplacer
                  const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
                  const newClosures = data.closures;
                  
                  // Créer un Set des numéros Z existants pour éviter les doublons
                  const existingZNumbers = new Set(currentClosures.map((c: any) => c.zNumber));
                  
                  // Ajouter seulement les clôtures qui n'existent pas déjà
                  const mergedClosures = [...currentClosures];
                  let addedCount = 0;
                  
                  newClosures.forEach((newClosure: any) => {
                    if (!existingZNumbers.has(newClosure.zNumber)) {
                      mergedClosures.push(newClosure);
                      addedCount++;
                      console.log(`  ✅ Clôture Z${newClosure.zNumber} ajoutée`);
                    } else {
                      console.log(`  ⚠️ Clôture Z${newClosure.zNumber} déjà présente, ignorée`);
                    }
                  });
                  
                  // Trier par numéro Z
                  mergedClosures.sort((a: any, b: any) => a.zNumber - b.zNumber);
                  
                  localStorage.setItem('klick_caisse_closures', JSON.stringify(mergedClosures));
                  console.log(`✅ Clôtures fusionnées: ${addedCount} nouvelles + ${currentClosures.length} existantes = ${mergedClosures.length} total`);
                }
                
                if (data.zCounter !== undefined) {
                  localStorage.setItem('klick_caisse_z_counter', String(data.zCounter));
                  console.log('✅ Compteur Z restauré:', data.zCounter);
                }
                
                if (data.transactionsByDay) {
                  localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(data.transactionsByDay));
                  console.log('✅ Transactions restaurées');
                }
                
                if (data.cashiers) {
                  localStorage.setItem('klick_caisse_cashiers', JSON.stringify(data.cashiers));
                  console.log('✅ Caissiers restaurés:', data.cashiers.length);
                }
                
                // Calculer le nombre total de clôtures après fusion
                const finalClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
                const finalZNumbers = finalClosures.map((c: any) => c.zNumber).sort((a: number, b: number) => a - b);
                
                const message = `✅ Restauration terminée avec succès !\n\n` +
                               `📦 ${data.products?.length || 0} produits\n` +
                               `📂 ${data.categories?.length || 0} catégories\n` +
                               `🔒 ${finalClosures.length} clôtures (fusion intelligente)\n` +
                               `📈 Séquence Z: ${finalZNumbers.join(' → ')}\n` +
                               `💰 Z${data.zCounter || 0}\n\n` +
                               `Rechargez la page pour voir les changements.`;
                
                alert(message);
                
              } catch (error) {
                console.error('❌ Erreur lors de la restauration:', error);
                alert('❌ Erreur lors de la restauration: ' + (error as Error).message);
              }
            };
            
            input.click();
          } catch (e) {
            console.error('Erreur restauration:', e);
            alert('❌ Erreur lors de la restauration');
          }
        }}
      >
        🔄 Restaurer
      </Button>

      {/* Importer un seul Z depuis un backup JSON */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#8bc34a',
          '&:hover': { backgroundColor: '#689f38' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.onchange = async (event) => {
              const file = (event.target as HTMLInputElement).files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const data = JSON.parse(text);
                const closures: any[] = Array.isArray(data?.closures) ? data.closures : [];
                if (closures.length === 0) {
                  alert('Aucune clôture (Z) trouvée dans ce fichier.');
                  return;
                }
                // Construire une liste lisible
                const lines = closures.map((c: any, i: number) => {
                  const z = Number(c?.zNumber) || 0;
                  const closedAt = c?.closedAt ? new Date(c.closedAt) : null;
                  const dateStr = closedAt ? `${closedAt.toLocaleDateString()} ${closedAt.toLocaleTimeString()}` : '—';
                  const txs = Array.isArray(c?.transactions) ? c.transactions : [];
                  const ca = txs.reduce((s: number, t: any) => s + (Number(t?.total) || 0), 0);
                  return `${i + 1}) Z${z} · ${dateStr} · ${txs.length} tickets · ${ca.toFixed(2)}€`;
                });
                const choice = window.prompt(
                  'Sélectionnez le Z à importer:\n' +
                  lines.join('\n') +
                  '\n\nEntrez soit le numéro de Z (ex: 12), soit l\'index de ligne (ex: 3).\n' +
                  'S\'il y a plusieurs Z avec le même numéro, utilisez l\'index pour choisir précisément.'
                );
                if (!choice) return;
                const num = parseInt(choice, 10);
                let selected: any | null = null;
                if (Number.isFinite(num)) {
                  // Doublons potentiels: si plusieurs Z ont le même numéro, on privilégie l'index saisi
                  const byIndex = closures[num - 1];
                  if (byIndex) {
                    selected = byIndex;
                  } else {
                    const same = closures.filter(c => Number(c?.zNumber) === num);
                    if (same.length === 1) selected = same[0];
                    else if (same.length > 1) {
                      // Demander un sous-index parmi les doublons
                      const subLines = same.map((c, i) => {
                        const closedAt = c?.closedAt ? new Date(c.closedAt) : null;
                        const dateStr = closedAt ? `${closedAt.toLocaleDateString()} ${closedAt.toLocaleTimeString()}` : '—';
                        const txs = Array.isArray(c?.transactions) ? c.transactions : [];
                        const ca = txs.reduce((s: number, t: any) => s + (Number(t?.total) || 0), 0);
                        return `${i + 1}) Z${num} · ${dateStr} · ${txs.length} tickets · ${ca.toFixed(2)}€`;
                      });
                      const sub = window.prompt(
                        `Plusieurs Z${num} trouvés. Choisissez parmi:\n` +
                        subLines.join('\n') +
                        `\n\nEntrez l\'index (1..${same.length})`
                      );
                      const subIdx = parseInt(sub || '', 10);
                      if (!Number.isFinite(subIdx) || subIdx < 1 || subIdx > same.length) {
                        alert('Index invalide. Import annulé.');
                        return;
                      }
                      selected = same[subIdx - 1];
                    }
                  }
                }
                if (!selected) {
                  alert('Sélection invalide.');
                  return;
                }
                // Charger les clôtures locales et vérifier disponibilité du Z cible
                const currentClosures: any[] = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
                const used = new Set(currentClosures.map(c => Number(c?.zNumber) || 0));
                const maxZ = currentClosures.reduce((m, c) => Math.max(m, Number(c?.zNumber) || 0), 0);

                const defaultTarget = used.has(Number(selected.zNumber)) ? (maxZ + 1) : Number(selected.zNumber) || (maxZ + 1);
                const targetInput = window.prompt(
                  `Numéro Z cible pour l'import (laisser vide pour Z${defaultTarget})`);

                let targetZ: number = defaultTarget;
                if (targetInput && targetInput.trim().length > 0) {
                  const parsed = parseInt(targetInput.trim(), 10);
                  if (!Number.isFinite(parsed) || parsed <= 0) {
                    alert('Numéro Z invalide. Import annulé.');
                    return;
                  }
                  if (used.has(parsed)) {
                    alert(`Le Z${parsed} existe déjà. Choisissez un autre numéro. Import annulé.`);
                    return;
                  }
                  targetZ = parsed;
                }

                selected = { ...selected, zNumber: targetZ };
                const merged = [...currentClosures, selected].sort((a, b) => Number(a.zNumber) - Number(b.zNumber));
                localStorage.setItem('klick_caisse_closures', JSON.stringify(merged));
                const newCounter = Math.max(maxZ, Number(selected.zNumber) || 0);
                localStorage.setItem('klick_caisse_z_counter', String(newCounter));

                // Fusionner transactionsByDay pour assurer la visibilité dans les rapports
                const txs = Array.isArray(selected?.transactions) ? selected.transactions : [];
                try {
                  const raw = localStorage.getItem('klick_caisse_transactions_by_day');
                  const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
                  for (const t of txs) {
                    const d = new Date(t?.timestamp);
                    const day = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
                    if (!day) continue;
                    if (!Array.isArray(map[day])) map[day] = [];
                    map[day].push(t);
                  }
                  localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(map));
                } catch {}

                alert(`✅ Z importé: Z${selected.zNumber} (tickets: ${txs.length}).`);
              } catch (e) {
                alert('Erreur lors de la lecture du fichier ou de la sélection.');
              }
            };
            input.click();
          } catch (e) {
            alert('Erreur: impossible d\'ouvrir le sélecteur de fichier.');
          }
        }}
      >
        ↗️ Importer un seul Z
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#ff5722',
          '&:hover': { backgroundColor: '#e64a19' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            console.log('🔍 Recherche des clôtures manquantes dans les fichiers de sauvegarde...');
            
            // Créer un input file pour sélectionner un fichier de sauvegarde
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.multiple = true; // Permettre plusieurs fichiers
            
            input.onchange = async (event) => {
              const files = Array.from((event.target as HTMLInputElement).files || []);
              if (files.length === 0) return;
              
              try {
                // 1. Récupérer les clôtures actuelles
                let currentClosures: any[] = [];
                try {
                  const current = localStorage.getItem('klick_caisse_closures');
                  if (current) {
                    currentClosures = JSON.parse(current);
                  }
                } catch (e) {
                  console.error('❌ Erreur lecture clôtures actuelles:', e);
                }
                
                console.log(`📋 Clôtures actuelles : ${currentClosures.length}`);
                
                // 2. Identifier les gaps
                const zNumbers = currentClosures.map((c: any) => c.zNumber).sort((a: number, b: number) => a - b);
                const gaps: number[] = [];
                for (let i = 0; i < zNumbers.length - 1; i++) {
                  const current = zNumbers[i];
                  const next = zNumbers[i + 1];
                  if (next - current > 1) {
                    for (let missing = current + 1; missing < next; missing++) {
                      gaps.push(missing);
                    }
                  }
                }
                
                console.log(`🕳️ Clôtures manquantes détectées : Z${gaps.join(', Z')}`);
                
                // 3. Analyser tous les fichiers de sauvegarde
                let recoveredClosures: any[] = [];
                let foundGaps = new Set<number>();
                
                for (const file of files) {
                  try {
                    console.log(`🔍 Analyse du fichier : ${file.name}`);
                    const text = await file.text();
                    const backupData = JSON.parse(text);
                    
                    if (backupData.closures && Array.isArray(backupData.closures)) {
                      console.log(`  📊 ${backupData.closures.length} clôtures trouvées dans ${file.name}`);
                      
                      backupData.closures.forEach((closure: any) => {
                        if (gaps.includes(closure.zNumber) && !foundGaps.has(closure.zNumber)) {
                          console.log(`    ✅ Clôture Z${closure.zNumber} récupérée ! (${closure.totalTransactions} tickets, ${closure.totalCA}€)`);
                          recoveredClosures.push(closure);
                          foundGaps.add(closure.zNumber);
                        }
                      });
                    }
                  } catch (e) {
                    console.error(`❌ Erreur lecture fichier ${file.name}:`, e);
                  }
                }
                
                // 4. Afficher le résultat
                console.log(`🎯 Récupération : ${recoveredClosures.length}/${gaps.length} clôtures manquantes trouvées`);
                
                if (recoveredClosures.length > 0) {
                  // 5. Fusionner avec les clôtures actuelles
                  const allClosures = [...currentClosures, ...recoveredClosures];
                  allClosures.sort((a: any, b: any) => a.zNumber - b.zNumber);
                  
                  // 6. Sauvegarder
                  localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
                  console.log(`✅ ${allClosures.length} clôtures sauvegardées au total`);
                  
                  // Mettre à jour le compteur Z si nécessaire
                  const maxZ = Math.max(...allClosures.map((c: any) => c.zNumber));
                  const currentCounter = parseInt(localStorage.getItem('klick_caisse_z_counter') || '0');
                  if (maxZ > currentCounter) {
                    localStorage.setItem('klick_caisse_z_counter', String(maxZ));
                    console.log(`🔢 Compteur Z mis à jour : ${maxZ}`);
                  }
                  
                  // Afficher la séquence complète
                  const finalZNumbers = allClosures.map((c: any) => c.zNumber).sort((a: number, b: number) => a - b);
                  console.log(`📈 Séquence Z complète : ${finalZNumbers.join(' → ')}`);
                  
                  // Forcer le rafraîchissement de l'interface
                  setTimeout(() => {
                    window.location.reload();
                  }, 2000);
                  
                  const message = `🎉 Récupération réussie !\n\n` +
                                 `📊 ${recoveredClosures.length} clôtures récupérées\n` +
                                 `📋 Total : ${allClosures.length} clôtures\n` +
                                 `📈 Séquence : ${finalZNumbers.join(' → ')}\n\n` +
                                 `La page va se recharger automatiquement dans 2 secondes...`;
                  
                  alert(message);
                } else {
                  alert(`❌ Aucune clôture manquante trouvée dans les fichiers sélectionnés.\n\nGaps détectés : Z${gaps.join(', Z')}\n\nEssayez avec d'autres fichiers de sauvegarde.`);
                }
                
              } catch (e) {
                console.error('❌ Erreur récupération clôtures:', e);
                alert('❌ Erreur lors de la récupération des clôtures : ' + (e as Error).message);
              }
            };
            
            input.click();
            
          } catch (e) {
            console.error('❌ Erreur récupération clôtures:', e);
            alert('❌ Erreur lors de la récupération des clôtures : ' + (e as Error).message);
          }
        }}
      >
        🔍 Récupérer Clôtures
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#e91e63',
          '&:hover': { backgroundColor: '#c2185b' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            console.log('🔧 Reconstruction des clôtures Z manquantes...');
            
            // Demander à l'utilisateur s'il veut utiliser les fichiers JSON ou le localStorage
            const useFiles = window.confirm(
              'Choisissez la source de reconstruction :\n\n' +
              '✅ OK = Analyser les fichiers JSON de sauvegarde\n' +
              '❌ Annuler = Utiliser les transactions du localStorage'
            );
            
            if (useFiles) {
              // Créer un input file pour sélectionner les fichiers JSON
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.multiple = true;
              
              input.onchange = async (event) => {
                const files = Array.from((event.target as HTMLInputElement).files || []);
                if (files.length === 0) return;
                
                try {
                  // Analyser les fichiers JSON pour reconstruire
                  await reconstructFromFiles(files);
                } catch (e) {
                  console.error('❌ Erreur reconstruction depuis fichiers:', e);
                  alert('❌ Erreur lors de la reconstruction: ' + (e as Error).message);
                }
              };
              
              input.click();
              return;
            }
            
            // 1. Récupérer toutes les transactions archivées du localStorage
            const transactionsByDay = localStorage.getItem('klick_caisse_transactions_by_day');
            if (!transactionsByDay) {
              alert('❌ Aucune transaction archivée trouvée dans le localStorage.\n\nEssayez avec les fichiers JSON de sauvegarde.');
              return;
            }
            
            const txMap = JSON.parse(transactionsByDay);
            const allTransactions: any[] = [];
            
            // Parcourir tous les jours
            Object.keys(txMap).forEach(day => {
              if (Array.isArray(txMap[day])) {
                txMap[day].forEach((tx: any) => {
                  allTransactions.push({ ...tx, day: day });
                });
              }
            });
            
            console.log(`📊 ${allTransactions.length} transactions archivées trouvées`);
            
            // 2. Identifier les gaps
            const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
            const existingZNumbers = new Set(currentClosures.map((c: any) => c.zNumber));
            const missingZNumbers: number[] = [];
            
            for (let z = 1; z <= 50; z++) {
              if (!existingZNumbers.has(z)) {
                missingZNumbers.push(z);
              }
            }
            
            console.log(`🕳️ Z manquants détectés: ${missingZNumbers.join(', ')}`);
            
            // 3. Grouper les transactions par jour
            const transactionsByDayGrouped: { [key: string]: any[] } = {};
            allTransactions.forEach((tx: any) => {
              if (!transactionsByDayGrouped[tx.day]) {
                transactionsByDayGrouped[tx.day] = [];
              }
              transactionsByDayGrouped[tx.day].push(tx);
            });
            
            // 4. Reconstruire les clôtures manquantes
            const reconstructedClosures: any[] = [];
            const days = Object.keys(transactionsByDayGrouped).sort();
            
            missingZNumbers.forEach((zNumber, index) => {
              const day = days[index];
              if (day && transactionsByDayGrouped[day]) {
                const dayTransactions = transactionsByDayGrouped[day];
                const totalCA = dayTransactions.reduce((sum, tx) => sum + (tx.total || 0), 0);
                const totalTransactions = dayTransactions.length;
                
                // Calculer les remises
                let totalDiscounts = 0;
                dayTransactions.forEach((tx: any) => {
                  if (tx.globalDiscount) {
                    totalDiscounts += tx.globalDiscount;
                  }
                  if (tx.itemDiscounts) {
                    Object.values(tx.itemDiscounts).forEach((discount: any) => {
                      if (discount.type === 'euro') {
                        totalDiscounts += (discount.value || 0) * (tx.items?.length || 0);
                      }
                    });
                  }
                });
                
                const netCA = totalCA - totalDiscounts;
                
                const reconstructedClosure = {
                  zNumber: zNumber,
                  closedAt: new Date(day + 'T23:59:59.000Z').toISOString(),
                  transactions: dayTransactions,
                  totalCA: netCA,
                  totalTransactions: totalTransactions,
                  totalDiscounts: totalDiscounts,
                  reconstructed: true // Marquer comme reconstruite
                };
                
                reconstructedClosures.push(reconstructedClosure);
                console.log(`✅ Z${zNumber} reconstruit pour le ${day}: ${totalTransactions} tickets, ${netCA}€`);
              }
            });
            
            if (reconstructedClosures.length > 0) {
              // 5. Fusionner avec les clôtures existantes
              const allClosures = [...currentClosures, ...reconstructedClosures];
              allClosures.sort((a: any, b: any) => a.zNumber - b.zNumber);
              
              // 6. Sauvegarder
              localStorage.setItem('klick_caisse_closures', JSON.stringify(allClosures));
              
              // Mettre à jour le compteur Z
              const maxZ = Math.max(...allClosures.map((c: any) => c.zNumber));
              localStorage.setItem('klick_caisse_z_counter', String(maxZ));
              
              console.log(`🎉 Reconstruction terminée !`);
              console.log(`📊 ${reconstructedClosures.length} clôtures reconstruites`);
              console.log(`📋 Total: ${allClosures.length} clôtures`);
              
              const zNumbers = allClosures.map((c: any) => c.zNumber);
              console.log(`📈 Séquence Z: ${zNumbers.join(' → ')}`);
              
              // Forcer le rafraîchissement
              setTimeout(() => {
                window.location.reload();
              }, 2000);
              
              alert(`🎉 Reconstruction réussie !\n\n` +
                    `📊 ${reconstructedClosures.length} clôtures reconstruites\n` +
                    `📋 Total: ${allClosures.length} clôtures\n` +
                    `📈 Séquence: ${zNumbers.join(' → ')}\n\n` +
                    `Les clôtures ont été reconstruites à partir des transactions archivées.\n` +
                    `La page va se recharger dans 2 secondes...`);
              
            } else {
              alert('ℹ️ Aucune clôture manquante détectée ou aucune transaction archivée disponible.');
            }
            
          } catch (e) {
            console.error('❌ Erreur reconstruction:', e);
            alert('❌ Erreur lors de la reconstruction: ' + (e as Error).message);
          }
        }}
      >
        🔧 Reconstruire Z
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#f44336',
          '&:hover': { backgroundColor: '#d32f2f' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            console.log('🧹 Nettoyage des doublons de clôtures...');
            
            const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
            console.log(`📊 Avant nettoyage: ${currentClosures.length} clôtures`);
            
            // Supprimer les doublons en gardant la première occurrence de chaque Z
            const uniqueClosures: any[] = [];
            const seenZNumbers = new Set<number>();
            let duplicatesRemoved = 0;
            
            currentClosures.forEach((closure: any) => {
              if (!seenZNumbers.has(closure.zNumber)) {
                seenZNumbers.add(closure.zNumber);
                uniqueClosures.push(closure);
              } else {
                duplicatesRemoved++;
                console.log(`🗑️ Doublon Z${closure.zNumber} supprimé`);
              }
            });
            
            // Trier par numéro Z
            uniqueClosures.sort((a: any, b: any) => a.zNumber - b.zNumber);
            
            // Sauvegarder les clôtures nettoyées
            localStorage.setItem('klick_caisse_closures', JSON.stringify(uniqueClosures));
            
            // Mettre à jour le compteur Z
            const maxZ = Math.max(...uniqueClosures.map((c: any) => c.zNumber));
            localStorage.setItem('klick_caisse_z_counter', String(maxZ));
            
            const zNumbers = uniqueClosures.map((c: any) => c.zNumber);
            
            console.log(`✅ Nettoyage terminé !`);
            console.log(`📊 ${duplicatesRemoved} doublons supprimés`);
            console.log(`📋 ${uniqueClosures.length} clôtures uniques restantes`);
            console.log(`📈 Séquence Z: ${zNumbers.join(' → ')}`);
            
            // Forcer le rafraîchissement
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
            alert(`🧹 Nettoyage des doublons terminé !\n\n` +
                  `🗑️ ${duplicatesRemoved} doublons supprimés\n` +
                  `📋 ${uniqueClosures.length} clôtures uniques restantes\n` +
                  `📈 Séquence: ${zNumbers.join(' → ')}\n\n` +
                  `La page va se recharger dans 2 secondes...`);
            
          } catch (e) {
            console.error('❌ Erreur nettoyage:', e);
            alert('❌ Erreur lors du nettoyage: ' + (e as Error).message);
          }
        }}
      >
        🧹 Nettoyer Doublons
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#d32f2f',
          '&:hover': { backgroundColor: '#b71c1c' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            const currentClosures = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
            const zCounter = parseInt(localStorage.getItem('klick_caisse_z_counter') || '0');
            
            if (currentClosures.length === 0) {
              alert('ℹ️ Aucune clôture Z en mémoire à supprimer.');
              return;
            }
            
            const confirmMessage = `⚠️ ATTENTION : Suppression de TOUTES les clôtures Z en mémoire\n\n` +
                                 `📋 Clôtures actuelles : ${currentClosures.length}\n` +
                                 `📈 Dernière clôture : Z${zCounter}\n` +
                                 `🗑️ Cette action supprimera :\n` +
                                 `   • Toutes les clôtures archivées\n` +
                                 `   • Le compteur Z (remis à 0)\n\n` +
                                 `❌ Cette action est IRRÉVERSIBLE !\n\n` +
                                 `Êtes-vous sûr de vouloir continuer ?`;
            
            if (!window.confirm(confirmMessage)) {
              return;
            }
            
            // Double confirmation
            if (!window.confirm('🚨 DERNIÈRE CONFIRMATION 🚨\n\n' +
                               `Vous allez supprimer ${currentClosures.length} clôtures Z.\n` +
                               'Cette action est IRRÉVERSIBLE !\n\n' +
                               'Cliquez sur OK pour confirmer la suppression.')) {
              return;
            }
            
            // Supprimer toutes les clôtures
            localStorage.removeItem('klick_caisse_closures');
            localStorage.removeItem('klick_caisse_z_counter');
            
            console.log('🗑️ Toutes les clôtures Z supprimées de la mémoire');
            
            alert(`✅ Suppression terminée !\n\n` +
                  `🗑️ ${currentClosures.length} clôtures Z supprimées\n` +
                  `📈 Compteur Z remis à 0\n\n` +
                  `La page va se recharger automatiquement.`);
            
            // Recharger la page pour voir les changements
            setTimeout(() => {
              window.location.reload();
            }, 2000);
            
          } catch (e) {
            console.error('❌ Erreur suppression clôtures:', e);
            alert('❌ Erreur lors de la suppression: ' + (e as Error).message);
          }
        }}
      >
        🗑️ Supprimer Toutes les Z
      </Button>

      {/* Importer un Z depuis un dossier de sauvegardes */}
      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#388e3c',
          '&:hover': { backgroundColor: '#2e7d32' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => {
          try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            (input as any).webkitdirectory = true; // sélection de dossier (Chrome/Edge)
            input.multiple = true;
            input.onchange = async (event) => {
              const files = Array.from((event.target as HTMLInputElement).files || [])
                .filter(f => f.name.toLowerCase().endsWith('.json'));
              if (files.length === 0) {
                alert('Aucun fichier JSON trouvé dans ce dossier.');
                return;
              }
              try {
                const entries: Array<{ file: File; idx: number; z: number; dateStr: string; txCount: number; ca: number; raw: any }>
                  = [];
                let globalIdx = 1;
                for (const file of files) {
                  try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    const closures: any[] = Array.isArray(data?.closures) ? data.closures : [];
                    for (const c of closures) {
                      const z = Number(c?.zNumber) || 0;
                      const closedAt = c?.closedAt ? new Date(c.closedAt) : null;
                      const dateStr = closedAt ? `${closedAt.toLocaleDateString()} ${closedAt.toLocaleTimeString()}` : '—';
                      const txs = Array.isArray(c?.transactions) ? c.transactions : [];
                      const ca = txs.reduce((s: number, t: any) => s + (Number(t?.total) || 0), 0);
                      entries.push({ file, idx: globalIdx++, z, dateStr, txCount: txs.length, ca, raw: c });
                    }
                  } catch {}
                }
                if (entries.length === 0) {
                  alert('Aucune clôture Z trouvée dans ce dossier.');
                  return;
                }
                const lines = entries.map(e => `${e.idx}) ${e.file.name} · Z${e.z} · ${e.dateStr} · ${e.txCount} tickets · ${e.ca.toFixed(2)}€`);
                const pick = window.prompt(
                  'Sélectionnez le Z à importer (depuis dossier):\n' +
                  lines.join('\n') +
                  `\n\nEntrez l'index (1..${entries.length})`
                );
                const pickIdx = parseInt(pick || '', 10);
                if (!Number.isFinite(pickIdx) || pickIdx < 1 || pickIdx > entries.length) {
                  alert('Index invalide.');
                  return;
                }
                const selected = entries.find(e => e.idx === pickIdx)!;

                // Préparer numéro Z cible
                const currentClosures: any[] = JSON.parse(localStorage.getItem('klick_caisse_closures') || '[]');
                const used = new Set(currentClosures.map(c => Number(c?.zNumber) || 0));
                const maxZ = currentClosures.reduce((m, c) => Math.max(m, Number(c?.zNumber) || 0), 0);
                const defaultTarget = used.has(selected.z) ? (maxZ + 1) : (selected.z || (maxZ + 1));
                const targetInput = window.prompt(`Numéro Z cible pour l'import (laisser vide pour Z${defaultTarget})`);
                let targetZ: number = defaultTarget;
                if (targetInput && targetInput.trim().length > 0) {
                  const parsed = parseInt(targetInput.trim(), 10);
                  if (!Number.isFinite(parsed) || parsed <= 0) {
                    alert('Numéro Z invalide. Import annulé.');
                    return;
                  }
                  if (used.has(parsed)) {
                    alert(`Le Z${parsed} existe déjà. Choisissez un autre numéro. Import annulé.`);
                    return;
                  }
                  targetZ = parsed;
                }

                const closureToImport = { ...selected.raw, zNumber: targetZ };
                const merged = [...currentClosures, closureToImport].sort((a, b) => Number(a.zNumber) - Number(b.zNumber));
                localStorage.setItem('klick_caisse_closures', JSON.stringify(merged));
                const newCounter = Math.max(maxZ, Number(targetZ) || 0);
                localStorage.setItem('klick_caisse_z_counter', String(newCounter));

                // Fusionner transactionsByDay
                const txs = Array.isArray(closureToImport?.transactions) ? closureToImport.transactions : [];
                try {
                  const raw = localStorage.getItem('klick_caisse_transactions_by_day');
                  const map: Record<string, any[]> = raw ? JSON.parse(raw) : {};
                  for (const t of txs) {
                    const d = new Date(t?.timestamp);
                    const day = isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
                    if (!day) continue;
                    if (!Array.isArray(map[day])) map[day] = [];
                    map[day].push(t);
                  }
                  localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(map));
                } catch {}

                alert(`✅ Z importé depuis dossier: Z${targetZ} (tickets: ${txs.length}).`);
              } catch (e) {
                alert('Erreur lors de la lecture des fichiers du dossier.');
              }
            };
            input.click();
          } catch (e) {
            alert('Erreur: impossible d\'ouvrir le sélecteur de dossier.');
          }
        }}
      >
        📁 Importer Z depuis dossier
      </Button>

      {/* Modale Rapport Historique */}
      <HistoricalReportModal
        open={showHistoricalReport}
        onClose={() => setShowHistoricalReport(false)}
      />
    </Box>
  );
};

export default SettingsPanel;


