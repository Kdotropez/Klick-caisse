import React from 'react';
import { Box, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

interface ImportPanelProps {
  productsCount: number;
  categoriesCount: number;
  importStatus?: "error" | "success" | "idle" | "importing";
  importMessage?: string;
  onImportCSV?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRepairEANArticles?: (file: File) => Promise<void>;
  onRepairEANVariations?: (file: File) => Promise<void>;
  onRepairEANArticlesFromGitHub?: () => Promise<void>;
}

const ImportPanel: React.FC<ImportPanelProps> = ({
  productsCount,
  categoriesCount,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        Base de Données
      </Typography>
      <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          p: 1, 
          backgroundColor: '#e8f5e8', 
          borderRadius: 1,
          border: '1px solid #4caf50'
        }}>
          <CheckCircle sx={{ color: '#4caf50' }} />
          <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
            Base intégrée automatiquement
          </Typography>
        </Box>
        
        <Typography variant="body2" align="center" sx={{ mb: 1 }}>
          {productsCount} produits chargés
        </Typography>
        <Typography variant="body2" align="center" sx={{ mb: 2 }}>
          {categoriesCount} catégories
        </Typography>
        
        <Box sx={{ 
          p: 1, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 1,
          border: '1px solid #ddd'
        }}>
          <Typography variant="caption" sx={{ color: '#666' }}>
            ✅ Base de données complète intégrée au démarrage
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ImportPanel;


