import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

const SubcategoriesPanel: React.FC = () => {
  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ff5722',
        border: '3px solid #d84315',
        borderRadius: '8px',
        p: 1,
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}
    >
      <Typography
        variant="h6"
        sx={{ textAlign: 'center', fontWeight: 'bold', color: '#e65100', mb: 1, fontSize: '0.9rem' }}
      >
        Sous-Catégories
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Chip label="Sous-cat 1" sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} />
        <Chip label="Sous-cat 2" sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} />
        <Chip label="Sous-cat 3" sx={{ backgroundColor: '#ff9800', color: 'white', fontSize: '0.7rem' }} />
      </Box>
    </Box>
  );
};

export default SubcategoriesPanel;



