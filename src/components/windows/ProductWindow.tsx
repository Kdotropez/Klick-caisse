import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Chip,
  Grid,
  Pagination,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Remove,
  Search,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { Product, Category, CartItem, ProductVariation } from '../../types/Product';

interface ProductWindowProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  onProductClick: (product: Product) => void;
  onProductWithVariationClick: (product: Product, variation: ProductVariation) => void;
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  getCategoryColor: (categoryId: string) => string;
  isLayoutLocked: boolean;
}

const ProductWindow: React.FC<ProductWindowProps> = ({
  products,
  categories,
  cartItems,
  currentPage,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  onProductClick,
  onProductWithVariationClick,
  onUpdateQuantity,
  onRemoveItem,
  getCategoryColor,
  isLayoutLocked,
}) => {
  const PRODUCTS_PER_PAGE = 25;

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.ean13.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  // Obtenir la quantité d'un produit dans le panier
  const getCartQuantity = (productId: string, variationId: string | null = null) => {
    const item = cartItems.find(item => 
      item.product.id === productId && 
      (variationId ? item.selectedVariation?.id === variationId : !item.selectedVariation)
    );
    return item ? item.quantity : 0;
  };

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Produits ({filteredProducts.length})</Typography>
        <TextField
          size="small"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: 200 }}
        />
      </Box>

      {/* Filtres de catégories */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="Toutes"
          onClick={() => setSelectedCategory('all')}
          color={selectedCategory === 'all' ? 'primary' : 'default'}
          size="small"
        />
        {categories.map(category => (
          <Chip
            key={category.id}
            label={category.name}
            onClick={() => setSelectedCategory(category.name)}
            color={selectedCategory === category.name ? 'primary' : 'default'}
            size="small"
            sx={{
              backgroundColor: selectedCategory === category.name ? undefined : getCategoryColor(category.id),
              color: selectedCategory === category.name ? undefined : 'white',
            }}
          />
        ))}
      </Box>

      {/* Grille de produits */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Grid container spacing={1}>
          {currentProducts.map((product) => {
            const cartQuantity = getCartQuantity(product.id);
            const hasVariations = product.variations && product.variations.length > 0;

            return (
              <Grid item xs={2.4} key={product.id}>
                <Paper
                  sx={{
                    p: 1,
                    height: 120,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 3,
                    },
                    border: cartQuantity > 0 ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  }}
                  onClick={() => {
                    if (!hasVariations) {
                      onProductClick(product);
                    }
                  }}
                >
                  <Typography variant="caption" noWrap sx={{ fontWeight: 'bold' }}>
                    {product.name}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {product.reference}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {product.ean13}
                  </Typography>
                  
                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {product.finalPrice.toFixed(2)}€
                    </Typography>
                    
                    {cartQuantity > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(product.id, null, cartQuantity - 1);
                          }}
                          disabled={isLayoutLocked}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" sx={{ minWidth: 20, textAlign: 'center' }}>
                          {cartQuantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateQuantity(product.id, null, cartQuantity + 1);
                          }}
                          disabled={isLayoutLocked}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            size="small"
          />
        </Box>
      )}
    </Paper>
  );
};

export default ProductWindow;
