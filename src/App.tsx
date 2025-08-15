import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import WindowManager from './components/WindowManager';

import { Product, Category, CartItem, ProductVariation } from './types';
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
  const [currentStoreCode, setCurrentStoreCode] = useState<string>(StorageService.getCurrentStoreCode());
  // Charger les données de production au démarrage
  useEffect(() => {
    const { products: loadedProducts, categories: loadedCategories } = loadProductionData(currentStoreCode);
    setProducts(loadedProducts);

    // Appliquer l'ordre des catégories sauvegardé (persistance entre refresh/import)
    try {
      const settings = StorageService.loadSettings() || {};
      const savedOrder: string[] | undefined = Array.isArray(settings.categoryOrder) ? settings.categoryOrder : undefined;
      if (savedOrder && savedOrder.length > 0) {
        const byId = new Map(loadedCategories.map(c => [c.id, c] as const));
        const ordered: typeof loadedCategories = [];
        for (const id of savedOrder) {
          const c = byId.get(id);
          if (c) {
            ordered.push(c);
            byId.delete(id);
          }
        }
        // Ajouter les catégories nouvelles/non référencées à la fin, en conservant leur ordre d'arrivée
        const rest = loadedCategories.filter(c => byId.has(c.id));
        setCategories([...ordered, ...rest]);
      } else {
        setCategories(loadedCategories);
      }
    } catch {
      setCategories(loadedCategories);
    }
    
    // Initialiser les caissiers
    const loadedCashiers = StorageService.initializeDefaultCashier();
    setCashiers(loadedCashiers);
  }, []);

  // Persister l'ordre des catégories à chaque modification (drag & drop, ajout, import)
  useEffect(() => {
    if (!categories || categories.length === 0) return;
    try {
      const settings = StorageService.loadSettings() || {};
      const next = { ...settings, categoryOrder: categories.map(c => c.id) };
      StorageService.saveSettings(next);
    } catch {}
  }, [categories]);



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
    // Réappliquer l'ordre utilisateur des catégories si présent dans les settings
    try {
      const settings = StorageService.loadSettings() || {};
      const savedOrder: string[] | undefined = Array.isArray(settings.categoryOrder) ? settings.categoryOrder : undefined;
      if (savedOrder && savedOrder.length > 0) {
        const byId = new Map(importedCategories.map(c => [c.id, c] as const));
        const ordered: Category[] = [];
        for (const id of savedOrder) {
          const c = byId.get(id);
          if (c) {
            ordered.push(c);
            byId.delete(id);
          }
        }
        const rest = importedCategories.filter(c => byId.has(c.id));
        const finalCategories = [...ordered, ...rest];
        setCategories(finalCategories);
        saveProductionData(importedProducts, finalCategories);
        // Mettre à jour l'ordre sauvegardé (pour inclure d'éventuelles nouvelles catégories)
        const next = { ...settings, categoryOrder: finalCategories.map(c => c.id) };
        StorageService.saveSettings(next);
        return;
      }
    } catch {}
    setCategories(importedCategories);
    saveProductionData(importedProducts, importedCategories);
  };

  const handleProductsReorder = (reorderedProducts: Product[]) => {
    setProducts(reorderedProducts);
    // Préserver les catégories existantes (dont l'ordre des sous-catégories)
    saveProductionData(reorderedProducts, categories);
  };

  const handleUpdateCategories = (updatedCategories: Category[]) => {
    // Fusion non destructive: préserver subcategoryOrder existant quand identifiant identique
    const byId = new Map(categories.map(c => [c.id, c] as const));
    const merged = updatedCategories.map(cat => {
      const prev = byId.get(cat.id);
      if (!prev) return cat;
      return { ...cat, subcategoryOrder: prev.subcategoryOrder ?? cat.subcategoryOrder };
    });
    setCategories(merged);
    saveProductionData(products, merged);
    // Sauvegarder l'ordre courant immédiatement
    try {
      const settings = StorageService.loadSettings() || {};
      const next = { ...settings, categoryOrder: merged.map(c => c.id) };
      StorageService.saveSettings(next);
    } catch {}
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

  const { compactMode, autoFit } = useUISettings();
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 880,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const rootWidthPx = parseInt(rootSize.width);
  const rootHeightPx = parseInt(rootSize.height);
  const fitScale = autoFit
    ? Math.min(viewportSize.width / rootWidthPx, viewportSize.height / rootHeightPx, 1)
    : 1;
  const baseScale = compactMode ? 0.9 : 1;
  const finalScale = Math.min(baseScale, fitScale);

  return (
    <Box sx={{
      height: rootSize.height,
      width: rootSize.width,
      position: 'relative',
      border: '2px solid #1976d2',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden',
      transform: `scale(${finalScale})`,
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
        currentStoreCode={currentStoreCode}
        onStoreChange={setCurrentStoreCode}
      />
    </Box>
  );
};

export default App;