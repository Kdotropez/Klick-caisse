import React from 'react';
import { Box, Button } from '@mui/material';
 

interface SettingsPanelProps {
  width: number;
  height: number;
  getScaledFontSize: (baseSize: string) => string;
  importStatus: string;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportVariationsCSV?: (file: File) => void;
  onOpenCategoryManagement: () => void;
  onOpenSubcategoryManagement: () => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  selectedProductsForDeletionSize: number;
  areAllProductsSelected: boolean;
  onDeleteSelectedProducts: () => void;
  onToggleSelectAllProducts: () => void;
  // Nouvelles actions Backup
  onExportAll?: () => void;
  onImportAll?: (file: File) => void;
  onImportTxOnly?: (file: File) => void;
  
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  width,
  height,
  getScaledFontSize,
  importStatus,
  onImportCSV,
  onOpenCategoryManagement,
  onOpenSubcategoryManagement,
  onImportVariationsCSV,
  isEditMode,
  onToggleEditMode,
  selectedProductsForDeletionSize,
  areAllProductsSelected,
  onDeleteSelectedProducts,
  onToggleSelectAllProducts,
  onExportAll,
  onImportAll,
  onImportTxOnly,
  
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

  const handleSelectBackupFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file && onImportAll) onImportAll(file);
    };
    input.click();
  };

  const handleSelectVariationsCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file && onImportVariationsCSV) onImportVariationsCSV(file);
    };
    input.click();
  };

  const handleSelectTxOnlyFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file && onImportTxOnly) onImportTxOnly(file);
    };
    input.click();
  };

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
      <input
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        id="csv-import-settings"
        onChange={onImportCSV}
      />
      <label htmlFor="csv-import-settings" style={{ width: '100%', height: '100%', display: 'block' }}>
        <Button
          variant="contained"
          component="span"
          disabled={importStatus === 'importing'}
          sx={{
            width: '100%',
            height: '100%',
            fontSize: getScaledFontSize('0.5rem'),
            fontWeight: 'bold',
            backgroundColor: importStatus === 'importing' ? '#ccc' : '#ff5722',
            '&:hover': { backgroundColor: importStatus === 'importing' ? '#ccc' : '#e64a19' },
            boxSizing: 'border-box',
            overflow: 'hidden',
            textTransform: 'none',
            lineHeight: 1.0,
            padding: '1px',
          }}
        >
          {importStatus === 'importing' ? 'Import...' : 'Import CSV'}
        </Button>
      </label>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#3949ab',
          '&:hover': { backgroundColor: '#303f9f' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={handleSelectVariationsCSV}
      >
        Importer déclinaisons (CSV)
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#795548',
          '&:hover': { backgroundColor: '#5d4037' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={() => console.log('Bouton libre')}
      >
        Libre
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#607d8b',
          '&:hover': { backgroundColor: '#455a64' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={onExportAll}
      >
        Exporter tout (JSON)
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#ff4081',
          '&:hover': { backgroundColor: '#e91e63' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={handleSelectBackupFile}
      >
        Importer tout (JSON)
      </Button>

      <Button
        variant="contained"
        sx={{
          width: '100%',
          height: '100%',
          fontSize: getScaledFontSize('0.5rem'),
          fontWeight: 'bold',
          backgroundColor: '#2e7d32',
          '&:hover': { backgroundColor: '#1b5e20' },
          boxSizing: 'border-box',
          overflow: 'hidden',
          textTransform: 'none',
          lineHeight: 1.0,
          padding: '1px',
        }}
        onClick={handleSelectTxOnlyFile}
      >
        Importer tickets/clôtures (JSON)
      </Button>

      

      

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
        onClick={() => console.log('Vide 8')}
      >
        Vide 8
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
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {selectedProductsForDeletionSize > 0 && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onDeleteSelectedProducts}
              sx={{ backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' }, fontSize: '0.7rem', px: 1 }}
            >
              🗑️ Supprimer ({selectedProductsForDeletionSize})
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={onToggleSelectAllProducts} sx={{ fontSize: '0.7rem', px: 1 }}>
            {areAllProductsSelected ? '☐ Tout désélectionner' : '☑️ Tout sélectionner'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SettingsPanel;


