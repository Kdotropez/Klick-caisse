import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ImportExport } from '@mui/icons-material';

interface ImportPanelProps {
  productsCount: number;
  categoriesCount: number;
  importStatus: 'idle' | 'importing' | 'success' | 'error';
  importMessage: string;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRepairEANArticles: (file: File) => void;
  onRepairEANVariations: (file: File) => void;
  onRepairEANArticlesFromGitHub: () => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({
  productsCount,
  categoriesCount,
  importStatus,
  importMessage,
  onImportCSV,
  onRepairEANArticles,
  onRepairEANVariations,
  onRepairEANArticlesFromGitHub,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        Gestion Données
      </Typography>
      <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="body2" align="center" sx={{ mb: 1 }}>
          {productsCount} produits chargés
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 2 }}>
          {categoriesCount} catégories
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <input type="file" accept=".csv" style={{ display: 'none' }} id="csv-import-input" onChange={onImportCSV} />
          <label htmlFor="csv-import-input">
            <Button
              variant="outlined"
              size="small"
              startIcon={<ImportExport />}
              component="span"
              disabled={importStatus === 'importing'}
              sx={{ width: '100%', backgroundColor: importStatus === 'importing' ? '#f5f5f5' : 'transparent' }}
            >
              {importStatus === 'importing' ? 'Import en cours...' : 'Importer CSV'}
            </Button>
          </label>
          <Button
            variant="outlined"
            size="small"
            onClick={onRepairEANArticlesFromGitHub}
            sx={{ width: '100%' }}
          >
            Mettre à jour EAN (Articles) depuis GitHub
          </Button>
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            id="repair-ean-articles-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onRepairEANArticles(f);
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <label htmlFor="repair-ean-articles-input">
            <Button variant="outlined" size="small" component="span" sx={{ width: '100%' }}>
              Réparer EAN (Articles)
            </Button>
          </label>
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            id="repair-ean-variations-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onRepairEANVariations(f);
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <label htmlFor="repair-ean-variations-input">
            <Button variant="outlined" size="small" component="span" sx={{ width: '100%' }}>
              Réparer EAN (Déclinaisons)
            </Button>
          </label>
          {importStatus !== 'idle' && (
            <Typography
              variant="caption"
              sx={{
                textAlign: 'center',
                color: importStatus === 'success' ? 'success.main' : importStatus === 'error' ? 'error.main' : 'info.main',
                fontWeight: 'bold',
              }}
            >
              {importMessage}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            alert("Fonctionnalité d'export à implémenter");
          }}
        >
          Exporter Données
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            // eslint-disable-next-line no-alert
            const ok = window.confirm('Réinitialiser aux données par défaut ?');
            if (ok) {
              // TODO: reset
            }
          }}
        >
          Réinitialiser
        </Button>
      </Box>
    </Box>
  );
};

export default ImportPanel;


