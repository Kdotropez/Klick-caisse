import React from 'react';
import { Box, Button, Typography, Paper, Chip } from '@mui/material';
import { Product } from '../../types/Product';

interface ProductsWindowProps {
  products: Product[];
  currentPage: number;
  totalPages: number;
  onProductClick: (product: Product) => void;
  onPageChange: (page: number) => void;
}

const ProductsWindow: React.FC<ProductsWindowProps> = ({
  products,
  currentPage,
  totalPages,
  onProductClick,
  onPageChange,
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation pagination */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Page {currentPage} sur {totalPages} - {products.length} produits
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <Chip label={`${currentPage}/${totalPages}`} size="small" />
          <Button
            size="small"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </Box>
      </Box>
      
      {/* Grille produits */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'grid', 
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 1,
        p: 1,
        overflow: 'auto'
      }}>
        {products.map((product) => (
          <Paper
            key={product.id}
            sx={{
              p: 1,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
              '&:active': { transform: 'scale(0.98)' }
            }}
            onClick={() => onProductClick(product)}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {product.name}
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
              {product.finalPrice.toFixed(2)} €
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
              <Chip label={`${product.salesCount || 0}`} size="small" />
              {product.variations.length > 0 && (
                <Chip label={`${product.variations.length} var.`} size="small" />
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default ProductsWindow; 