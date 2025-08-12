import React from 'react';
import { Box, TextField, Button } from '@mui/material';

interface ProductFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categorySearchTerm: string;
  setCategorySearchTerm: (term: string) => void;
  subcategorySearchTerm: string;
  setSubcategorySearchTerm: (term: string) => void;
  productSortMode: 'sales' | 'name';
  setProductSortMode: (mode: 'sales' | 'name') => void;
  isEditMode: boolean;
  selectedProductsForDeletion: Set<string>;
  onReset: () => void;
  onDeleteSelected: () => void;
  onToggleEditMode: () => void;
  onCreateNewProduct: () => void;
  onOpenSubcategoryManagement: () => void;
  categoriesScrollRef: React.RefObject<HTMLDivElement>;
  subcategoriesScrollRef: React.RefObject<HTMLDivElement>;
}

const ProductFilters: React.FC<ProductFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  categorySearchTerm,
  setCategorySearchTerm,
  subcategorySearchTerm,
  setSubcategorySearchTerm,
  productSortMode,
  setProductSortMode,
  isEditMode,
  selectedProductsForDeletion,
  onReset,
  onDeleteSelected,
  onToggleEditMode,
  onCreateNewProduct,
  onOpenSubcategoryManagement,
  categoriesScrollRef,
  subcategoriesScrollRef,
}) => {
  return (
    <>
      {/* Ligne 2: Recherches */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', borderBottom: '1px solid #eee' }}>
        <TextField
          size="small"
          placeholder="Rechercher article..."
          variant="outlined"
          sx={{ flex: 1 }}
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
        />
        <TextField
          size="small"
          placeholder="Rechercher catégorie..."
          variant="outlined"
          sx={{ width: 220 }}
          value={categorySearchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategorySearchTerm(e.target.value)}
        />
        <TextField
          size="small"
          placeholder="Rechercher sous-catégorie..."
          variant="outlined"
          sx={{ width: 240 }}
          value={subcategorySearchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubcategorySearchTerm(e.target.value)}
        />
      </Box>

      {/* Ligne 3+4 combinées: Supprimer (si sélection) + Tri / Reset / Modifier article / Nouvel article / Gérer sous-catégories */}
      <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee', flexWrap: 'nowrap' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
          {isEditMode && selectedProductsForDeletion.size > 0 && (
            <Button
              variant="contained"
              color="error"
              size="small"
              onClick={onDeleteSelected}
            >
              Supprimer ({selectedProductsForDeletion.size})
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Button
            variant={productSortMode === 'sales' ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setProductSortMode(productSortMode === 'sales' ? 'name' : 'sales')}
            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
          >
            {productSortMode === 'sales' ? 'Alphabétique' : 'Plus vendus'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onReset}
          >
            Reset
          </Button>
          <Button
            variant={isEditMode ? 'outlined' : 'contained'}
            size="small"
            onClick={onToggleEditMode}
          >
            {isEditMode ? 'Mode vente' : 'Modifier article'}
          </Button>
          <Button variant="contained" size="small" onClick={onCreateNewProduct}>➕ Nouvel article</Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onOpenSubcategoryManagement}
          >
            Gérer sous-catégories
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default ProductFilters;
