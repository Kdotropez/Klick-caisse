import React, { useRef } from 'react';
import { Box, Button } from '@mui/material';
import { Category } from '../../types/Product';
import { StorageService } from '../../services/StorageService';
import ProductFilters from './ProductFilters';

interface CategoriesPanelProps {
  categories: Category[];
  products: any[];
  selectedCategory: string | null;
  setSelectedCategory: (categoryId: string | null) => void;
  selectedSubcategory: string | null;
  setSelectedSubcategory: (subcategory: string | null) => void;
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
  normalizeDecimals: (s: string) => string;
}

const CategoriesPanel: React.FC<CategoriesPanelProps> = ({
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
  isEditMode,
  selectedProductsForDeletion,
  onReset,
  onDeleteSelected,
  onToggleEditMode,
  onCreateNewProduct,
  onOpenSubcategoryManagement,
  normalizeDecimals,
}) => {
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const subcategoriesScrollRef = useRef<HTMLDivElement>(null);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Ligne 1: Boutons des catégories */}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant={selectedCategory === null ? 'contained' : 'outlined'}
            onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
            sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.75rem', py: 0.25, px: 1 }}
          >
            Toutes
          </Button>
          <Box ref={categoriesScrollRef} sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', overflowX: 'auto', overflowY: 'hidden', '&::-webkit-scrollbar': { display: 'none' } }}>
            {categories
              .filter(c => !categorySearchTerm || StorageService.normalizeLabel(c.name).includes(StorageService.normalizeLabel(categorySearchTerm)))
              .map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'contained' : 'outlined'}
                onClick={() => { setSelectedCategory(category.id); setSelectedSubcategory(null); }}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.75rem', py: 0.25, px: 1 }}
              >
                {category.name}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Ligne 1bis: Sous-catégories (dynamiques) */}
      <Box sx={{ px: 1, py: 0.5, borderBottom: '1px solid #eee', backgroundColor: '#fafafa', overflow: 'hidden' }}>
        {(() => {
          // Construire la liste en dédupliquant sur une clé normalisée (insensible accents/casse)
          const selectedCatName = selectedCategory ? (categories.find(c => c.id === selectedCategory)?.name || '') : '';
          const catKey = (s: string) => StorageService.normalizeLabel(s);
          const normSelected = catKey(selectedCatName);
          const normToDisplay = new Map<string, string>();
          
          for (const p of products) {
            if (selectedCatName) {
              const pc = catKey(p.category || '');
              if (pc !== normSelected) continue;
            }
            if (Array.isArray(p.associatedCategories)) {
              const cleaned = p.associatedCategories
                .map((sc: any) => String(sc || '').trim())
                .filter((sc: string) => sc && sc !== '\\u0000')
                .filter((sc: string) => {
                  const norm = StorageService.normalizeLabel(sc);
                  const alnum = norm.replace(/[^a-z0-9]/g, '');
                  return alnum.length >= 2;
                });
              for (const n of cleaned) {
                const norm = StorageService.normalizeLabel(n);
                const key = normalizeDecimals(norm);
                if (!normToDisplay.has(key)) normToDisplay.set(key, n);
              }
            }
          }
          
          let list = Array.from(normToDisplay.values()).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
          
          // Appliquer l'ordre personnalisé si défini pour la catégorie sélectionnée
          if (selectedCategory) {
            const cat = categories.find(c => c.id === selectedCategory);
            const order = (cat && (cat as any).subcategoryOrder) as string[] | undefined;
            if (order && Array.isArray(order) && order.length > 0) {
              const norm = (s: string) => StorageService.normalizeLabel(s);
              list.sort((a, b) => {
                const ia = order.findIndex(o => norm(o) === norm(a));
                const ib = order.findIndex(o => norm(o) === norm(b));
                const aa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
                const bb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
                if (aa !== bb) return aa - bb;
                return a.localeCompare(b, 'fr', { sensitivity: 'base' });
              });
            }
          }
          
          // En "Toute catégorie", garder l'affichage complet des sous-catégories dans la barre
          if (list.length === 0 && !selectedCategory) {
            try {
              const registry = StorageService.loadSubcategories();
              list = Array.isArray(registry) ? registry.slice(0, 200) : [];
            } catch {
              list = [];
            }
          }
          
          const normSelectedSub = StorageService.normalizeLabel(String(selectedSubcategory || ''));
          
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Button
                size="small"
                variant={selectedSubcategory === null ? 'contained' : 'outlined'}
                onClick={() => setSelectedSubcategory(null)}
                sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.72rem', py: 0.2, px: 0.8 }}
              >
                Toutes
              </Button>
              <Box ref={subcategoriesScrollRef} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                {list
                  .filter(sc => !subcategorySearchTerm || StorageService.normalizeLabel(sc).includes(StorageService.normalizeLabel(subcategorySearchTerm)))
                  .map(sc => {
                  const norm = StorageService.normalizeLabel(sc);
                  const isActive = norm === normSelectedSub;
                  return (
                    <Button
                      key={sc}
                      size="small"
                      variant={isActive ? 'contained' : 'outlined'}
                      onClick={() => setSelectedSubcategory(sc)}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.72rem', py: 0.2, px: 0.8 }}
                    >
                      {sc}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          );
        })()}
      </Box>

      {/* Filtres et contrôles */}
      <ProductFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categorySearchTerm={categorySearchTerm}
        setCategorySearchTerm={setCategorySearchTerm}
        subcategorySearchTerm={subcategorySearchTerm}
        setSubcategorySearchTerm={setSubcategorySearchTerm}
        productSortMode={productSortMode}
        setProductSortMode={setProductSortMode}
        isEditMode={isEditMode}
        selectedProductsForDeletion={selectedProductsForDeletion}
        onReset={onReset}
        onDeleteSelected={onDeleteSelected}
        onToggleEditMode={onToggleEditMode}
        onCreateNewProduct={onCreateNewProduct}
        onOpenSubcategoryManagement={onOpenSubcategoryManagement}
        categoriesScrollRef={categoriesScrollRef}
        subcategoriesScrollRef={subcategoriesScrollRef}
      />
    </Box>
  );
};

export default CategoriesPanel;



