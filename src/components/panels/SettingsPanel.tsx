import React from 'react';
import { Box, Button } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { resetToEmbeddedBase } from '../../data/productionData';
import { StorageService } from '../../services/StorageService';

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
        onClick={() => console.log('Vide 3')}
      >
        Vide 3
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#9e9e9e',
          '&:hover': { backgroundColor: '#757575' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => console.log('Vide 4')}
      >
        Vide 4
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
        onClick={() => console.log('Vide 5')}
      >
        Vide 5
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
        onClick={() => console.log('Vide 6')}
      >
        Vide 6
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
    </Box>
  );
};

export default SettingsPanel;


