import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Store, Lock, LockOpen } from '@mui/icons-material';
import CSVImport from './components/CSVImport';
import WindowManager from './components/WindowManager';
import { Product, Category, CartItem } from './types/Product';
import { loadProductionData, saveProductionData } from './data/productionData';

const App: React.FC = () => {
  const [showImport, setShowImport] = useState(false); // Changé à false pour démarrer directement
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(false);

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
    // Pour l'instant, ajouter directement au panier
    // Plus tard, on ouvrira une modale pour choisir les déclinaisons
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

  if (showImport) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Store sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Klick Caisse - Import CSV
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <CSVImport onImportComplete={handleImportComplete} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* AppBar */}
      <AppBar position="static">
        <Toolbar>
          <Store sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Klick Caisse - Système de Fenêtres
          </Typography>
          <Button
            color="inherit"
            startIcon={isLayoutLocked ? <Lock /> : <LockOpen />}
            onClick={() => setIsLayoutLocked(!isLayoutLocked)}
            sx={{ mr: 2 }}
          >
            {isLayoutLocked ? 'Déverrouiller' : 'Verrouiller'} Layout
          </Button>
          <Button
            color="inherit"
            onClick={() => {
              setShowImport(true);
              setProducts([]);
              setCategories([]);
              setCartItems([]);
            }}
          >
            Réimporter CSV
          </Button>
        </Toolbar>
      </AppBar>

      {/* Zone des fenêtres */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <WindowManager
          products={products}
          categories={categories}
          cartItems={cartItems}
          isLayoutLocked={isLayoutLocked}
          onProductClick={handleProductClick}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          onImportComplete={handleImportComplete}
        />
      </Box>
    </Box>
  );
};

export default App;
