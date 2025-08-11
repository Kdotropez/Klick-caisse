import React, { useMemo } from 'react';
import { Box, Button, Chip, TextField } from '@mui/material';
import { Category, Product } from '../../types/Product';

interface CategoriesPanelFullProps {
  categories: Category[];
  products: Product[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (name: string | null) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  categorySearchTerm: string;
  setCategorySearchTerm: (v: string) => void;
  subcategorySearchTerm: string;
  setSubcategorySearchTerm: (v: string) => void;
  productSortMode: 'sales' | 'name';
  setProductSortMode: (mode: 'sales' | 'name') => void;
  pendingQtyInput: string;
  setPendingQtyInput: (v: string) => void;
  getCategoryColor: (categoryId: string) => string;
  onResetFilters: () => void;
}

const CategoriesPanelFull: React.FC<CategoriesPanelFullProps> = ({
  categories,
  products,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  searchTerm,
  setSearchTerm,
  categorySearchTerm,
  setCategorySearchTerm,
  subcategorySearchTerm,
  setSubcategorySearchTerm,
  productSortMode,
  setProductSortMode,
  pendingQtyInput,
  setPendingQtyInput,
  getCategoryColor,
  onResetFilters,
}) => {
  const subcategories = useMemo(() => {
    const set = new Set<string>();
    if (selectedCategory) {
      const selected = categories.find(c => c.id === selectedCategory);
      const selectedName = selected ? selected.name : null;
      products.forEach(p => {
        if (!selectedName || p.category !== selectedName) return;
        if (Array.isArray(p.associatedCategories)) {
          p.associatedCategories.forEach(sc => { const n = (sc || '').trim(); if (n) set.add(n); });
        }
      });
    } else {
      products.forEach(p => {
        if (Array.isArray(p.associatedCategories)) {
          p.associatedCategories.forEach(sc => { const n = (sc || '').trim(); if (n) set.add(n); });
        }
      });
    }
    return Array.from(set);
  }, [products, categories, selectedCategory]);

  const digits = ['1','2','3','4','5','6','7','8','9','0'];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Ligne 1: Catégories */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'flex-start', overflowX: 'auto', overflowY: 'hidden', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Button
            variant={selectedCategory === null ? 'contained' : 'outlined'}
            onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0 }}
          >
            Toutes
          </Button>
          {categories
            .filter(cat => !categorySearchTerm || cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase()))
            .map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'contained' : 'outlined'}
                onClick={() => { setSelectedCategory(cat.id); setSelectedSubcategory(null); }}
                sx={{
                  textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0,
                  backgroundColor: selectedCategory === cat.id ? getCategoryColor(cat.id) : 'transparent',
                  color: selectedCategory === cat.id ? 'white' : getCategoryColor(cat.id),
                  borderColor: getCategoryColor(cat.id),
                  fontWeight: 'bold',
                }}
              >
                {cat.name}
              </Button>
            ))}
        </Box>
      </Box>

      {/* Ligne 2: Sous-catégories */}
      <Box sx={{ p: 1, borderTop: '1px solid #e0e0e0', backgroundColor: '#f9f9f9' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, alignItems: 'flex-start', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Button
            variant={selectedSubcategory === null ? 'contained' : 'outlined'}
            onClick={() => setSelectedSubcategory(null)}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0 }}
          >
            Toutes
          </Button>
          {subcategories
            .filter(sc => !subcategorySearchTerm || sc.toLowerCase().includes(subcategorySearchTerm.toLowerCase()))
            .map(sc => (
              <Button
                key={sc}
                variant={selectedSubcategory === sc ? 'contained' : 'outlined'}
                onClick={() => setSelectedSubcategory(sc)}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0 }}
              >
                {sc}
              </Button>
            ))}
        </Box>
      </Box>

      {/* Ligne 3: Recherches */}
      <Box sx={{ p: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        <TextField size="small" placeholder="Article" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <TextField size="small" placeholder="Catégorie" value={categorySearchTerm} onChange={(e) => setCategorySearchTerm(e.target.value)} />
        <TextField size="small" placeholder="Sous-catégorie" value={subcategorySearchTerm} onChange={(e) => setSubcategorySearchTerm(e.target.value)} />
      </Box>

      {/* Ligne 4: Tri + Reset + pavé numérique */}
      <Box sx={{ p: 1, pt: 0, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Button size="small" variant={productSortMode === 'sales' ? 'contained' : 'outlined'} onClick={() => setProductSortMode('sales')}>📊 Tri ventes</Button>
        <Button size="small" variant={productSortMode === 'name' ? 'contained' : 'outlined'} onClick={() => setProductSortMode('name')}>🔤 Tri nom</Button>
        <Button size="small" variant="outlined" onClick={onResetFilters}>🔄 Reset</Button>
        <Chip label={pendingQtyInput || '×1'} size="small" />
        {digits.map(d => (
          <Button key={d} size="small" variant="outlined" onClick={() => setPendingQtyInput((pendingQtyInput + d).replace(/^0+(?=\d)/, ''))}>{d}</Button>
        ))}
        <Button size="small" color="error" variant="outlined" onClick={() => setPendingQtyInput('')}>C</Button>
      </Box>
    </Box>
  );
};

export default CategoriesPanelFull;



