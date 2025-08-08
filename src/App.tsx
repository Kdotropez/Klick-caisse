import React, { useState, useEffect } from 'react';
import { Box, Snackbar, Alert, Typography } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
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
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');

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
    
    // Préparer le message de confirmation
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const message = `Paiement effectué ! ${totalItems} article(s) vendu(s)`;
    
    // Vider le panier
    setCartItems([]);
    
    // Afficher la notification de succès
    setPaymentMessage(message);
    setShowPaymentSuccess(true);
    
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

      {/* Notification de paiement réussi */}
      <Snackbar
        open={showPaymentSuccess}
        autoHideDuration={3000}
        onClose={() => setShowPaymentSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: '50% !important',
          transform: 'translateY(-50%) !important',
          '& .MuiSnackbar-root': {
            zIndex: 9999
          }
        }}
      >
        <Alert
          onClose={() => setShowPaymentSuccess(false)}
          severity="success"
          icon={<CheckCircle />}
          sx={{
            width: '100%',
            backgroundColor: '#4caf50',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            border: '2px solid #45a049',
            '& .MuiAlert-icon': {
              color: 'white',
              fontSize: '2rem'
            },
            '& .MuiAlert-message': {
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            }
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
            {paymentMessage}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default App;
