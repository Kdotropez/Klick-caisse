import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { Product, Category, CartItem, ProductVariation, Transaction } from '../types/Product';
import { Cashier } from '../types/Cashier';
import { StorageService } from '../services/StorageService';

// Import des hooks personnalisés
import { useProductManagement, useModalManagement } from '../hooks';

// Import des composants modulaires
import CategoriesPanel from './panels/CategoriesPanel';
import ProductsPanel from './panels/ProductsPanel';
import CartPanel from './panels/CartPanel';
import PaymentPanel from './panels/PaymentPanel';
import SettingsPanel from './panels/SettingsPanel';
import ImportPanel from './panels/ImportPanel';
import StatsPanel from './panels/StatsPanel';
import SubcategoriesPanel from './panels/SubcategoriesPanel';
import FreePanel from './panels/FreePanel';

// Import des modals
import VariationModal from './VariationModal';
import RecapModal from './RecapModal';
import PaymentRecapByMethodModal from './modals/PaymentRecapByMethodModal';
import TransactionHistoryModal from './modals/TransactionHistoryModal';
import GlobalTicketsModal from './modals/GlobalTicketsModal';
import GlobalTicketEditorModal from './modals/GlobalTicketEditorModal';
import ClosuresModal from './modals/ClosuresModal';
import EndOfDayModal from './modals/EndOfDayModal';
import GlobalDiscountModal from './GlobalDiscountModal';
import ItemDiscountModal from './ItemDiscountModal';
import CategoryManagementModal from './CategoryManagementModal';
import DailyReportModal from './DailyReportModal';
import ProductEditModal from './ProductEditModal';
import SubcategoryManagementModal from './SubcategoryManagementModal';

interface Window {
  id: string;
  title: string;
  type: 'products' | 'cart' | 'categories' | 'subcategories' | 'search' | 'settings' | 'import' | 'stats' | 'free';
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
}

interface WindowManagerRefactoredProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  isLayoutLocked: boolean;
  cashiers: Cashier[];
  currentCashier: Cashier | null;
  onProductClick: (product: Product) => void;
  onProductWithVariationClick: (product: Product, variation: ProductVariation) => void;
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  onCheckout: () => void;
  onImportComplete: (products: Product[], categories: Category[]) => void;
  onProductsReorder?: (newProducts: Product[]) => void;
  onUpdateCategories?: (newCategories: Category[]) => void;
  onUpdateCashiers?: (newCashiers: Cashier[]) => void;
  onCashierLogin?: (cashier: Cashier) => void;
}

const WindowManagerRefactored: React.FC<WindowManagerRefactoredProps> = ({
  products,
  categories,
  cartItems,
  isLayoutLocked,
  cashiers,
  currentCashier,
  onProductClick,
  onProductWithVariationClick,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onImportComplete,
  onProductsReorder,
  onUpdateCategories,
  onUpdateCashiers,
  onCashierLogin,
}) => {
  // Utilisation des hooks personnalisés
  const productManagement = useProductManagement({
    products,
    categories,
    onProductsReorder,
  });

  const modalManagement = useModalManagement();

  // États spécifiques au WindowManager (non extraits dans les hooks)
  const [windows, setWindows] = useState<Window[]>([
    {
      id: 'categories',
      title: 'Catégories',
      type: 'categories',
      x: 10,
      y: 10,
      width: 1200,
      height: 200,
      isMinimized: false,
      isMaximized: false,
      zIndex: 1,
    },
    {
      id: 'products',
      title: 'Articles',
      type: 'products',
      x: 10,
      y: 220,
      width: 1200,
      height: 500,
      isMinimized: false,
      isMaximized: false,
      zIndex: 2,
    },
    {
      id: 'cart',
      title: 'Panier',
      type: 'cart',
      x: 1230,
      y: 10,
      width: 400,
      height: 400,
      isMinimized: false,
      isMaximized: false,
      zIndex: 3,
    },
    {
      id: 'payment',
      title: 'Paiement',
      type: 'search',
      x: 1230,
      y: 430,
      width: 400,
      height: 200,
      isMinimized: false,
      isMaximized: false,
      zIndex: 4,
    },
  ]);

  // États pour la gestion des fenêtres
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingWindow, setResizingWindow] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [screenDimensions, setScreenDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [scaleFactor, setScaleFactor] = useState(1);

  // Fonction helper pour appliquer le facteur d'échelle
  const applyScale = (value: number) => Number((value * 0.9).toFixed(2));

  // Fonction pour obtenir la couleur d'une catégorie
  const getCategoryColor = useCallback((categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#1976d2';
  }, [categories]);

  // Gestionnaires d'événements pour les fenêtres
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLElement>, windowId: string) => {
    if (isLayoutLocked) return;
    
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggedWindow(windowId);
    
    // Amener la fenêtre au premier plan
    setWindows(prev => prev.map(w => ({
      ...w,
      zIndex: w.id === windowId ? Math.max(...prev.map(w => w.zIndex)) + 1 : w.zIndex
    })));
  }, [windows, isLayoutLocked]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (draggedWindow) {
      setWindows(prev => prev.map(w => {
        if (w.id === draggedWindow) {
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
          return {
            ...w,
            x: Math.max(0, Math.min(screenDimensions.width - w.width, newX)),
            y: Math.max(0, Math.min(screenDimensions.height - 64 - w.height, newY))
          };
        }
        return w;
      }));
    }
  }, [draggedWindow, dragOffset, screenDimensions]);

  const handleMouseUp = useCallback(() => {
    setDraggedWindow(null);
    setResizingWindow(null);
  }, []);

  // Effet pour les événements de souris
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Effet pour les dimensions de l'écran
  useEffect(() => {
    const handleResize = () => {
      setScreenDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fonction pour rendre le contenu d'une fenêtre
  const renderWindowContent = (window: Window) => {
    if (window.isMinimized) {
      return (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption">{window.title}</Typography>
        </Box>
      );
    }

    switch (window.type) {
      case 'categories':
        return (
          <CategoriesPanel
            categories={categories}
            products={products}
            selectedCategory={productManagement.selectedCategory}
            setSelectedCategory={productManagement.setSelectedCategory}
            selectedSubcategory={productManagement.selectedSubcategory}
            setSelectedSubcategory={productManagement.setSelectedSubcategory}
            searchTerm={productManagement.searchTerm}
            setSearchTerm={productManagement.setSearchTerm}
            categorySearchTerm={productManagement.categorySearchTerm}
            setCategorySearchTerm={productManagement.setCategorySearchTerm}
            subcategorySearchTerm={productManagement.subcategorySearchTerm}
            setSubcategorySearchTerm={productManagement.setSubcategorySearchTerm}
            productSortMode={productManagement.productSortMode}
            setProductSortMode={productManagement.setProductSortMode}
            isEditMode={productManagement.isEditMode}
            selectedProductsForDeletion={productManagement.selectedProductsForDeletion}
            onReset={productManagement.resetFilters}
            onDeleteSelected={productManagement.deleteSelectedProducts}
            onToggleEditMode={() => productManagement.setIsEditMode(!productManagement.isEditMode)}
            onCreateNewProduct={() => {/* TODO: Implémenter */}}
            onOpenSubcategoryManagement={modalManagement.openSubcategoryManagementModal}
            normalizeDecimals={productManagement.normalizeDecimals}
          />
        );

      case 'products':
        return (
          <ProductsPanel
            width={window.width}
            height={window.height}
            currentPage={productManagement.currentPage}
            totalPages={productManagement.totalPages}
            setCurrentPage={productManagement.setCurrentPage}
            currentProducts={productManagement.currentProducts}
            getCategoryColor={getCategoryColor}
            dailyQtyByProduct={productManagement.dailyQtyByProduct}
            isEditMode={productManagement.isEditMode}
            selectedProductsForDeletion={productManagement.selectedProductsForDeletion}
            setSelectedProductsForDeletion={productManagement.setSelectedProductsForDeletion}
            dragOverProduct={productManagement.dragOverProduct}
            onDragStart={productManagement.handleDragStart}
            onDragOver={productManagement.handleDragOver}
            onDragLeave={productManagement.handleDragLeave}
            onDrop={productManagement.handleDrop}
            onDragEnd={productManagement.handleDragEnd}
            onProductClick={onProductClick}
            onEditProduct={modalManagement.openProductEditModal}
          />
        );

      case 'cart':
        return (
          <CartPanel
            cartItems={cartItems}
            itemDiscounts={{}}
            globalDiscount={null}
            getItemFinalPrice={(item) => item.product.finalPrice * item.quantity}
            getTotalWithGlobalDiscount={() => cartItems.reduce((sum, item) => sum + (item.product.finalPrice * item.quantity), 0)}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onOpenDiscountModal={() => {/* TODO: Implémenter */}}
            onOpenRecap={modalManagement.openRecapModal}
            onOpenGlobalDiscount={modalManagement.openGlobalDiscountModal}
            onResetCartAndDiscounts={() => {/* TODO: Implémenter */}}
            onRemoveItemDiscount={() => {/* TODO: Implémenter */}}
            onClearGlobalDiscount={() => {/* TODO: Implémenter */}}
            promoBanner={null}
          />
        );

      case 'search':
        return (
          <PaymentPanel
            cartItems={cartItems}
            totalAmount={cartItems.reduce((sum, item) => sum + (item.product.finalPrice * item.quantity), 0)}
            paymentTotals={{ 'Espèces': 0, 'SumUp': 0, 'Carte': 0 }}
            onPayCash={() => {/* TODO: Implémenter */}}
            onPaySumUp={() => {/* TODO: Implémenter */}}
            onPayCard={() => {/* TODO: Implémenter */}}
            onOpenCashRecap={() => {/* TODO: Implémenter */}}
            onOpenSumUpRecap={() => {/* TODO: Implémenter */}}
            onOpenCardRecap={() => {/* TODO: Implémenter */}}
          />
        );

      default:
        return <Typography>Fenêtre non reconnue: {window.type}</Typography>;
    }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Fenêtres */}
      {windows.map((window) => (
        <Paper
          key={window.id}
          sx={{
            position: 'absolute',
            left: window.x,
            top: window.y,
            width: window.width,
            height: window.height,
            zIndex: window.zIndex,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 3,
            border: '2px solid',
            cursor: isLayoutLocked ? 'default' : 'move',
            ...(window.id === 'categories' && {
              border: 'none',
              boxShadow: 0,
              backgroundColor: 'transparent'
            }),
            ...(window.id === 'products' && {
              borderColor: '#2e7d32',
              backgroundColor: '#f1f8e9',
              '& .MuiTypography-h6': { color: '#2e7d32' }
            }),
            ...(window.id === 'cart' && {
              borderColor: '#d32f2f',
              backgroundColor: '#ffebee',
              '& .MuiTypography-h6': { color: '#d32f2f' }
            }),
            ...(window.id === 'search' && {
              borderColor: '#ed6c02',
              backgroundColor: '#fff4e5',
              '& .MuiTypography-h6': { color: '#ed6c02' }
            }),
          }}
          onMouseDown={(e) => handleMouseDown(e, window.id)}
        >
          <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
            {renderWindowContent(window)}
          </Box>
        </Paper>
      ))}

      {/* Modals */}
      <VariationModal
        open={modalManagement.variationModalOpen}
        product={modalManagement.selectedProduct}
        onClose={modalManagement.closeVariationModal}
        onSelectVariation={(variation) => {
          if (modalManagement.selectedProduct) {
            onProductWithVariationClick(modalManagement.selectedProduct, variation);
          }
        }}
      />

      <ProductEditModal
        open={modalManagement.showProductEditModal}
        onClose={modalManagement.closeProductEditModal}
        product={modalManagement.selectedProductForEdit}
        categories={categories}
        onSave={(updatedProduct) => {
          // TODO: Implémenter la sauvegarde
          modalManagement.closeProductEditModal();
        }}
        onDelete={() => {
          // TODO: Implémenter la suppression
          modalManagement.closeProductEditModal();
        }}
      />

      <SubcategoryManagementModal
        open={modalManagement.showSubcategoryManagementModal}
        onClose={modalManagement.closeSubcategoryManagementModal}
        categories={categories}
        products={products}
        onUpdateSubcategories={(categoryId, newSubcategories) => {
          // TODO: Implémenter la mise à jour des sous-catégories
        }}
      />

      <RecapModal
        open={modalManagement.showRecapModal}
        onClose={modalManagement.closeRecapModal}
        cartItems={cartItems}
      />

      {/* Autres modals à ajouter selon les besoins */}
    </Box>
  );
};

export default WindowManagerRefactored;
