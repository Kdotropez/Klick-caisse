import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import WindowManager from './components/WindowManager';
import LicenseModal from './components/LicenseModal';
import StoreSelectModal from './components/StoreSelectModal';
import LegacyMigrationModal from './components/LegacyMigrationModal';

import { Product, Category, CartItem, ProductVariation } from './types';
import { STORES } from './types/Store';
import { Cashier } from './types/Cashier';
import { loadProductionData, saveProductionData } from './data/productionData';
import { StorageService } from './services/StorageService';
// import { UpdateService } from './services/UpdateService';
// import { APP_VERSION } from './version';
import { useUISettings } from './context/UISettingsContext';

const MIN_ROOT_WIDTH = 800;
const MIN_ROOT_HEIGHT = 600;

/** Affiche la poignée de redimensionnement du cadre racine. */
const SHOW_ROOT_RESIZE_HANDLE = false;

function getDefaultRootSize(): { width: string; height: string } {
  if (typeof window === 'undefined') {
    return { width: `${MIN_ROOT_WIDTH}px`, height: `${MIN_ROOT_HEIGHT}px` };
  }
  return {
    width: `${Math.max(MIN_ROOT_WIDTH, window.innerWidth)}px`,
    height: `${Math.max(MIN_ROOT_HEIGHT, window.innerHeight)}px`,
  };
}

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLayoutLocked, setIsLayoutLocked] = useState<boolean>(false);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [currentCashier, setCurrentCashier] = useState<Cashier | null>(null);
  const [isLicenseValid, setIsLicenseValid] = useState<boolean>(false);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(true);
  const [lastValidatedDate, setLastValidatedDate] = useState<string>('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const [rootSize, setRootSize] = useState<{ width: string; height: string }>(getDefaultRootSize);
  const [currentStoreCode, setCurrentStoreCode] = useState<string>(StorageService.getCurrentStoreCode());
  const [storeSessionReady, setStoreSessionReady] = useState<boolean>(false);
  const [legacyMigrationDone, setLegacyMigrationDone] = useState<boolean>(
    () => !StorageService.requiresLegacyMigrationPrompt()
  );

  // Avec cadre plein écran (sans poignée), suivre la taille de la fenêtre pour garder les limites cohérentes.
  useEffect(() => {
    if (SHOW_ROOT_RESIZE_HANDLE) return;
    const sync = () => setRootSize(getDefaultRootSize());
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);

  const getStoreSelectInitialCode = () => {
    try {
      const s = sessionStorage.getItem('klick_suggested_store_after_migrate');
      if (s && STORES.some((x) => x.code === s)) return s;
    } catch {
      /* ignore */
    }
    return StorageService.getCurrentStoreCode();
  };

  // Charger les données de production une fois la boutique choisie
  useEffect(() => {
    if (!storeSessionReady) return;
    const loadData = async () => {
      const { products: loadedProducts, categories: loadedCategories } = await loadProductionData(currentStoreCode);
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
      // Synchroniser automatiquement les sous-catégories
      StorageService.syncSubcategoriesFromProducts();
      
      // Initialiser les caissiers
      const loadedCashiers = StorageService.initializeDefaultCashier();
      setCashiers(loadedCashiers);
    };
    
    loadData();
    
    // Désactiver temporairement la vérification des mises à jour (erreur 404 GitHub)
    // UpdateService.startBackgroundUpdateCheck(APP_VERSION, 30); // Vérifier toutes les 30 minutes
  }, [storeSessionReady, currentStoreCode]);

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

  const { compactMode, autoFit } = useUISettings();
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 880,
  });

  // Debug minimal (optionnel) pour valider le drag poignée.
  // Active via: localStorage.setItem('ui.resizeDebug','1')
  const [resizeDebug] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ui.resizeDebug') === '1';
    } catch {
      return false;
    }
  });

  // Gestion de la licence
  const handleLicenseValid = () => {
    setIsLicenseValid(true);
    setShowLicenseModal(false);
    setLastValidatedDate(new Date().toLocaleDateString('fr-FR'));
    setLastActivity(Date.now());
    setIsLocked(false);
  };

  // Vérifier si la licence est toujours valide (même date)
  const checkLicenseValidity = useCallback(() => {
    const today = new Date().toLocaleDateString('fr-FR');
    if (lastValidatedDate !== today) {
      setIsLicenseValid(false);
      setShowLicenseModal(true);
      setLastValidatedDate('');
      setIsLocked(false);
    }
  }, [lastValidatedDate]);

  // Gestion du verrouillage automatique
  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  const checkAutoLock = useCallback(() => {
    if (isLicenseValid && !isLocked) {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;
      const lockTimeout = 15 * 60 * 1000; // 15 minutes en millisecondes
      
      if (timeSinceLastActivity >= lockTimeout) {
        setIsLocked(true);
        setShowLicenseModal(true);
      }
    }
  }, [isLicenseValid, isLocked, lastActivity]);

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

  // Vérifier la validité de la licence et le verrouillage automatique
  useEffect(() => {
    if (isLicenseValid) {
      const interval = setInterval(() => {
        checkLicenseValidity();
        checkAutoLock();
      }, 60000); // Vérifier toutes les minutes

      // Vérifier aussi quand la fenêtre reprend le focus
      const handleFocus = () => {
        checkLicenseValidity();
        checkAutoLock();
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      };
    }
  }, [isLicenseValid, lastValidatedDate, lastActivity, isLocked, checkLicenseValidity, checkAutoLock]);

  const rootWidthPx = parseInt(rootSize.width);
  const rootHeightPx = parseInt(rootSize.height);
  const baseScale = compactMode ? 0.9 : 1;
  const [isRootResizing, setIsRootResizing] = useState(false);

  // Pendant un resize manuel via la poignée, désactiver temporairement l'auto-fit
  // pour que la taille visuelle change réellement (sinon autoFit annule l'effet).
  const fitScale = autoFit && !isRootResizing
    ? Math.min(viewportSize.width / rootWidthPx, viewportSize.height / rootHeightPx, 1)
    : 1;
  const finalScale = Math.min(baseScale, fitScale);

  /** Ref poignée : drag via Pointer Events + capture (fiable souris / stylet / tactile). */
  const rootResizeHandleRef = useRef<HTMLDivElement | null>(null);

  const handleRootResizePointerDown =(
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Utiliser l'élément courant (évite un ref éventuellement null)
    const el = e.currentTarget;
    const pointerId = e.pointerId;

    // Pendant le resize, on force un fitScale=1 (voir `fitScale` ci-dessus),
    // donc l'échelle effective devient `baseScale`.
    const scale = baseScale > 0.01 ? baseScale : 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = parseInt(rootSize.width, 10) || MIN_ROOT_WIDTH;
    const startH = parseInt(rootSize.height, 10) || MIN_ROOT_HEIGHT;

    setIsRootResizing(true);

    let moveLogs = 0;
    if (resizeDebug) {
      console.log('[resizeDebug] start', {
        clientX: e.clientX,
        clientY: e.clientY,
        startW,
        startH,
        baseScale,
        autoFit,
        finalScale,
      });
    }

    try {
      el.setPointerCapture(pointerId);
    } catch {
      /* navigateurs très anciens */
    }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      const nw = Math.max(MIN_ROOT_WIDTH, Math.round(startW + dx));
      const nh = Math.max(MIN_ROOT_HEIGHT, Math.round(startH + dy));
      setRootSize({ width: `${nw}px`, height: `${nh}px` });

      if (resizeDebug) {
        // Log limité pour éviter de saturer la console
        if (moveLogs < 5) {
          moveLogs += 1;
          console.log('[resizeDebug] move', { clientX: ev.clientX, clientY: ev.clientY, nw, nh });
        }
      }
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove as any);
      window.removeEventListener('pointerup', onUp as any);
      window.removeEventListener('pointercancel', onUp as any);

      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      cleanup();
      setIsRootResizing(false);

      if (resizeDebug) {
        console.log('[resizeDebug] end', { clientX: ev.clientX, clientY: ev.clientY });
      }
    };

    // Attacher sur `window` rend le drag robuste même si la capture pointer échoue.
    window.addEventListener('pointermove', onMove as any);
    window.addEventListener('pointerup', onUp as any);
    window.addEventListener('pointercancel', onUp as any);
  };

  // Fallback souris (si `pointerdown` n'est pas fiable dans certains environnements)
  const handleRootResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== undefined && e.button !== 0) return;

    const scale = baseScale > 0.01 ? baseScale : 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = parseInt(rootSize.width, 10) || MIN_ROOT_WIDTH;
    const startH = parseInt(rootSize.height, 10) || MIN_ROOT_HEIGHT;

    setIsRootResizing(true);

    const onMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      const nw = Math.max(MIN_ROOT_WIDTH, Math.round(startW + dx));
      const nh = Math.max(MIN_ROOT_HEIGHT, Math.round(startH + dy));
      setRootSize({ width: `${nw}px`, height: `${nh}px` });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onUp);
      setIsRootResizing(false);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onUp);
  };

  // Fallback tactile (iOS / certains setups)
  const handleRootResizeTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const t = e.touches?.[0];
    if (!t) return;

    const scale = baseScale > 0.01 ? baseScale : 1;
    const startX = t.clientX;
    const startY = t.clientY;
    const startW = parseInt(rootSize.width, 10) || MIN_ROOT_WIDTH;
    const startH = parseInt(rootSize.height, 10) || MIN_ROOT_HEIGHT;

    setIsRootResizing(true);

    const onMove = (ev: TouchEvent) => {
      const touch = ev.touches?.[0];
      if (!touch) return;
      const dx = (touch.clientX - startX) / scale;
      const dy = (touch.clientY - startY) / scale;
      const nw = Math.max(MIN_ROOT_WIDTH, Math.round(startW + dx));
      const nh = Math.max(MIN_ROOT_HEIGHT, Math.round(startH + dy));
      setRootSize({ width: `${nw}px`, height: `${nh}px` });
    };

    const onUp = () => {
      document.removeEventListener('touchmove', onMove as any);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('touchcancel', onUp);
      setIsRootResizing(false);
    };

    document.addEventListener('touchmove', onMove as any, { passive: false } as AddEventListenerOptions);
    document.addEventListener('touchend', onUp);
    document.addEventListener('touchcancel', onUp);
  };

  // Si la licence n'est pas valide ou si l'application est verrouillée, afficher la modale de licence
  if (!isLicenseValid || isLocked) {
    return (
      <LicenseModal 
        open={showLicenseModal} 
        onLicenseValid={handleLicenseValid}
        isLocked={isLocked}
      />
    );
  }

  if (!legacyMigrationDone) {
    return (
      <LegacyMigrationModal
        initialCode={StorageService.getCurrentStoreCode()}
        onMigrate={(code) => {
          try {
            StorageService.migrateLegacyBundleToStore(code);
          } catch (e) {
            console.error(e);
            window.alert(
              "La migration n'a pas pu se terminer (souvent: mémoire du navigateur pleine). Libérez de l'espace ou réessayez. Détails dans la console."
            );
            return;
          }
          try {
            sessionStorage.setItem('klick_suggested_store_after_migrate', code);
          } catch {
            /* ignore */
          }
          setLegacyMigrationDone(true);
        }}
        onDiscardLegacy={() => {
          StorageService.purgeLegacyGlobalBundle();
          setLegacyMigrationDone(true);
        }}
      />
    );
  }

  if (!storeSessionReady) {
    const storeSelectInitialCode = getStoreSelectInitialCode();
    return (
      <StoreSelectModal
        key={legacyMigrationDone ? storeSelectInitialCode : 'pending'}
        initialCode={storeSelectInitialCode}
        onConfirm={(code) => {
          try {
            sessionStorage.removeItem('klick_suggested_store_after_migrate');
          } catch {
            /* ignore */
          }
          StorageService.setCurrentStoreCode(code);
          setCurrentStoreCode(code);
          setStoreSessionReady(true);
        }}
      />
    );
  }

  const layoutBounds = {
    width: parseInt(rootSize.width, 10) || MIN_ROOT_WIDTH,
    height: parseInt(rootSize.height, 10) || MIN_ROOT_HEIGHT,
  };

  return (
    <Box sx={{
      height: rootSize.height,
      width: rootSize.width,
      position: 'relative',
      border: SHOW_ROOT_RESIZE_HANDLE ? '2px solid #1976d2' : 'none',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden',
      transform: `scale(${finalScale})`,
      transformOrigin: 'top left'
    }}>
      <Box 
        onClick={updateActivity}
        onMouseMove={updateActivity}
        onKeyDown={updateActivity}
        sx={{ width: '100%', height: '100%', position: 'relative', zIndex: 0 }}
      >
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
          layoutBounds={layoutBounds}
          onClearCart={() => setCartItems([])}
          onToggleLayoutLock={() => setIsLayoutLocked((v) => !v)}
        />
      </Box>

      {SHOW_ROOT_RESIZE_HANDLE && (
        <Box
          ref={rootResizeHandleRef}
          component="div"
          onPointerDown={handleRootResizePointerDown}
          onMouseDown={handleRootResizeMouseDown}
          onTouchStart={handleRootResizeTouchStart}
          role="button"
          aria-label="Redimensionner la zone caisse"
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 32,
            height: 32,
          backgroundColor: isRootResizing ? '#2e7d32' : '#1976d2',
            cursor: 'nwse-resize',
            zIndex: 2147483000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            boxShadow: '-2px -2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'auto',
            '&:hover': {
              backgroundColor: isRootResizing ? '#1b5e20' : '#1565c0'
            }
          }}
        >
          ⬌
        </Box>
      )}
    </Box>
  );
};

export default App;