import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import CSVImport from './components/CSVImport';
import WindowManager from './components/WindowManager';
import { Product, Category, CartItem, ProductVariation } from './types/Product';
import { Cashier } from './types/Cashier';
import { loadProductionData, saveProductionData } from './data/productionData';
import { StorageService } from './services/StorageService';

const App: React.FC = () => {
  const [showImport, setShowImport] = useState(false); // Changé à false pour démarrer directement
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLayoutLocked] = useState<boolean>(false);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [rootSize, setRootSize] = useState({ width: '1280px', height: '880px' });
  const [_isResizingRoot, setIsResizingRoot] = useState(false);


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
    const enablePersistentStorage = async () => {
      try {
        const nav: any = navigator as any;
        if (nav?.storage && (nav.storage.persist || nav.storage.persisted)) {
          const already = nav.storage.persisted ? await nav.storage.persisted() : false;
          if (!already && nav.storage.persist) {
            const granted = await nav.storage.persist();
            // eslint-disable-next-line no-console
            console.log('Persistent storage requested:', granted);
          } else {
            // eslint-disable-next-line no-console
            console.log('Persistent storage already granted:', already);
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Persistent storage request failed or unsupported', e);
      }
    };
    enablePersistentStorage();
  }, []);

  // Migration de nettoyage sous-catégories (une seule fois)
  useEffect(() => {
    const MIGRATION_FLAG = 'subcats_migrated_v1';
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    if (products.length === 0 || categories.length === 0) return;

    // Nettoyer associatedCategories de tous les produits
    const cleanedProducts = products.map(p => {
      const map = new Map<string, string>();
      (p.associatedCategories || [])
        .map(s => StorageService.sanitizeLabel(s))
        .map(s => s.trim())
        .forEach(s => {
          if (!s) return;
          const norm = StorageService.normalizeLabel(s);
          const alnum = norm.replace(/[^a-z0-9]/g, '');
          if (alnum.length < 2) return; // écarter c, b, \u0000S, etc.
          if (!map.has(norm)) map.set(norm, s);
        });
      const unique = Array.from(map.values());
      return unique.length !== (p.associatedCategories || []).length ||
        (p.associatedCategories || []).some((v, i) => v !== unique[i])
        ? { ...p, associatedCategories: unique }
        : p;
    });

    // Réécrire le registre global avec nettoyage
    const merged = StorageService.loadSubcategories();
    StorageService.saveSubcategories(merged);

    // Sauvegarder si des produits ont changé
    const changed = cleanedProducts.some((p, idx) => p !== products[idx]);
    if (changed) {
      setProducts(cleanedProducts);
      saveProductionData(cleanedProducts, categories);
      // Sauvegarder également en localStorage pour garantir cohérence runtime
      StorageService.saveProducts(cleanedProducts);
    }

    localStorage.setItem(MIGRATION_FLAG, '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, categories]);

  // Migration ciblée: corriger les sous-catégories "VERRE" approximatives (verre 6 -> VERRES 6.50, etc.)
  useEffect(() => {
    const FLAG = 'fix_glass_subcats_v2';
    if (localStorage.getItem(FLAG)) return;
    if (products.length === 0) return;

    const norm = (s: string) => StorageService.normalizeLabel(s);
    const canonical = (s: string) => s.trim();

    const mapLabel = (label: string): string => {
      const n = norm(label);
      // Variantes 6.50
      if (/^verres?\s*6(\s|$)/.test(n) || /^verres?\s*6[\.,]?\s*5\s*0?\s*$/.test(n)) return 'VERRES 6.50';
      // Variantes 8.50
      if (/^verres?\s*8(\s|$)/.test(n) || /^verres?\s*8[\.,]?\s*5\s*0?\s*$/.test(n)) return 'VERRES 8.50';
      // 10
      if (/^verres?\s*10\b/.test(n)) return 'VERRES 10';
      // 12
      if (/^verres?\s*12\b/.test(n)) return 'VERRES 12';
      // 4
      if (/^verres?\s*4\b/.test(n)) return 'VERRES 4';
      return canonical(label);
    };

    const updated = products.map(p => {
      if (norm(p.category) !== 'verre') return p;
      const assoc = Array.isArray(p.associatedCategories) ? p.associatedCategories : [];
      if (assoc.length === 0) return p;
      const next = Array.from(new Set(assoc.map(mapLabel)));
      if (next.some((v, i) => v !== assoc[i]) || next.length !== assoc.length) {
        return { ...p, associatedCategories: next };
      }
      return p;
    });

    const changed = updated.some((p, i) => p !== products[i]);
    if (changed) {
      setProducts(updated);
      saveProductionData(updated, categories);
      StorageService.saveProducts(updated);
    }
    localStorage.setItem(FLAG, '1');
  }, [products, categories]);

  const handleImportComplete = (importedProducts: Product[], importedCategories: Category[]) => {
    setProducts(importedProducts);
    setCategories(importedCategories);
    setShowImport(false);
    // Sauvegarder les nouvelles données
    saveProductionData(importedProducts, importedCategories);
  };

  const handleProductClick = (product: Product) => {
    // Ajouter directement au panier (produit sans déclinaisons)
    const existingItem = cartItems.find(item => 
      item.product.id === product.id && !item.selectedVariation
    );

    if (existingItem) {
      setCartItems(prev => prev.map(item => 
        item === existingItem 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, {
        product,
        quantity: 1,
      }]);
    }
  };

  const handleProductWithVariationClick = (product: Product, variation: ProductVariation) => {
    // Ajouter au panier avec la déclinaison sélectionnée
    const existingItem = cartItems.find(item => 
      item.product.id === product.id && item.selectedVariation?.id === variation.id
    );

    if (existingItem) {
      setCartItems(prev => prev.map(item => 
        item === existingItem 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems(prev => [...prev, {
        product,
        quantity: 1,
        selectedVariation: variation,
      }]);
    }
  };

  const handleUpdateQuantity = (productId: string, variationId: string | null, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId, variationId);
      return;
    }

    setCartItems(prev => prev.map(item => {
      const isMatch = item.product.id === productId && 
        (variationId ? item.selectedVariation?.id === variationId : !item.selectedVariation);
      
      return isMatch ? { ...item, quantity } : item;
    }));
  };

  const handleRemoveItem = (productId: string, variationId: string | null) => {
    setCartItems(prev => prev.filter(item => {
      const isMatch = item.product.id === productId && 
        (variationId ? item.selectedVariation?.id === variationId : !item.selectedVariation);
      return !isMatch;
    }));
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert('Le panier est vide !');
      return;
    }

    // Mettre à jour les compteurs de ventes pour chaque produit vendu
    const updatedProducts = products.map(product => {
      const soldItems = cartItems.filter(item => item.product.id === product.id);
      if (soldItems.length > 0) {
        const totalSold = soldItems.reduce((sum, item) => sum + item.quantity, 0);
        return {
          ...product,
          salesCount: (product.salesCount || 0) + totalSold
        };
      }
      return product;
    });

    setProducts(updatedProducts);
    
    // Sauvegarder les produits mis à jour
    saveProductionData(updatedProducts, categories);
    
    // Vider le panier
    setCartItems([]);
    
    console.log('✅ Paiement effectué - Compteurs de ventes mis à jour');
  };

  const handleProductsReorder = (newProducts: Product[]) => {
    setProducts(newProducts);
    // Sauvegarder le nouvel ordre dans le localStorage
    localStorage.setItem('reorderedProducts', JSON.stringify(newProducts));
    console.log('Nouvel ordre des produits sauvegardé');
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    // Sauvegarder les nouvelles catégories
    saveProductionData(products, newCategories);
    console.log('Nouvelles catégories sauvegardées:', newCategories.length);
  };

  const handleUpdateCashiers = (newCashiers: Cashier[]) => {
    setCashiers(newCashiers);
    StorageService.saveCashiers(newCashiers);
  };

  const handleCashierLogin = (cashier: Cashier) => {
    setCurrentCashier(cashier);
    StorageService.updateCashierLastLogin(cashier.id);
  };

     if (showImport) {
     return (
       <Box sx={{ height: '100vh', width: '100vw', p: 3 }}>
         <CSVImport onImportComplete={handleImportComplete} />
       </Box>
     );
   }

  const handleRootResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRoot(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = parseInt(rootSize.width);
    const startHeight = parseInt(rootSize.height);

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const newWidth = Math.max(800, startWidth + deltaX);
      const newHeight = Math.max(600, startHeight + deltaY);
      setRootSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    };

    const handleMouseUp = () => {
      setIsResizingRoot(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Box sx={{ 
      height: rootSize.height, 
      width: rootSize.width, 
      position: 'relative',
      border: '2px solid #1976d2',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden'
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

      {/* Affichage de la taille du div#root */}
      <Box
        sx={{
          position: 'absolute',
          top: 5,
          right: 5,
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        {parseInt(rootSize.width)}×{parseInt(rootSize.height)}
      </Box>

      {/* Zone des fenêtres - plein écran */}
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
