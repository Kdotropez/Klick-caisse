import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import CSVImport from './components/CSVImport';
import WindowManager from './components/WindowManager';
import { Product, Category, CartItem, ProductVariation } from './types/Product';
import { loadProductionData, saveProductionData } from './data/productionData';

const App: React.FC = () => {
  const [showImport, setShowImport] = useState(false); // Changé à false pour démarrer directement
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLayoutLocked] = useState<boolean>(false);

  // Charger les données de production au démarrage
  useEffect(() => {
    const { products: loadedProducts, categories: loadedCategories } = loadProductionData();
    setProducts(loadedProducts);
    setCategories(loadedCategories);
  }, []);

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
    // TODO: Implémenter le processus de paiement
    console.log('Paiement pour:', cartItems);
    alert('Fonctionnalité de paiement à implémenter');
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

  if (showImport) {
    return (
      <Box sx={{ height: '100vh', width: '100vw', p: 3 }}>
        <CSVImport onImportComplete={handleImportComplete} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {/* Zone des fenêtres - plein écran */}
      <WindowManager
        products={products}
        categories={categories}
        cartItems={cartItems}
        isLayoutLocked={isLayoutLocked}
        onProductClick={handleProductClick}
        onProductWithVariationClick={handleProductWithVariationClick}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
        onImportComplete={handleImportComplete}
        onProductsReorder={handleProductsReorder}
        onUpdateCategories={handleUpdateCategories}
      />
    </Box>
  );
};

export default App;
