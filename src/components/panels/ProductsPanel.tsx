import React, { memo, useMemo } from 'react';
import { Box, Button, Chip, Paper, Typography, IconButton } from '@mui/material';
import { Product } from '../../types';
import { NavigateBefore, NavigateNext, Edit as EditIcon, DragIndicator as DragIndicatorIcon } from '@mui/icons-material';
import { formatEuro } from '../../utils/currency';
import type { ProductGridLayout } from '../../utils/productGridLayout';

type ProductCardProps = {
  product: Product;
  cardWidth: number;
  cardHeight: number;
  cardScaleFactor: number;
  categoryColor: string;
  isEditMode: boolean;
  selectedForDeletion: boolean;
  isDragOver: boolean;
  dailyQty: number;
  onToggleDelete: () => void;
  onProductClick: () => void;
  onEditProduct: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
};

const ProductCard = memo<ProductCardProps>(function ProductCard({
  product,
  cardWidth,
  cardHeight,
  cardScaleFactor,
  categoryColor,
  isEditMode,
  selectedForDeletion,
  isDragOver,
  dailyQty,
  onToggleDelete,
  onProductClick,
  onEditProduct,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) {
  const paperSx = useMemo(() => {
    const sx: any = {
      width: `${cardWidth}px`,
      height: `${cardHeight}px`,
      p: '2px',
      cursor: isEditMode ? 'pointer' : 'grab',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      minHeight: 0,
      background: `linear-gradient(135deg, ${categoryColor}60 0%, ${categoryColor}30 30%, ${categoryColor}10 70%, white 100%)`,
      border: `1px solid ${categoryColor}`,
      borderRadius: `12px`,
      boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
      color: '#2c3e50',
      fontWeight: '600',
      boxSizing: 'border-box',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: `0 3px 6px rgba(0,0,0,0.15)`,
        background: `linear-gradient(135deg, ${categoryColor}50 0%, ${categoryColor}40 25%, ${categoryColor}20 65%, white 100%)`,
        border: `1px solid ${categoryColor}`,
        cursor: isEditMode ? 'pointer' : 'grab',
      },
      '&:active': {
        transform: 'translateY(0px) scale(0.98)',
        boxShadow: `0 ${2 * cardScaleFactor}px ${6 * cardScaleFactor}px rgba(0,0,0,0.25), 0 ${1 * cardScaleFactor}px ${2 * cardScaleFactor}px ${categoryColor}30`,
        background: `linear-gradient(135deg, ${categoryColor}40 0%, ${categoryColor}30 40%, ${categoryColor}10 80%, white 100%)`,
        cursor: isEditMode ? 'pointer' : 'grabbing',
      },
    };

    if (isEditMode && selectedForDeletion) {
      sx.border = '3px solid #f44336';
      sx.backgroundColor = '#ffebee';
      sx.boxShadow = `0 ${2 * cardScaleFactor}px ${6 * cardScaleFactor}px rgba(244, 67, 54, 0.3)`;
    }

    if (isDragOver) {
      sx.transform = 'scale(1.05)';
      sx.boxShadow = `0 ${8 * cardScaleFactor}px ${25 * cardScaleFactor}px rgba(0,0,0,0.3), 0 ${3 * cardScaleFactor}px ${8 * cardScaleFactor}px ${categoryColor}50`;
      sx.border = `${3 * cardScaleFactor}px solid ${categoryColor}`;
      sx.background = `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 30%, ${categoryColor}20 70%, white 100%)`;
    }

    return sx;
  }, [cardWidth, cardHeight, isEditMode, selectedForDeletion, isDragOver, cardScaleFactor, categoryColor]);

  return (
    <Paper
      draggable={!isEditMode}
      sx={paperSx}
      onDragStart={(e) => { if (!isEditMode) onDragStart(e); }}
      onClick={() => {
        if (isEditMode) {
          onToggleDelete();
          return;
        }
        onProductClick();
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={(e) => { if (!isEditMode) onDragEnd(e); }}
    >
      <Box sx={{ position: 'relative', flexGrow: 1 }}>
        {isEditMode && (
          <Box
            sx={{
              position: 'absolute',
              top: -6,
              left: -6,
              width: 16,
              height: 16,
              backgroundColor: selectedForDeletion ? '#f44336' : '#fff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: selectedForDeletion ? 'white' : '#ccc',
              fontSize: '10px',
              fontWeight: 'bold',
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              border: '1px solid #ccc',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDelete();
            }}
          >
            {selectedForDeletion ? '✓' : ''}
          </Box>
        )}

        {isEditMode && (
          <Box sx={{ position: 'absolute', top: -6, right: -4, display: 'flex', gap: 0.5, zIndex: 11 }}>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onEditProduct(); }}
              sx={{ width: 22, height: 22, p: 0, bgcolor: 'white', border: '1px solid #ddd', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              draggable
              onDragStart={(e) => onDragStart(e)}
              onDragEnd={onDragEnd}
              sx={{ width: 22, height: 22, p: 0, cursor: 'grab', bgcolor: 'white', border: '1px solid #ddd', '&:hover': { bgcolor: '#f5f5f5' } }}
              title="Glisser pour réordonner"
            >
              <DragIndicatorIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        )}

        <Typography
          variant="body2"
          sx={{
            fontWeight: '600',
            fontSize: `${Math.max(0.75, 0.85 * cardScaleFactor)}rem`,
            lineHeight: 1.1,
            flexGrow: 1,
            color: '#2c3e50',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {product.name}
        </Typography>
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 'bold',
          fontSize: `${Math.max(1, 1.1 * cardScaleFactor)}rem`,
          textAlign: 'center',
          color: categoryColor,
          letterSpacing: `${0.5 * cardScaleFactor}px`,
        }}
      >
        {formatEuro(product.finalPrice)}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 * cardScaleFactor, gap: 0.25 * cardScaleFactor }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: `${Math.max(0.85, 0.95 * cardScaleFactor)}rem`,
            color: '#1a237e',
            fontWeight: '700',
            alignSelf: 'flex-end'
          }}
        >
          {dailyQty}
        </Typography>
        {product.variations.length > 0 && (
          <Chip
            label={`${product.variations.length} var.`}
            size="small"
            sx={{
              fontSize: `${Math.max(0.6, 0.7 * cardScaleFactor)}rem`,
              height: `${Math.max(20, 22 * cardScaleFactor)}px`,
              backgroundColor: '#95a5a6',
              color: 'white',
              fontWeight: '600',
              boxShadow: `0 ${1 * cardScaleFactor}px ${3 * cardScaleFactor}px rgba(0,0,0,0.2)`,
            }}
          />
        )}
      </Box>
    </Paper>
  );
}, (prev, next) => {
  // Ignore les callbacks (nouveaux à chaque rendu), on se base sur les valeurs visibles.
  return (
    prev.product === next.product &&
    prev.cardWidth === next.cardWidth &&
    prev.cardHeight === next.cardHeight &&
    prev.cardScaleFactor === next.cardScaleFactor &&
    prev.categoryColor === next.categoryColor &&
    prev.isEditMode === next.isEditMode &&
    prev.selectedForDeletion === next.selectedForDeletion &&
    prev.isDragOver === next.isDragOver &&
    prev.dailyQty === next.dailyQty
  );
});

interface ProductsPanelProps {
  gridLayout: ProductGridLayout;
  width: number;
  height: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  currentProducts: Product[];
  getCategoryColor: (categoryId: string) => string;
  dailyQtyByProduct: Record<string, number>;
  isEditMode: boolean;
  selectedProductsForDeletion: Set<string>;
  setSelectedProductsForDeletion: (next: Set<string>) => void;
  dragOverProduct: Product | null;
  onDragStart: (e: React.DragEvent, product: Product) => void;
  onDragOver: (e: React.DragEvent, product: Product) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, product: Product) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onProductClick: (product: Product) => void;
  onEditProduct: (product: Product) => void;
}

const ProductsPanel: React.FC<ProductsPanelProps> = ({
  gridLayout,
  width,
  height,
  currentPage,
  totalPages,
  setCurrentPage,
  currentProducts,
  getCategoryColor,
  dailyQtyByProduct,
  isEditMode,
  selectedProductsForDeletion,
  setSelectedProductsForDeletion,
  dragOverProduct,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onProductClick,
  onEditProduct,
}) => {
  const headerHeight = 82;
  const { cols, rows, cardWidth, cardHeight, prevCellIndex, nextCellIndex, totalCells } = gridLayout;
  const totalHeightToSubtract = 2 * rows + 1;
  const cellIndices = useMemo(() => Array.from({ length: totalCells }, (_, index) => index), [totalCells]);
  const cardScaleFactor = useMemo(() => Math.min(cardWidth / 150, cardHeight / 120), [cardWidth, cardHeight]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box
        sx={{
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cardWidth}px)`,
          gridTemplateRows: `repeat(${rows}, ${cardHeight}px)`,
          gap: '1px',
          p: '1px',
          overflow: 'hidden',
          minHeight: 0,
          width: '100%',
          height: `${headerHeight + totalHeightToSubtract + cardHeight * rows}px`,
          justifyContent: 'center',
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        {cellIndices.map((index) => {
          if (index === prevCellIndex) {
            return (
              <Button
                key="prev-button"
                variant="contained"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                sx={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                  color: currentPage === 1 ? '#bbb' : '#1976d2',
                  border: 'none',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: 'transparent', color: currentPage === 1 ? '#bbb' : '#0d47a1' },
                  '&:disabled': { color: '#ddd' },
                }}
              >
                <NavigateBefore sx={{ fontSize: '2.2rem' }} />
              </Button>
            );
          }
          if (index === nextCellIndex) {
            return (
              <Button
                key="next-button"
                variant="contained"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                sx={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                  color: currentPage === totalPages ? '#bbb' : '#1976d2',
                  border: 'none',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: 'transparent', color: currentPage === totalPages ? '#bbb' : '#0d47a1' },
                  '&:disabled': { color: '#ddd' },
                }}
              >
                <NavigateNext sx={{ fontSize: '2.2rem' }} />
              </Button>
            );
          }

          let productIndex = index;
          if (index > prevCellIndex) productIndex -= 1;
          if (index > nextCellIndex) productIndex -= 1;
          if (!currentProducts[productIndex]) {
            return (
              <Box
                key={`empty-${index}`}
                sx={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  border: '1px dashed #ccc',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9f9f9',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              />
            );
          }

          const product = currentProducts[productIndex];
          const categoryColor = getCategoryColor(product.category);

          return (
            <ProductCard
              key={product.id}
              product={product}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              cardScaleFactor={cardScaleFactor}
              categoryColor={categoryColor}
              isEditMode={isEditMode}
              selectedForDeletion={selectedProductsForDeletion.has(product.id)}
              isDragOver={dragOverProduct?.id === product.id}
              dailyQty={dailyQtyByProduct[product.id] || 0}
              onToggleDelete={() => {
                const next = new Set(selectedProductsForDeletion);
                if (next.has(product.id)) next.delete(product.id);
                else next.add(product.id);
                setSelectedProductsForDeletion(next);
              }}
              onProductClick={() => onProductClick(product)}
              onEditProduct={() => onEditProduct(product)}
              onDragStart={(e) => onDragStart(e, product)}
              onDragOver={(e) => onDragOver(e, product)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, product)}
              onDragEnd={onDragEnd}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ProductsPanel;


