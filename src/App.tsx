import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import WindowManager from './components/WindowManager';
import { Product, Category, CartItem, ProductVariation } from './types/Product';
import { Cashier } from './types/Cashier';
import { loadProductionData, saveProductionData } from './data/productionData';
import { StorageService } from './services/StorageService';
import { useUISettings } from './context/UISettingsContext';
const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLayoutLocked] = useState<boolean>(false);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [rootSize, setRootSize] = useState<{ width: string; height: string }>({ width: '1280px', height: '880px' });
  // Charger les données de production au démarrage
  useEffect(() => {
    const { products: loadedProducts, categories: loadedCategories } = loadProductionData();
    setProducts(loadedProducts);
    setCategories(loadedCategories);
    
    // Initialiser les caissiers
    const loadedCashiers = StorageService.initializeDefaultCashier();
    setCashiers(loadedCashiers);
  }, []);

  // Demander le stockage persistant pour protéger les données locales contre l'éviction
  useEffect(() => {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      navigator.storage.persist().then((persisted) => {
        console.log(`Persistance du stockage: ${persisted ? 'activée' : 'non activée'}`);
      });
    }
  }, []);

  const handleProductClick = (product: Product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { product, quantity: 1 }];
      }
    });
  };

  const handleProductWithVariationClick = (product: Product, variation: ProductVariation) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.product.id === product.id && 
        item.selectedVariation?.id === variation.id
      );
      
      if (existingItem) {
        return prevItems.map(item =>
          item.product.id === product.id && item.selectedVariation?.id === variation.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevItems, { product, quantity: 1, selectedVariation: variation }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, variationId: string | null, newQuantity: number) => {
    setCartItems(prevItems => {
      const itemIndex = prevItems.findIndex(item => 
        item.product.id === productId && 
        (variationId ? item.selectedVariation?.id === variationId : !item.selectedVariation)
      );
      
      if (itemIndex === -1) return prevItems;
      
      if (newQuantity <= 0) {
        return prevItems.filter((_, i) => i !== itemIndex);
      } else {
        return prevItems.map((item, i) => 
          i === itemIndex ? { ...item, quantity: newQuantity } : item
        );
      }
    });
  };

  const handleRemoveItem = (productId: string, variationId: string | null) => {
    setCartItems(prevItems => 
      prevItems.filter(item => 
        !(item.product.id === productId && 
          (variationId ? item.selectedVariation?.id === variationId : !item.selectedVariation))
      )
    );
  };

  const handleCheckout = () => {
    // Vider le panier
    setCartItems([]);
  };

  const handleImportComplete = (importedProducts: Product[], importedCategories: Category[]) => {
    setProducts(importedProducts);
    setCategories(importedCategories);
    saveProductionData(importedProducts, importedCategories);
  };

  const handleProductsReorder = (reorderedProducts: Product[]) => {
    setProducts(reorderedProducts);
    saveProductionData(reorderedProducts, categories);
  };

  const handleUpdateCategories = (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    saveProductionData(products, updatedCategories);
  };

  const handleUpdateCashiers = (updatedCashiers: Cashier[]) => {
    setCashiers(updatedCashiers);
    StorageService.saveCashiers(updatedCashiers);
  };

  const handleCashierLogin = (cashier: Cashier) => {
    setCurrentCashier(cashier);
  };

  const handleRootResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(rootSize.width);
    const startHeight = parseInt(rootSize.height);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newWidth = Math.max(800, startWidth + deltaX);
      const newHeight = Math.max(600, startHeight + deltaY);
      
      setRootSize({
        width: `${newWidth}px`,
        height: `${newHeight}px`
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const { compactMode } = useUISettings();

  return (
    <Box sx={{
      height: rootSize.height,
      width: rootSize.width,
      position: 'relative',
      border: '2px solid #1976d2',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden',
      transform: compactMode ? 'scale(0.9)' : 'none',
      transformOrigin: 'top left'
    }}>
      {/* Poignée de redimensionnement du div#root */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          backgroundColor: '#1976d2',
          cursor: 'se-resize',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          '&:hover': {
            backgroundColor: '#1565c0'
          }
        }}
        onMouseDown={handleRootResizeStart}
      >
        ⬌
      </Box>

      <WindowManager
        products={products}
        categories={categories}
        cartItems={cartItems}
        isLayoutLocked={isLayoutLocked}
        cashiers={cashiers}
        currentCashier={currentCashier}
        onProductClick={handleProductClick}
        onProductWithVariationClick={handleProductWithVariationClick}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        onImportComplete={handleImportComplete}
        onProductsReorder={handleProductsReorder}
        onUpdateCategories={handleUpdateCategories}
        onUpdateCashiers={handleUpdateCashiers}
        onCashierLogin={handleCashierLogin}
      />
    </Box>
  );
};

export default App;