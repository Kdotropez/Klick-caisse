import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import { Category } from '../types/Product';

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
}) => {
  const handleChange = (event: React.SyntheticEvent, newValue: string | null) => {
    onCategoryChange(newValue);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={selectedCategory || 'all'}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTab-root': {
            minWidth: 120,
            textTransform: 'none',
            fontWeight: 'bold',
            fontSize: '0.9rem',
          },
          '& .Mui-selected': {
            color: 'primary.main',
          },
        }}
      >
        <Tab
          label="Toutes"
          value="all"
          sx={{
            backgroundColor: selectedCategory === null ? 'primary.main' : 'transparent',
            color: selectedCategory === null ? 'white' : 'inherit',
            '&:hover': {
              backgroundColor: selectedCategory === null ? 'primary.dark' : 'action.hover',
            },
          }}
        />
        {categories.map((category) => (
          <Tab
            key={category.id}
            label={category.name}
            value={category.id}
            sx={{
              backgroundColor: selectedCategory === category.id ? category.color : 'transparent',
              color: selectedCategory === category.id ? 'white' : 'inherit',
              '&:hover': {
                backgroundColor: selectedCategory === category.id ? category.color + 'dd' : category.color + '20',
              },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};

export default CategoryTabs; 