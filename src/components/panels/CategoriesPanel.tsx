import React from 'react';
import { Box, Button, TextField, Chip } from '@mui/material';
import { Category } from '../../types/Product';

interface CategoriesPanelProps {
  categories: Category[];
  selectedCategory: string | null;
  categorySearchTerm: string;
  subcategorySearchTerm: string;
  selectedSubcategory: string | null;
  pendingQtyInput: string;
  onSelectCategory: (id: string | null) => void;
  onSelectSubcategory: (id: string | null) => void;
  onChangeCategorySearch: (value: string) => void;
  onChangeSubcategorySearch: (value: string) => void;
  onResetFilters: () => void;
  onPressQtyDigit: (digit: string) => void;
  onClearQty: () => void;
}

const CategoriesPanel: React.FC<CategoriesPanelProps> = ({
  categories,
  selectedCategory,
  categorySearchTerm,
  subcategorySearchTerm,
  selectedSubcategory,
  pendingQtyInput,
  onSelectCategory,
  onSelectSubcategory,
  onChangeCategorySearch,
  onChangeSubcategorySearch,
  onResetFilters,
  onPressQtyDigit,
  onClearQty,
}) => {
  const digits = ['1','2','3','4','5','6','7','8','9','0'];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Ligne 1: Catégories */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'flex-start', overflowX: 'auto', overflowY: 'hidden', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Button
            variant={selectedCategory === null ? 'contained' : 'outlined'}
            onClick={() => { onSelectCategory(null); onSelectSubcategory(null); }}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0 }}
          >
            Toutes
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'contained' : 'outlined'}
              onClick={() => { onSelectCategory(category.id); onSelectSubcategory(null); }}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0 }}
            >
              {category.name}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Ligne 2: Sous-catégories (placeholder minimal - les sous-catégories réelles sont gérées dans WindowManager)*/}
      <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={selectedSubcategory ? `Sous-catégorie: ${selectedSubcategory}` : 'Toutes sous-catégories'} size="small" />
        </Box>
      </Box>

      {/* Ligne 3: Recherches */}
      <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        <TextField size="small" placeholder="Article" value={''} onChange={() => {}} disabled />
        <TextField size="small" placeholder="Catégorie" value={categorySearchTerm} onChange={(e) => onChangeCategorySearch(e.target.value)} />
        <TextField size="small" placeholder="Sous-catégorie" value={subcategorySearchTerm} onChange={(e) => onChangeSubcategorySearch(e.target.value)} />
      </Box>

      {/* Ligne 4: Boutons tri/reset + pavé numérique */}
      <Box sx={{ p: 1, pt: 0, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" onClick={onResetFilters}>Reset</Button>
        <Chip label={pendingQtyInput || '×1'} size="small" />
        {digits.map(d => (
          <Button key={d} size="small" variant="outlined" onClick={() => onPressQtyDigit(d)}>{d}</Button>
        ))}
        <Button size="small" color="error" variant="outlined" onClick={onClearQty}>C</Button>
      </Box>
    </Box>
  );
};

export default CategoriesPanel;



