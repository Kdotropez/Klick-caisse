import React, { useState } from 'react';
import { Box, Button } from '@mui/material';
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
                  localStorage.setItem('klick_caisse_closures', JSON.stringify(data.closures));
                  console.log('✅ Clôtures restaurées:', data.closures.length);
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
                
                const message = `✅ Restauration terminée avec succès !\n\n` +
                               `📦 ${data.products?.length || 0} produits\n` +
                               `📂 ${data.categories?.length || 0} catégories\n` +
                               `🔒 ${data.closures?.length || 0} clôtures\n` +
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
                  
                  // Afficher la séquence complète
                  const finalZNumbers = allClosures.map((c: any) => c.zNumber).sort((a: number, b: number) => a - b);
                  console.log(`📈 Séquence Z complète : ${finalZNumbers.join(' → ')}`);
                  
                  const message = `🎉 Récupération réussie !\n\n` +
                                 `📊 ${recoveredClosures.length} clôtures récupérées\n` +
                                 `📋 Total : ${allClosures.length} clôtures\n` +
                                 `📈 Séquence : ${finalZNumbers.join(' → ')}\n\n` +
                                 `Rechargez la page pour voir les changements.`;
                  
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
        onClick={() => console.log('Vide 7')}
      >
        Vide 7
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#3f51b5',
          '&:hover': { backgroundColor: '#303f9f' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => console.log('Vide 8')}
      >
        Vide 8
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


