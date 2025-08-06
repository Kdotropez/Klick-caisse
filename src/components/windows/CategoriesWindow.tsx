import React from 'react';
import { Box, Button } from '@mui/material';
import { Category } from '../../types/Product';

interface CategoriesWindowProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

const CategoriesWindow: React.FC<CategoriesWindowProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', 
        p: 1,
        display: 'flex',
        flexDirection: 'row',
        gap: 1,
        flexWrap: 'nowrap',
        alignItems: 'flex-start'
      }}>
        <Button
          variant={selectedCategory === null ? "contained" : "outlined"}
          onClick={() => onCategorySelect(null)}
          sx={{ 
            textTransform: 'none',
            whiteSpace: 'nowrap',
            minWidth: 'fit-content'
          }}
        >
          Toutes
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "contained" : "outlined"}
            onClick={() => onCategorySelect(category.id)}
            sx={{ 
              textTransform: 'none',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content'
            }}
          >
            {category.name}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default CategoriesWindow; 