import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Edit as EditIcon, Undo as UndoIcon } from '@mui/icons-material';
import {
  Add,
  Remove,
  ImportExport,
  Search,
  NavigateBefore,
  NavigateNext,
} from '@mui/icons-material';
import { Product, Category, CartItem, ProductVariation, Transaction } from '../types/Product';
import { saveProductionData } from '../data/productionData';
import VariationModal from './VariationModal';
import RecapModal from './RecapModal';
import TransactionHistory from './TransactionHistory';
import { StorageService } from '../services/StorageService';
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

interface WindowManagerProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  isLayoutLocked: boolean;
  onProductClick: (product: Product) => void;
  onProductWithVariationClick: (product: Product, variation: ProductVariation) => void;
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  onCheckout: () => void;
  onImportComplete: (products: Product[], categories: Category[]) => void;
  onProductsReorder?: (newProducts: Product[]) => void;
  onUpdateCategories?: (newCategories: Category[]) => void;
}

const WindowManager: React.FC<WindowManagerProps> = ({
  products,
  categories,
  cartItems,
  isLayoutLocked,
  onProductClick,
  onProductWithVariationClick,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onImportComplete,
  onProductsReorder,
  onUpdateCategories,
}) => {
  // Dimensions pour l'émulation 1920×1080
  const APP_BAR_HEIGHT = 64;

  // Facteur d'échelle global pour réduire l'ensemble du programme de 10%
  const GLOBAL_SCALE_FACTOR = 0.9;

  // Fonction helper pour appliquer le facteur d'échelle
  // Garder des décimales pour éviter de tomber à 0rem
  const applyScale = (value: number) => Number((value * GLOBAL_SCALE_FACTOR).toFixed(2));

  // Fonction helper pour calculer la taille de police adaptée
  const getScaledFontSize = (baseSize: string) => {
    const numericSize = parseFloat(baseSize);
    const unit = baseSize.replace(/[\d.]/g, '');
    const scaled = applyScale(numericSize);
    // Assure une taille minimale visible
    const safe = Math.max(scaled, 0.7);
    return `${safe}${unit || 'rem'}`;
  };

  // États pour la modale de déclinaisons
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // État pour la modale récapitulative
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<CartItem | null>(null);
  const [itemDiscounts, setItemDiscounts] = useState<{[key: string]: {type: 'euro' | 'percent' | 'price', value: number}}>({});
  const [globalDiscount, setGlobalDiscount] = useState<{type: 'euro' | 'percent', value: number} | null>(null);
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showProductEditModal, setShowProductEditModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showEditModeNotification, setShowEditModeNotification] = useState(false);
  const [showSubcategoryManagementModal, setShowSubcategoryManagementModal] = useState(false);
  
  // États pour les notifications de paiement
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [todayTransactions, setTodayTransactions] = useState(() => StorageService.loadTodayTransactions());
  const [showSalesRecap, setShowSalesRecap] = useState(false);
  const [showTicketEditor, setShowTicketEditor] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketDraft, setSelectedTicketDraft] = useState<Transaction | null>(null);
  const [showPaymentRecap, setShowPaymentRecap] = useState(false);
  const [paymentRecapMethod, setPaymentRecapMethod] = useState<'cash' | 'card' | 'sumup' | 'all'>('cash');
  const [paymentRecapSort, setPaymentRecapSort] = useState<'amount' | 'name' | 'qty' | 'category' | 'subcategory'>('amount');
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [showClosures, setShowClosures] = useState(false);
  const [closures, setClosures] = useState<any[]>([]);
  const [selectedClosureIdx, setSelectedClosureIdx] = useState<number | null>(null);
  // Filtres pour la modale tickets jour
  const [filterPayment, setFilterPayment] = useState<'all' | 'cash' | 'card' | 'sumup'>('all');
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');
  const [filterAmountExact, setFilterAmountExact] = useState<string>('');
  const [filterProductText, setFilterProductText] = useState<string>('');
  const [productSortMode, setProductSortMode] = useState<'sales' | 'name'>('sales');

  // Compteur quotidien par produit (toutes variations confondues)
  const dailyQtyByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of todayTransactions) {
      const items = Array.isArray(tx.items) ? tx.items : [];
      for (const it of items) {
        const pid = it.product.id;
        map[pid] = (map[pid] || 0) + (it.quantity || 0);
      }
    }
    return map;
  }, [todayTransactions]);

  const computeDailyProductSales = (transactions: Transaction[]) => {
    const byProduct: Record<string, { product: Product; totalQty: number; totalAmount: number }> = {};
    for (const tx of transactions) {
      for (const item of tx.items) {
        const key = item.product.id;
        const lineAmount = (item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice) * item.quantity;
        if (!byProduct[key]) {
          byProduct[key] = { product: item.product, totalQty: 0, totalAmount: 0 };
        }
        byProduct[key].totalQty += item.quantity;
        byProduct[key].totalAmount += lineAmount;
      }
    }
    return Object.values(byProduct).sort((a, b) => b.totalQty - a.totalQty);
  };
  
  const computePaymentTotalsFromTransactions = (transactions: Transaction[]) => {
    let cash = 0, card = 0, sumup = 0;
    for (const tx of transactions) {
      const method = String((tx as any).paymentMethod || '').toLowerCase();
      if (method === 'cash' || method.includes('esp')) cash += tx.total;
      else if (method === 'card' || method.includes('carte')) card += tx.total;
      else if (method === 'sumup') sumup += tx.total;
    }
    return { 'Espèces': cash, 'SumUp': sumup, 'Carte': card } as typeof paymentTotals;
  };
  
  // États pour les totaux par méthode de paiement
  const [paymentTotals, setPaymentTotals] = useState({
    'Espèces': 0,
    'SumUp': 0,
    'Carte': 0
  });

  useEffect(() => {
    setPaymentTotals(computePaymentTotalsFromTransactions(todayTransactions));
  }, [todayTransactions]);

  // Si le ticket sélectionné n'existe plus (ex.: vidage), réinitialiser la sélection
  useEffect(() => {
    if (!selectedTicketId) return;
    const exists = todayTransactions.some(t => t.id === selectedTicketId);
    if (!exists) setSelectedTicketId(null);
  }, [todayTransactions, selectedTicketId]);
  
  // États pour l'import CSV
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  
  // Force le re-rendu quand les catégories changent
  const [categoriesVersion, setCategoriesVersion] = useState(0);
  useEffect(() => {
    setCategoriesVersion(prev => prev + 1);
    console.log('🔄 Version des catégories mise à jour:', categoriesVersion + 1);
  }, [categories]);



  const [windows, setWindows] = useState<Window[]>([
                   {
        id: 'products',
        title: 'Grille Produits',
        type: 'products',
        x: applyScale(20), // Même x que la fenêtre catégories
        y: applyScale(241), // Position pour toucher les fenêtres 5 et 6 avec gap de 1px
        width: 722, // Largeur exacte observée par l'utilisateur
        height: 466, // Hauteur exacte observée par l'utilisateur
        isMinimized: false,
        isMaximized: false,
        zIndex: 1,
      },
                          {
         id: 'cart',
         title: 'Panier & Ticket',
         type: 'cart',
         x: applyScale(832.33), // Position avec espacement de 10px (20 + 802.33 + 10)
         y: applyScale(20), // Remonté de 60px (80 - 60 = 20)
         width: applyScale(540), // Élargi d'un tiers (405 * 1.33 = 540)
         height: applyScale(600), // Hauteur exacte mesurée
         isMinimized: false,
         isMaximized: false,
         zIndex: 2,
       },
                                                                                                                                                                       {
          id: 'categories',
          title: 'Catégories',
          type: 'categories',
          x: applyScale(20), // Position personnalisée - coin haut gauche de l'espace fenêtre
          y: applyScale(20), // Remonté de 60px (80 - 60 = 20)
          width: applyScale(802.33), // Largeur exacte mesurée
          height: applyScale(220), // Hauteur étendue jusqu'à la grille de la fenêtre 1
          isMinimized: false,
          isMaximized: false,
          zIndex: 3,
        },
                          {
         id: 'search',
         title: 'Modes de Règlement',
         type: 'search',
         x: applyScale(832.33), // Même x que la fenêtre ticket
         y: applyScale(620), // Collée à la fenêtre 2 (20 + 600 = 620)
         width: applyScale(540), // Même largeur que le ticket élargi
         height: applyScale(217.33), // Étirée pour se rapprocher de la fenêtre 7
         isMinimized: false,
         isMaximized: false,
         zIndex: 4,
       },
                  {
         id: 'window5',
         title: 'Fonction',
         type: 'settings',
         x: applyScale(20), // À gauche
         y: applyScale(760), // Remonté de 60px (820 - 60 = 760)
         width: applyScale(401.3), // Largeur exacte mesurée
         height: applyScale(189.33), // Hauteur exacte mesurée
         isMinimized: false,
         isMaximized: false,
         zIndex: 5,
       },
             {
         id: 'window6',
         title: 'Fenêtre Libre 2',
         type: 'free',
         x: applyScale(431.3), // À côté de la première avec espacement (20 + 401.3 + 10)
         y: applyScale(760), // Remonté de 60px (820 - 60 = 760)
         width: applyScale(388.63), // Largeur ajustée par l'utilisateur
         height: applyScale(190.66), // Hauteur ajustée par l'utilisateur
         isMinimized: false,
         isMaximized: false,
         zIndex: 6,
       },
               {
          id: 'window7',
          title: 'Fonction Stat',
          type: 'stats',
          x: applyScale(832.33), // Même x que la fenêtre Modes de Règlement
          y: applyScale(837.33), // Remonté de 60px (897.33 - 60 = 837.33)
          width: applyScale(540), // Même largeur que les fenêtres au-dessus
          height: applyScale(113), // Hauteur ajustée par l'utilisateur
          isMinimized: false,
          isMaximized: false,
          zIndex: 7,
        },
    
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [subcategorySearchTerm, setSubcategorySearchTerm] = useState('');
  const [isSaleMode, setIsSaleMode] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  // Réinitialiser la pagination quand la catégorie, sous-catégorie ou la recherche change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchTerm, categorySearchTerm, subcategorySearchTerm]);
  const [draggedWindow, setDraggedWindow] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingWindow, setResizingWindow] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [screenDimensions, setScreenDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  // Système de scaling automatique pour adaptation dynamique
  const [scaleFactor, setScaleFactor] = useState(1);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    console.log('🔄 useEffect: Réinitialisation de la page à 1', {
      selectedCategory,
      selectedSubcategory,
      searchTerm
    });
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchTerm]);

  // Forcer un re-render quand les filtres changent pour éviter les problèmes de cache
  const filterKey = `${selectedCategory}-${selectedSubcategory}-${searchTerm}-${currentPage}`;


  // Système de drag and drop pour réorganiser les produits
  const [draggedProduct, setDraggedProduct] = useState<Product | null>(null);
  const [dragOverProduct, setDragOverProduct] = useState<Product | null>(null);
  const [isDragging, setIsDragging] = useState(false);



  // Calcul du facteur d'échelle optimal
  const calculateScaleFactor = () => {
    // Résolution de référence (écran de développement)
    const referenceWidth = 1920;
    const referenceHeight = 1080;
    
    // Calculer le facteur d'échelle basé sur la plus petite dimension
    const widthScale = window.innerWidth / referenceWidth;
    const heightScale = window.innerHeight / referenceHeight;
    const newScaleFactor = Math.min(widthScale, heightScale, 2.0); // Limiter à 2.0x max
    
    return Math.max(1.0, newScaleFactor); // Minimum 1.0x pour garder la taille normale
  };

  // Détection d'appareil tactile
  const detectTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // Fonctions de drag and drop
  const handleDragStart = (e: React.DragEvent, product: Product) => {
    setDraggedProduct(product);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', product.id);
    
    // Effet visuel pendant le drag
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'rotate(5deg) scale(1.05)';
    }
  };

  const handleDragOver = (e: React.DragEvent, product: Product) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProduct(product);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverProduct(null);
  };

  const handleDrop = (e: React.DragEvent, targetProduct: Product) => {
    e.preventDefault();
    
    if (draggedProduct && draggedProduct.id !== targetProduct.id) {
      // Réorganiser les produits
      const draggedIndex = products.findIndex(p => p.id === draggedProduct.id);
      const targetIndex = products.findIndex(p => p.id === targetProduct.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newProducts = [...products];
        const [removed] = newProducts.splice(draggedIndex, 1);
        newProducts.splice(targetIndex, 0, removed);
        
        // Mettre à jour l'état des produits
        console.log('Réorganisation des produits:', {
          dragged: draggedProduct.name,
          target: targetProduct.name,
          newOrder: newProducts.map(p => p.name)
        });
        
        // Appeler la fonction pour sauvegarder le nouvel ordre
        if (onProductsReorder) {
          onProductsReorder(newProducts);
        }
        
        // Sauvegarder automatiquement dans localStorage
        saveProductionData(newProducts, categories);
      }
    }
    
    // Réinitialiser l'état
    setDraggedProduct(null);
    setDragOverProduct(null);
    setIsDragging(false);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Restaurer l'apparence normale
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = 'none';
    }
    
    setDraggedProduct(null);
    setDragOverProduct(null);
    setIsDragging(false);
  };

  // Fonction de règlement direct
  const handleDirectPayment = (method: string) => {
    if (cartItems.length === 0) {
      alert('Le panier est vide !');
      return;
    }

    // Calculer le total
    const total = cartItems.reduce((sum, item) => {
      const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
      return sum + (price * item.quantity);
    }, 0);

    // Accumuler le total pour cette méthode de paiement
    setPaymentTotals(prev => ({
      ...prev,
      [method]: prev[method as keyof typeof prev] + total
    }));

    // Afficher la notification de succès
    setPaymentMethod(method);
    setShowPaymentSuccess(true);

    // Masquer la notification après 3 secondes
    setTimeout(() => {
      setShowPaymentSuccess(false);
      setPaymentMethod('');
    }, 3000);

    // Construire la transaction et persister
    const tx = {
      id: Date.now().toString(),
      items: cartItems.map(i => ({ ...i })),
      total,
      paymentMethod: method as any,
      cashierName: 'Caissier',
      timestamp: new Date(),
    };
    StorageService.addDailyTransaction(tx as any);
    setTodayTransactions(StorageService.loadTodayTransactions());

    // Mettre à jour les compteurs de ventes et vider le panier
    onCheckout();

    console.log(`Règlement ${method} réussi - Total: ${total.toFixed(2)}€ - Compteurs de ventes mis à jour`);
  };

  // Fonction pour obtenir une couleur basée sur la catégorie
  const getCategoryColor = (categoryId: string) => {
    // D'abord, essayer de trouver la catégorie par ID et utiliser sa couleur personnalisée
    const category = categories.find(cat => cat.id === categoryId);
    if (category && category.color) {
      console.log('🎨 Couleur personnalisée trouvée pour', categoryId, ':', category.color);
      return category.color;
    }
    
    // Si pas de couleur personnalisée, essayer de trouver par nom
    const categoryByName = categories.find(cat => cat.name === categoryId);
    if (categoryByName && categoryByName.color) {
      console.log('🎨 Couleur personnalisée trouvée par nom pour', categoryId, ':', categoryByName.color);
      return categoryByName.color;
    }
    
    // Palette de couleurs vives et contrastées (fallback)
    const colors = [
      '#FF1744', // Rouge vif
      '#2196F3', // Bleu vif
      '#4CAF50', // Vert vif
      '#FF9800', // Orange vif
      '#9C27B0', // Violet vif
      '#00BCD4', // Cyan vif
      '#FF5722', // Rouge-orange vif
      '#3F51B5', // Indigo vif
      '#8BC34A', // Vert lime vif
      '#E91E63', // Rose vif
      '#009688', // Teal vif
      '#FFC107', // Jaune vif
      '#673AB7', // Violet profond
      '#03A9F4', // Bleu ciel vif
      '#FF5722', // Rouge-orange
      '#795548', // Marron vif
      '#607D8B', // Bleu gris vif
      '#FF4081', // Rose magenta
      '#3F51B5', // Indigo
      '#4CAF50', // Vert
      '#FF9800', // Orange
      '#9C27B0', // Violet
      '#00BCD4', // Cyan
      '#FF5722', // Rouge-orange
      '#3F51B5', // Indigo
      '#8BC34A', // Vert lime
      '#E91E63', // Rose
      '#009688', // Teal
      '#FFC107', // Jaune
      '#673AB7', // Violet profond
      '#03A9F4', // Bleu ciel
      '#FF5722', // Rouge-orange
      '#795548', // Marron
      '#607D8B', // Bleu gris
      '#FF4081', // Rose magenta
      '#3F51B5', // Indigo
      '#4CAF50', // Vert
      '#FF9800', // Orange
      '#9C27B0', // Violet
      '#00BCD4', // Cyan
      '#FF5722', // Rouge-orange
      '#3F51B5', // Indigo
      '#8BC34A', // Vert lime
      '#E91E63', // Rose
      '#009688', // Teal
      '#FFC107', // Jaune
      '#673AB7', // Violet profond
      '#03A9F4', // Bleu ciel
      '#FF5722', // Rouge-orange
      '#795548', // Marron
      '#607D8B', // Bleu gris
      '#FF4081'  // Rose magenta
    ];
    
    // Générer une couleur basée sur le hash de la catégorie pour être cohérent
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
      hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    
    return colors[index];
  };

  const CARDS_PER_PAGE = 25; // 5×5 produits au lieu de 5×6
  
  // Debug: Afficher les informations de filtrage
  console.log('🔍 Debug Filtrage:', {
    selectedCategory,
    selectedSubcategory,
    searchTerm,
    totalProducts: products.length,
    selectedCategoryName: selectedCategory ? categories.find(cat => cat.id === selectedCategory)?.name : null
  });
  
  // D'abord, dédupliquer les produits par ID pour éviter les doublons
  const uniqueProducts = products.reduce((acc, product) => {
    if (!acc.find(p => p.id === product.id)) {
      acc.push(product);
    }
    return acc;
  }, [] as Product[]);
  
  console.log('🔍 Debug Déduplication:', {
    originalCount: products.length,
    uniqueCount: uniqueProducts.length,
    duplicates: products.length - uniqueProducts.length
  });
  
  const filteredProducts = uniqueProducts.filter(product => {
    // Filtrage par recherche d'article
        const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.ean13.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Si aucune catégorie n'est sélectionnée, afficher tous les produits
    if (!selectedCategory && !selectedSubcategory) {
      return matchesSearch;
    }
    
    // Filtrage par sous-catégorie (priorité sur la catégorie)
    if (selectedSubcategory) {
      const hasSubcategory = product.associatedCategories && 
        Array.isArray(product.associatedCategories) &&
        product.associatedCategories.some(cat => cat.trim() === selectedSubcategory);
      return hasSubcategory && matchesSearch;
    }
    
    // Filtrage par catégorie par défaut
    if (selectedCategory) {
      const category = categories.find(cat => cat.name === product.category);
      const matchesCategory = category && category.id === selectedCategory;
      
      // Debug: Afficher les détails de la comparaison
      if (product.name.includes('tee shirt') || product.name.includes('vetement')) {
        console.log('🔍 Debug Produit:', {
          productName: product.name,
          productCategory: product.category,
          selectedCategory,
          categoryFound: category,
          categoryId: category?.id,
          matchesCategory
        });
      }
      
      return matchesCategory && matchesSearch;
    }
    
    return matchesSearch;
  });
  
  console.log('🔍 Debug Résultat:', {
    filteredCount: filteredProducts.length,
    firstFewProducts: filteredProducts.slice(0, 3).map(p => ({ name: p.name, category: p.category }))
  });

  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  
  // Tri: articles les plus vendus aujourd'hui en premier (toutes variations confondues)
  const sortedAndFilteredProducts = [...filteredProducts].sort((a, b) => {
    if (productSortMode === 'sales') {
      const qa = dailyQtyByProduct[a.id] || 0;
      const qb = dailyQtyByProduct[b.id] || 0;
      if (qa !== qb) return qb - qa;
    } else if (productSortMode === 'name') {
      if (a.name !== b.name) return a.name.localeCompare(b.name); // A->Z
    }
    // Fallback stable
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.id.localeCompare(b.id);
  });
  
  const currentProducts = sortedAndFilteredProducts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredProducts.length / CARDS_PER_PAGE);
  
  // Debug: Vérifier les produits actuels
  console.log('🔍 Debug CurrentProducts:', {
    startIndex,
    endIndex,
    currentProductsCount: currentProducts.length,
    currentProducts: currentProducts.map(p => ({ name: p.name, category: p.category }))
  });

  const bringToFront = (windowId: string) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      zIndex: w.id === windowId ? Math.max(...prev.map(w => w.zIndex)) + 1 : w.zIndex
    })));
  };

  const handleMouseDown = (e: React.MouseEvent, windowId: string) => {
    if (isLayoutLocked) return; // Désactive le déplacement si verrouillé
    
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggedWindow(windowId);
    bringToFront(windowId);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedWindow) {
      setWindows(prev => prev.map(w => {
        if (w.id === draggedWindow) {
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
                     // Utiliser les dimensions réelles de l'écran pour plus de flexibilité
           return {
             ...w,
             x: Math.max(0, Math.min(screenDimensions.width - w.width, newX)),
             y: Math.max(0, Math.min(screenDimensions.height - APP_BAR_HEIGHT - w.height, newY))
           };
        }
        return w;
      }));
    } else if (resizingWindow) {
      setWindows(prev => prev.map(w => {
        if (w.id === resizingWindow) {
          const deltaX = e.clientX - resizeStart.x;
          const deltaY = e.clientY - resizeStart.y;
          
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          let newX = w.x;
          let newY = w.y;

          // Limites minimales
          const MIN_WIDTH = 200;
          const MIN_HEIGHT = 100;

                     if (resizeDirection.includes('e')) {
             newWidth = Math.max(MIN_WIDTH, Math.min(screenDimensions.width - w.x, resizeStart.width + deltaX));
           }
           if (resizeDirection.includes('w')) {
             const maxWidth = w.x + resizeStart.width;
             const newW = Math.max(MIN_WIDTH, Math.min(maxWidth, resizeStart.width - deltaX));
             newX = w.x + (resizeStart.width - newW);
             newWidth = newW;
           }
           if (resizeDirection.includes('s')) {
             newHeight = Math.max(MIN_HEIGHT, Math.min(screenDimensions.height - APP_BAR_HEIGHT - w.y, resizeStart.height + deltaY));
           }
           if (resizeDirection.includes('n')) {
             const maxHeight = w.y + resizeStart.height;
             const newH = Math.max(MIN_HEIGHT, Math.min(maxHeight, resizeStart.height - deltaY));
             newY = w.y + (resizeStart.height - newH);
             newHeight = newH;
           }

           // S'assurer que la fenêtre reste dans les limites de l'écran réel
           const finalX = Math.max(0, Math.min(screenDimensions.width - newWidth, newX));
           const finalY = Math.max(0, Math.min(screenDimensions.height - APP_BAR_HEIGHT - newHeight, newY));

          return {
            ...w,
            x: finalX,
            y: finalY,
            width: newWidth,
            height: newHeight
          };
        }
        return w;
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggedWindow(null);
    setResizingWindow(null);
    setResizeDirection('');
  };

  const handleResizeStart = (e: React.MouseEvent, windowId: string, direction: string) => {
    if (isLayoutLocked) return; // Désactive le redimensionnement si verrouillé
    
    e.stopPropagation();
    const window = windows.find(w => w.id === windowId);
    if (!window) return;

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: window.width,
      height: window.height
    });
    setResizingWindow(windowId);
    setResizeDirection(direction);
    bringToFront(windowId);
  };

  useEffect(() => {
    if (draggedWindow || resizingWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedWindow, dragOffset, resizingWindow, resizeDirection, resizeStart]);

  // Mettre à jour les dimensions de l'écran quand la fenêtre change de taille
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      setScreenDimensions(newDimensions);
      
      // Recalculer le facteur d'échelle
      const newScaleFactor = calculateScaleFactor();
      setScaleFactor(newScaleFactor);
      
      // Détecter l'appareil tactile
  
      
      console.log(`Écran: ${newDimensions.width}x${newDimensions.height}, Scale: ${newScaleFactor.toFixed(2)}, Touch: ${detectTouchDevice()}`);
    };

    // Initialisation
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  // Fonction pour gérer le scan de code-barre
  const handleBarcodeScan = (barcode: string) => {
    console.log(`🔍 Scan détecté: ${barcode}`);
    console.log(`📦 Nombre de produits disponibles: ${products.length}`);
    
    const scannedProduct = products.find(product => 
      product.ean13 === barcode || 
      product.reference === barcode
    );
    
    if (scannedProduct) {
      console.log(`✅ Produit trouvé: ${scannedProduct.name}`);
      console.log(`💰 Prix: ${scannedProduct.finalPrice}€`);
      console.log(`📋 Déclinaisons: ${scannedProduct.variations ? scannedProduct.variations.length : 0}`);
      
      if (scannedProduct.variations && scannedProduct.variations.length > 0) {
        console.log(`🔄 Ouverture modale déclinaisons...`);
        // Ouvrir la modale de déclinaisons
        setSelectedProduct(scannedProduct);
        setVariationModalOpen(true);
      } else {
        console.log(`🛒 Ajout direct au panier...`);
        // Ajouter directement au panier
        onProductClick(scannedProduct);
        console.log(`✅ Produit ajouté au panier!`);
      }
    } else {
      console.log(`❌ Produit non trouvé: ${barcode}`);
      console.log(`🔍 Recherche dans les produits...`);
      products.forEach((product, index) => {
        if (index < 5) { // Afficher les 5 premiers pour debug
          console.log(`  ${index}: ${product.name} - EAN: ${product.ean13}`);
        }
      });
      // Afficher dans la recherche pour debug
      setSearchTerm(barcode);
    }
  };

  // Fonctions de gestion des déclinaisons
  const handleProductClick = (product: Product) => {
    if (product.variations.length > 0) {
      // Ouvrir la modale de déclinaisons
      setSelectedProduct(product);
      setVariationModalOpen(true);
    } else {
      // Ajouter directement au panier
      onProductClick(product);
    }
  };

  const handleVariationSelect = (variation: ProductVariation) => {
    console.log(`🔄 Sélection déclinaison: ${variation.attributes}`);
    console.log(`📦 Produit: ${selectedProduct?.name}`);
    console.log(`💰 Prix déclinaison: ${variation.finalPrice}€`);
    
    if (selectedProduct) {
      onProductWithVariationClick(selectedProduct, variation);
      console.log(`✅ Produit avec déclinaison ajouté au panier!`);
      
      // Fermer la modale après ajout
      setVariationModalOpen(false);
      setSelectedProduct(null);
    } else {
      console.log(`❌ Erreur: selectedProduct est null`);
    }
  };

  const openDiscountModal = (item: CartItem) => {
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
  };

  const openGlobalDiscountModal = () => {
    setShowGlobalDiscountModal(true);
  };

  const applyGlobalDiscount = (discountType: 'euro' | 'percent', value: number) => {
    setGlobalDiscount({ type: discountType, value });
  };

  const applyItemDiscount = (itemId: string, variationId: string | null, discountType: 'euro' | 'percent' | 'price', value: number) => {
    const discountKey = `${itemId}-${variationId || 'main'}`;
    setItemDiscounts(prev => ({
      ...prev,
      [discountKey]: { type: discountType, value }
    }));
  };

  const handleUpdateCategories = (newCategories: Category[]) => {
    // Mettre à jour les catégories dans le composant parent
    console.log('🔄 Mise à jour des catégories:', newCategories.length, 'catégories');
    if (onUpdateCategories) {
      onUpdateCategories(newCategories);
    } else {
      console.log('Nouvelles catégories:', newCategories);
      alert(`Catégories mises à jour: ${newCategories.length} catégories`);
    }
    
    // Sauvegarder automatiquement dans localStorage
    saveProductionData(products, newCategories);
    
    console.log('✅ Catégories sauvegardées avec succès');
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    // Mettre à jour le produit dans la liste
    const updatedProducts = products.map(p => 
      p.id === updatedProduct.id ? updatedProduct : p
    );
    
    if (onProductsReorder) {
      onProductsReorder(updatedProducts);
    }
    
    // Sauvegarder automatiquement dans localStorage
    saveProductionData(updatedProducts, categories);
    
    console.log('✅ Article modifié et sauvegardé avec succès:', updatedProduct.name);
  };

  const handleDeleteProduct = (productId: string) => {
    // Supprimer le produit de la liste
    const updatedProducts = products.filter(p => p.id !== productId);
    
    if (onProductsReorder) {
      onProductsReorder(updatedProducts);
    }
    
    // Sauvegarder automatiquement dans localStorage
    saveProductionData(updatedProducts, categories);
    
    console.log('🗑️ Article supprimé et sauvegardé avec succès');
  };

  const handleUpdateSubcategories = (categoryId: string, newSubcategories: string[]) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Mettre à jour les produits qui appartiennent à cette catégorie
    const updatedProducts = products.map(product => {
      if (product.category === category.name) {
        return {
          ...product,
          associatedCategories: newSubcategories
        };
      }
      return product;
    });

    if (onProductsReorder) {
      onProductsReorder(updatedProducts);
    }

    // Sauvegarder automatiquement dans localStorage
    saveProductionData(updatedProducts, categories);

    console.log(`✅ Sous-catégories mises à jour pour ${category.name}:`, newSubcategories);
  };

  // Fonction pour importer un fichier CSV
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('importing');
    setImportMessage('Import en cours...');

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Fichier CSV invalide - pas assez de lignes');
      }

      // Analyser les en-têtes
      const headers = lines[0].split('\t').map(h => h.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, ''));
      
      // Mapping des colonnes
      const mapping = {
        id: headers.findIndex(h => h.includes('Identifiant produit')),
        name: headers.findIndex(h => h.includes('Nom')),
        category: headers.findIndex(h => h.includes('catégorie par défaut')),
        associatedCategories: headers.findIndex(h => h.includes('catégories associées')),
        finalPrice: headers.findIndex(h => h.includes('Prix de vente TTC final')),
        ean13: headers.findIndex(h => h.includes('ean13')),
        reference: headers.findIndex(h => h.includes('Référence')),
        wholesalePrice: headers.findIndex(h => h.includes('Prix de vente HT')),
        stock: headers.findIndex(h => h.includes('Quantité disponible'))
      };

      // Vérifier les colonnes obligatoires
      if (mapping.id === -1 || mapping.name === -1 || mapping.category === -1) {
        throw new Error('Colonnes obligatoires manquantes dans le CSV');
      }

      const newProducts: Product[] = [];
      const categoriesSet = new Set<string>();
      const associatedCategoriesSet = new Set<string>();

      // Traiter chaque ligne
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        if (values.length < Math.max(...Object.values(mapping).filter(v => v !== -1)) + 1) continue;

        try {
          const id = (values[mapping.id] || `prod_${i}`).replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          const name = (values[mapping.name] || 'Produit sans nom').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          const category = (values[mapping.category] || 'Général').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          const finalPrice = parseFloat(values[mapping.finalPrice]) || 0;
          const ean13 = (values[mapping.ean13] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          const reference = (values[mapping.reference] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
          // Traiter les catégories associées
          const associatedCategoriesStr = (values[mapping.associatedCategories] || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          const associatedCategories = associatedCategoriesStr
            .split(',')
            .map(cat => cat.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, ''))
            .filter(cat => cat && cat.length > 0);

          const wholesalePrice = mapping.wholesalePrice !== -1 ? 
            parseFloat(values[mapping.wholesalePrice]) || finalPrice * 0.8 : 
            finalPrice * 0.8;

          // Nettoyer les données
          const cleanName = name.replace(/[^\w\s\-\.]/g, '').trim();
          const cleanCategory = category.replace(/[^\w\s\-\.]/g, '').trim();
          const cleanAssociatedCategories = associatedCategories
            .map(cat => cat.replace(/[^\w\s\-\.]/g, '').trim())
            .filter(cat => cat && cat.length > 0);

          if (cleanName && cleanName !== 'Produit sans nom') {
            const product: Product = {
              id,
              name: cleanName,
              reference,
              ean13,
              category: cleanCategory,
              associatedCategories: cleanAssociatedCategories,
              wholesalePrice,
              finalPrice,
              crossedPrice: finalPrice,
              salesCount: 0,
              position: 0,
              remisable: true,
              variations: []
            };

            newProducts.push(product);
            categoriesSet.add(cleanCategory);
            cleanAssociatedCategories.forEach(cat => associatedCategoriesSet.add(cat));
          }
        } catch (error) {
          console.error(`Erreur ligne ${i}:`, error);
        }
      }

      // Créer les nouvelles catégories
      const newCategories: Category[] = Array.from(categoriesSet).map((catName, index) => ({
        id: `cat_${index + 1}`,
        name: catName,
        color: getRandomColor(),
        productOrder: []
      }));

      // Appeler la fonction de callback pour mettre à jour les données
      onImportComplete(newProducts, newCategories);

      setImportStatus('success');
      setImportMessage(`Import réussi : ${newProducts.length} produits, ${newCategories.length} catégories, ${associatedCategoriesSet.size} sous-catégories`);

      // Réinitialiser le statut après 3 secondes
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 3000);

    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setImportStatus('error');
      setImportMessage(`Erreur d'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      // Réinitialiser le statut après 5 secondes
      setTimeout(() => {
        setImportStatus('idle');
        setImportMessage('');
      }, 5000);
    }

    // Réinitialiser l'input file
    event.target.value = '';
  };

  // Fonction utilitaire pour les couleurs
  const getRandomColor = () => {
    const colors = [
      '#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2',
      '#303f9f', '#c2185b', '#5d4037', '#455a64', '#ff6f00'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getItemFinalPrice = (item: CartItem) => {
    const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
    const discount = itemDiscounts[discountKey];

    if (!discount) return originalPrice;

    switch (discount.type) {
      case 'euro':
        return Math.max(0, originalPrice - discount.value);
      case 'percent':
        return originalPrice * (1 - discount.value / 100);
      case 'price':
        return discount.value;
      default:
        return originalPrice;
    }
  };

  const getTotalWithGlobalDiscount = () => {
    // Calculer le sous-total (prix originaux)
    const subtotal = cartItems.reduce((sum, item) => {
      const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
      return sum + (originalPrice * item.quantity);
    }, 0);

    // Calculer les remises individuelles
    const individualDiscounts = cartItems.reduce((sum, item) => {
      const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
      const originalTotal = originalPrice * item.quantity;
      const finalPrice = getItemFinalPrice(item);
      const finalTotal = finalPrice * item.quantity;
      
      return sum + (originalTotal - finalTotal);
    }, 0);

    // Calculer la remise globale
    let globalDiscountAmount = 0;
    if (globalDiscount) {
      // Total des produits sans remise individuelle
      const totalWithoutIndividualDiscount = cartItems.reduce((sum, item) => {
        const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
        const hasIndividualDiscount = itemDiscounts[discountKey];
        
        if (!hasIndividualDiscount) {
          const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
          return sum + (originalPrice * item.quantity);
        }
        return sum;
      }, 0);

      // Appliquer la remise globale sur le total
      if (globalDiscount.type === 'euro') {
        globalDiscountAmount = Math.min(totalWithoutIndividualDiscount, globalDiscount.value);
      } else {
        globalDiscountAmount = totalWithoutIndividualDiscount * (globalDiscount.value / 100);
      }
    }

    const totalDiscounts = individualDiscounts + globalDiscountAmount;
    
    // Total final = Sous-total - Total des remises
    return subtotal - totalDiscounts;
  };



  const renderResizeHandles = (window: Window) => {
    // Poignées de redimensionnement temporairement désactivées pour libérer de l'espace
    return null;
  };

  const renderWindowContent = (window: Window) => {
    if (window.isMinimized) {
      return (
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption">{window.title}</Typography>
        </Box>
      );
    }

    switch (window.type) {
      case 'products':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            

            
                         {/* Grille produits */}
            {/* Calculer les dimensions dynamiques des cartes pour occuper le maximum d'espace */}
            {(() => {
              const windowWidth = window.width;
              const windowHeight = window.height;
              const headerHeight = 82;
              
              // Calculer les dimensions disponibles pour la grille selon votre logique exacte
              // Fenêtre 1 fait 722x466 (déjà réduite de 10%)
              // 4 gaps de 1px = 4, 2 gaps de chaque extrémité = 2, total gaps = 6
              // 5 bordures de 1px = 5, total bordures = 5
              // Total à soustraire = 6 + 5 = 11
              // Largeur disponible = 722 - 11 = 711
              // Largeur par carte = 711 / 5 = 142.2
              
              const totalGapsWidth = 6; // 4 gaps entre colonnes + 2 gaps aux extrémités
              const totalBordersWidth = 5; // 5 cartes × 1px de bordure chacune
              const totalWidthToSubtract = totalGapsWidth + totalBordersWidth; // 11px
              
              const totalGapsHeight = 6; // 4 gaps entre lignes + 2 gaps aux extrémités
              const totalBordersHeight = 5; // 5 cartes × 1px de bordure chacune
              const totalHeightToSubtract = totalGapsHeight + totalBordersHeight; // 11px
              
              const availableWidth = windowWidth - totalWidthToSubtract;
              const availableHeight = windowHeight - headerHeight - totalHeightToSubtract;
              
              const cardWidth = Math.floor(availableWidth / 5);
              // Calcul optimisé pour utiliser au maximum l'espace vertical disponible
              // Fenêtre: 466px de hauteur totale
              // Header: 82px
              // Hauteur disponible pour la grille: 466 - 82 = 384px
              // Pour 5 cartes de 91px: 5 × 91 = 455px
              // Gaps et bordures: 6 + 5 = 11px
              // Total nécessaire: 455 + 11 = 466px (parfait!)
              // Donc on peut avoir exactement 91px par carte
              const cardHeight = 91;
              
              // Logs de débogage pour vérifier les calculs
              console.log('🔍 DEBUG - Calculs des cartes:', {
                windowWidth,
                windowHeight,
                headerHeight,
                totalWidthToSubtract,
                totalHeightToSubtract,
                availableWidth,
                availableHeight,
                cardWidth,
                cardHeight,
                expectedCardWidth: 142,
                expectedCardHeight: 91,
                totalHeightNeeded: cardHeight * 5 + totalHeightToSubtract
              });
              
            return (
              <Box 
                  key={filterKey}
                  sx={{ 
                    flexGrow: 1, 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(5, ${cardWidth}px)`,
                    gridTemplateRows: `repeat(5, ${cardHeight}px)`,
                    gap: '1px',
                    p: '1px',
                    overflow: 'hidden',
                    minHeight: 0,
                    width: '100%',
                    height: '466px', // Hauteur fixe pour utiliser toute la hauteur de la fenêtre
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                  }}>
                  {/* Barre d'outils tri */}
                  <Box sx={{ gridColumn: '1 / -1', mb: 0.5, display: 'flex', gap: 0.5 }}>
                    <Button size="small" variant={productSortMode==='sales'?'contained':'outlined'} onClick={() => setProductSortMode('sales')}>Tri ventes</Button>
                    <Button size="small" variant={productSortMode==='name'?'contained':'outlined'} onClick={() => setProductSortMode('name')}>Tri nom</Button>
                  </Box>

                  {/* Rendu de la grille 5x5 avec navigation intégrée */}
                  {Array.from({ length: 25 }, (_, index) => {
                    // Calculer un facteur d'échelle adapté aux dimensions des cartes
                    const cardScaleFactor = Math.min(cardWidth / 150, cardHeight / 120); // Basé sur les dimensions originales
                 const position = index + 1;
                 
                 // Positions des boutons de navigation - TOUJOURS fixes
                 const isPrevButton = position === 21;
                 const isNextButton = position === 25;
                 
                 // Rendu des boutons de navigation - TOUJOURS aux mêmes positions
                 if (isPrevButton) {
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
                         flexDirection: 'column',
                         justifyContent: 'center',
                         alignItems: 'center',
                         backgroundColor: currentPage === 1 ? '#ccc' : '#2196f3',
                         color: 'white',
                         borderRadius: '8px',
                         position: 'relative',
                         minWidth: `${cardWidth}px`,
                         minHeight: `${cardHeight}px`,
                         maxWidth: `${cardWidth}px`,
                         maxHeight: `${cardHeight}px`,
                         boxSizing: 'border-box',
                         p: '2px',
                         border: '1px solid #ccc',
                         boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                         flexShrink: 0,
                         flexGrow: 0,
                         overflow: 'hidden',

                         '&:hover': {
                           backgroundColor: currentPage === 1 ? '#ccc' : '#1976d2'
                         },
                         '&:disabled': {
                           backgroundColor: '#ccc',
                           color: '#666',
                           transform: 'none',
                           boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                         }
                       }}
                     >
                       <NavigateBefore sx={{ fontSize: '2rem', mb: 1 }} />
                       <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                         Précédent
                       </Typography>
                     </Button>
                   );
                 }
                 
                 if (isNextButton) {
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
                         flexDirection: 'column',
                         justifyContent: 'center',
                         alignItems: 'center',
                         backgroundColor: currentPage === totalPages ? '#ccc' : '#2196f3',
                         color: 'white',
                         borderRadius: '8px',
                         position: 'relative',
                         minWidth: `${cardWidth}px`,
                         minHeight: `${cardHeight}px`,
                         maxWidth: `${cardWidth}px`,
                         maxHeight: `${cardHeight}px`,
                         boxSizing: 'border-box',
                         p: '2px',
                         border: '1px solid #ccc',
                         boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                         flexShrink: 0,
                         flexGrow: 0,
                         overflow: 'hidden',

                         '&:hover': {
                           backgroundColor: currentPage === totalPages ? '#ccc' : '#1976d2'
                         },
                         '&:disabled': {
                           backgroundColor: '#ccc',
                           color: '#666',
                           transform: 'none',
                           boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                         }
                       }}
                     >
                       <NavigateNext sx={{ fontSize: '2rem', mb: 1 }} />
                       <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                         Suivant
                       </Typography>
                     </Button>
                   );
                 }
                 
                                                     // Position du produit dans la grille (en excluant les boutons de navigation)
                  let productIndex = index;
                  if (index > 20) productIndex = index - 1; // Après le bouton précédent
                  if (index > 24) productIndex = index - 2; // Après le bouton suivant
                  
                  // Vérification supplémentaire : ne jamais afficher de produit aux positions des boutons
                  if (position === 21 || position === 25) {
                    return null; // Cette position est réservée aux boutons
                  }
                  
                  const product = currentProducts[productIndex];
                 
                 // Si pas de produit pour cette position, afficher une case vide (sauf aux positions des boutons)
                 if (!product) {
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
                         overflow: 'hidden'
                       }}
                     />
                   );
                 }
                 
                                   // Rendu normal du produit
                  const categoryColor = getCategoryColor(product.category);
                  
                  return (
                                         <Paper
                       key={product.id}
                       draggable
                       sx={{
                         width: `${cardWidth}px`,
                         height: `${cardHeight}px`,
                         p: '2px',
                         cursor: 'grab',
                         transition: 'all 0.2s',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'space-between',
                         minHeight: 0,
                         background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}80 30%, ${categoryColor}40 70%, white 100%)`,
                         border: `1px solid ${categoryColor}`,
                         borderRadius: `8px`,
                         boxShadow: `0 1px 2px rgba(0,0,0,0.1)`,
                         color: '#2c3e50',
                         fontWeight: '600',
                         boxSizing: 'border-box',

                       ...(dragOverProduct?.id === product.id && {
                         transform: 'scale(1.05)',
                         boxShadow: `0 ${8 * cardScaleFactor}px ${25 * cardScaleFactor}px rgba(0,0,0,0.3), 0 ${3 * cardScaleFactor}px ${8 * cardScaleFactor}px ${categoryColor}50`,
                         border: `${3 * cardScaleFactor}px solid ${categoryColor}`,
                         background: `linear-gradient(135deg, ${categoryColor}20 0%, ${categoryColor}40 30%, ${categoryColor}20 70%, white 100%)`
                       }),
                       '&:hover': { 
                         transform: 'translateY(-1px)', 
                         boxShadow: `0 3px 6px rgba(0,0,0,0.15)`,
                         background: `linear-gradient(135deg, ${categoryColor} 0%, ${categoryColor}90 25%, ${categoryColor}50 65%, white 100%)`,
                         border: `1px solid ${categoryColor}`,
                         cursor: 'grab'
                       },
                       '&:active': { 
                         transform: 'translateY(0px) scale(0.98)',
                         boxShadow: `0 ${2 * cardScaleFactor}px ${6 * cardScaleFactor}px rgba(0,0,0,0.25), 0 ${1 * cardScaleFactor}px ${2 * cardScaleFactor}px ${categoryColor}30`,
                         background: `linear-gradient(135deg, ${categoryColor}80 0%, ${categoryColor}60 40%, ${categoryColor}30 80%, white 100%)`,
                         cursor: 'grabbing'
                       }
                     }}
                     onDragStart={(e) => handleDragStart(e, product)}
                     onDragOver={(e) => handleDragOver(e, product)}
                     onDragLeave={handleDragLeave}
                     onDrop={(e) => handleDrop(e, product)}
                     onDragEnd={handleDragEnd}
                     onClick={() => {
                       if (isEditMode) {
                         // Mode édition : ouvrir la modale de modification
                         setSelectedProductForEdit(product);
                         setShowProductEditModal(true);
                       } else {
                         // Mode vente : ajouter au panier
                         handleProductClick(product);
                       }
                     }}
                   >
                     <Typography variant="body2" sx={{ 
                       fontWeight: '600', 
                       fontSize: `${Math.max(0.75, 0.85 * cardScaleFactor)}rem`, 
                       lineHeight: 1.2, 
                       flexGrow: 1, 
                       color: '#2c3e50' 
                     }}>
                       {product.name}
                     </Typography>
                     <Typography variant="h6" sx={{ 
                       fontWeight: 'bold', 
                       fontSize: `${Math.max(1, 1.1 * cardScaleFactor)}rem`, 
                       textAlign: 'center', 
                       color: categoryColor, 
                       letterSpacing: `${0.5 * cardScaleFactor}px` 
                     }}>
                       {product.finalPrice.toFixed(2)} €
                     </Typography>
                     <Box sx={{ 
                       display: 'flex', 
                       justifyContent: 'space-between', 
                       mt: 0.25 * cardScaleFactor, 
                       gap: 0.25 * cardScaleFactor 
                     }}>
                                                <Typography 
                           variant="caption" 
                           sx={{ 
                             fontSize: `${Math.max(0.6, 0.7 * cardScaleFactor)}rem`, 
                             color: '#666',
                             fontWeight: '500',
                             alignSelf: 'flex-end'
                           }}
                         >
                          {(dailyQtyByProduct[product.id] || 0)}
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
                              boxShadow: `0 ${1 * cardScaleFactor}px ${3 * cardScaleFactor}px rgba(0,0,0,0.2)` 
                            }} 
                          />
                        )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          );
        })()}
        </Box>
        );

      case 'cart':
        return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>
                TICKET DE CAISSE
              </Typography>
              <Typography variant="caption" align="center" display="block">
                {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR')}
              </Typography>
            </Box>
            
            <List dense sx={{ flexGrow: 1, overflow: 'auto', p: 0.5 }}>
              {cartItems.map((item, index) => {
                const variationId = item.selectedVariation?.id || null;
                const discountKey = `${item.product.id}-${variationId || 'main'}`;
                const discount = itemDiscounts[discountKey];
                const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                const finalPrice = getItemFinalPrice(item);
                const originalTotal = originalPrice * item.quantity;
                const finalTotal = finalPrice * item.quantity;
                
                return (
                  <ListItem 
                    key={`${item.product.id}-${variationId || 'main'}`} 
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 0.5,
                      backgroundColor: '#fafafa'
                    }}
                    onClick={() => openDiscountModal(item)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {item.product.name}
                            {item.selectedVariation && (
                              <Typography 
                                component="span" 
                                variant="body2" 
                                sx={{ 
                                  color: '#2196f3', 
                                  fontWeight: 'normal',
                                  ml: 0.5,
                                  fontStyle: 'italic'
                                }}
                              >
                                ({item.selectedVariation.attributes})
                              </Typography>
                            )}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveItem(item.product.id, variationId);
                            }}
                            sx={{ color: '#f44336', p: 0.5 }}
                          >
                            ✕
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#666', ml: 'auto' }}>
                            {originalPrice.toFixed(2)} €
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(item.product.id, variationId, item.quantity - 1);
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Chip label={item.quantity} size="small" />
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateQuantity(item.product.id, variationId, item.quantity + 1);
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                          
                          {/* Affichage des remises individuelles */}
                          {discount && (() => {
                            const discountAmountPerUnit = originalPrice - finalPrice;
                            const discountAmountTotal = discountAmountPerUnit * item.quantity;
                            const discountPercent = ((discountAmountPerUnit / originalPrice) * 100);

                            return (
                              <Box sx={{
                                display: 'flex',
                                gap: 0.5,
                                ml: 1,
                                alignItems: 'center'
                              }}>
                                <Box sx={{
                                  display: 'flex',
                                  gap: 0.5,
                                  backgroundColor: '#ff9800',
                                  color: 'black',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold'
                                }}>
                                  <span>-{discountAmountTotal.toFixed(2)}€</span>
                                  <span>(-{discountPercent.toFixed(1)}%)</span>
                                </Box>
                                <Box sx={{
                                  backgroundColor: '#000',
                                  color: 'white',
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontSize: '0.9rem',
                                  fontWeight: 'bold',
                                  ml: 1,
                                  textDecoration: 'line-through'
                                }}>
                                  {originalTotal.toFixed(2)} €
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newItemDiscounts = { ...itemDiscounts };
                                    delete newItemDiscounts[discountKey];
                                    setItemDiscounts(newItemDiscounts);
                                  }}
                                  sx={{
                                    color: '#ff0000',
                                    fontSize: '0.8rem',
                                    ml: 0.5,
                                    p: 0.5,
                                    minWidth: 'auto',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 0, 0, 0.1)'
                                    }
                                  }}
                                >
                                  ✕
                                </IconButton>
                              </Box>
                            );
                          })()}
                          
                          {/* Prix total (toujours affiché) */}
                          <Box sx={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            ml: 'auto'
                          }}>
                            {finalTotal.toFixed(2)} €
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
            
            <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
              {/* Sous-total */}
              <Typography variant="body1" sx={{ textAlign: 'right', mb: 0.5 }}>
                Sous-total: {cartItems.reduce((sum, item) => {
                  const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                  return sum + (originalPrice * item.quantity);
                }, 0).toFixed(2)} €
              </Typography>

              {/* Montant total de toutes les remises */}
              {(() => {
                // Calculer les remises individuelles
                const individualDiscounts = cartItems.reduce((sum, item) => {
                  const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                  const originalTotal = originalPrice * item.quantity;
                  const finalPrice = getItemFinalPrice(item);
                  const finalTotal = finalPrice * item.quantity;
                  
                  return sum + (originalTotal - finalTotal);
                }, 0);

                // Calculer la remise globale
                let globalDiscountAmount = 0;
                if (globalDiscount) {
                  // Total des produits sans remise individuelle
                  const totalWithoutIndividualDiscount = cartItems.reduce((sum, item) => {
                    const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
                    const hasIndividualDiscount = itemDiscounts[discountKey];
                    
                    if (!hasIndividualDiscount) {
                      const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                      return sum + (originalPrice * item.quantity);
                    }
                    return sum;
                  }, 0);

                  // Appliquer la remise globale sur le total
                  if (globalDiscount.type === 'euro') {
                    globalDiscountAmount = Math.min(totalWithoutIndividualDiscount, globalDiscount.value);
                  } else {
                    globalDiscountAmount = totalWithoutIndividualDiscount * (globalDiscount.value / 100);
                  }
                }

                const totalDiscounts = individualDiscounts + globalDiscountAmount;
                
                return (
                  <Typography variant="body1" sx={{ textAlign: 'right', mb: 0.5, color: '#f44336', fontWeight: 'bold' }}>
                    Total remises: -{totalDiscounts.toFixed(2)} €
                  </Typography>
                );
              })()}

              {/* Total final */}
              <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'right' }}>
                TOTAL: {getTotalWithGlobalDiscount().toFixed(2)} €
              </Typography>
              
              {/* Boutons du pied de page */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setShowRecapModal(true)}
                  sx={{ 
                    backgroundColor: '#1976d2',
                    flex: 1,
                    fontSize: '0.8rem'
                  }}
                >
                  📋 Recap
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={openGlobalDiscountModal}
                  sx={{ 
                    backgroundColor: '#ff9800',
                    flex: 1,
                    fontSize: '0.8rem'
                  }}
                >
                  💰 Remise
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    // Effacer tous les articles du panier
                    cartItems.forEach(item => {
                      const variationId = item.selectedVariation?.id || null;
                      onRemoveItem(item.product.id, variationId);
                    });
                    // Effacer toutes les remises individuelles
                    setItemDiscounts({});
                    // Effacer la remise globale
                    setGlobalDiscount(null);
                  }}
                  sx={{ 
                    backgroundColor: '#f44336',
                    flex: 1,
                    fontSize: '0.8rem'
                  }}
                >
                  🔄 Reset
                </Button>
              </Box>
            </Box>
          </Box>
        );

             case 'categories':
         return (
           <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                           {/* Ligne 1: Boutons des catégories */}
              <Box sx={{ 
                p: 1,
                borderBottom: 1,
                borderColor: 'divider',
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 1,
                  alignItems: 'flex-start',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: 'none', // Firefox
                  msOverflowStyle: 'none', // IE/Edge
                  '&::-webkit-scrollbar': { // Chrome/Safari
                    display: 'none'
                  },
                  // Support tactile et souris
                  cursor: 'grab',
                  '&:active': {
                    cursor: 'grabbing'
                  },
                  // Amélioration du défilement tactile
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth'
                }}>
                                     <Button
                     variant={selectedCategory === null ? "contained" : "outlined"}
                     onClick={() => {
                       setSelectedCategory(null);
                       setSelectedSubcategory(null);
                     }}
                     sx={{ 
                       textTransform: 'none',
                       whiteSpace: 'nowrap',
                       minWidth: 'fit-content',
                       flexShrink: 0,
                       backgroundColor: selectedCategory === null ? '#2E86AB' : 'transparent',
                       color: selectedCategory === null ? 'white' : '#2E86AB',
                       borderColor: '#2E86AB',
                       '&:hover': {
                         backgroundColor: selectedCategory === null ? '#1B5E7A' : 'rgba(46, 134, 171, 0.1)'
                       }
                     }}
                   >
                     Toutes
                   </Button>
                   {categories
                     .filter(category => 
                       !categorySearchTerm || 
                       category.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                     )
                     .map((category) => {
                     const categoryColor = getCategoryColor(category.id);
                     return (
                       <Button
                         key={category.id}
                         variant={selectedCategory === category.id ? "contained" : "outlined"}
                         onClick={() => {
                           setSelectedCategory(category.id);
                           setSelectedSubcategory(null);
                         }}
                         sx={{ 
                           textTransform: 'none',
                           whiteSpace: 'nowrap',
                           minWidth: 'fit-content',
                           flexShrink: 0,
                           backgroundColor: selectedCategory === category.id ? categoryColor : 'transparent',
                           color: selectedCategory === category.id ? 'white' : categoryColor,
                           borderColor: categoryColor,
                           fontWeight: 'bold',
                           '&:hover': {
                             backgroundColor: selectedCategory === category.id ? 
                               `${categoryColor}dd` : 
                               `${categoryColor}15`,
                             transform: 'translateY(-1px)',
                             boxShadow: `0 2px 8px ${categoryColor}40`
                           },
                           '&:active': {
                             transform: 'scale(0.98)'
                           }
                         }}
                       >
                         {category.name}
                       </Button>
                     );
                   })}
                </Box>
              </Box>
             
                           {/* Ligne 2: Recherches */}
              <Box sx={{ 
                p: 1,
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
                alignItems: 'center'
              }}>
                                 {/* Recherche des articles */}
                 <TextField
                   size="small"
                   placeholder="Rechercher article ou scanner code-barre..."
                   variant="outlined"
                   sx={{ 
                     flex: 1,
                     '& .MuiOutlinedInput-root': {
                       borderColor: '#2196f3',
                       backgroundColor: '#e3f2fd',
                       '&:hover .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#1976d2'
                       },
                       '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#2196f3'
                       },
                       '&:hover': {
                         backgroundColor: '#bbdefb'
                       },
                       '&.Mui-focused': {
                         backgroundColor: '#90caf9'
                       }
                     }
                   }}
                   value={searchTerm}
                   onChange={(e) => {
                     const value = e.target.value;
                     setSearchTerm(value);
                     
                     // Si c'est un code-barre (13 chiffres), utiliser handleBarcodeScan
                     if (value.length === 13 && /^\d{13}$/.test(value)) {
                       handleBarcodeScan(value);
                     }
                   }}
                   InputProps={{
                     startAdornment: <Search sx={{ fontSize: 16, mr: 1, color: '#2196f3' }} />
                   }}
                 />
                 
                 {/* Recherche des catégories */}
                 <TextField
                   size="small"
                   placeholder="Rechercher catégorie..."
                   variant="outlined"
                   value={categorySearchTerm}
                   onChange={(e) => setCategorySearchTerm(e.target.value)}
                   sx={{ 
                     flex: 1,
                     '& .MuiOutlinedInput-root': {
                       borderColor: '#ff9800',
                       backgroundColor: '#fff3e0',
                       '&:hover .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#f57c00'
                       },
                       '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#ff9800'
                       },
                       '&:hover': {
                         backgroundColor: '#ffe0b2'
                       },
                       '&.Mui-focused': {
                         backgroundColor: '#ffcc80'
                       }
                     }
                   }}
                   InputProps={{
                     startAdornment: <Search sx={{ fontSize: 16, mr: 1, color: '#ff9800' }} />
                   }}
                 />
                 
                 {/* Recherche des sous-catégories */}
                 <TextField
                   size="small"
                   placeholder="Rechercher sous-catégorie..."
                   variant="outlined"
                   value={subcategorySearchTerm}
                   onChange={(e) => setSubcategorySearchTerm(e.target.value)}
                   sx={{ 
                     flex: 1,
                     '& .MuiOutlinedInput-root': {
                       borderColor: '#9c27b0',
                       backgroundColor: '#f3e5f5',
                       '&:hover .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#7b1fa2'
                       },
                       '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                         borderColor: '#9c27b0'
                       },
                       '&:hover': {
                         backgroundColor: '#e1bee7'
                       },
                       '&.Mui-focused': {
                         backgroundColor: '#ce93d8'
                       }
                     }
                   }}
                   InputProps={{
                     startAdornment: <Search sx={{ fontSize: 16, mr: 1, color: '#9c27b0' }} />
                   }}
                 />
                 
                 {/* Bouton Reset */}
                  <Button
                   variant="outlined"
                   size="small"
                   onClick={() => {
                     setSearchTerm('');
                     setCategorySearchTerm('');
                     setSubcategorySearchTerm('');
                     setSelectedCategory(null);
                     setSelectedSubcategory(null);
                     setCurrentPage(1);
                     console.log('🔄 Reset des recherches effectué');
                   }}
                   sx={{
                     minWidth: 'auto',
                     px: 1.5,
                     backgroundColor: 'transparent',
                     color: '#666',
                     borderColor: '#666',
                     fontSize: '0.7rem',
                     '&:hover': {
                       backgroundColor: '#f5f5f5',
                       borderColor: '#333',
                       color: '#333'
                     }
                   }}
                 >
                   🔄 Reset
                 </Button>
              </Box>
              
              {/* Onglets des sous-catégories */}
              <Box sx={{ 
                p: 1,
                borderTop: '1px solid #e0e0e0',
                backgroundColor: '#f9f9f9'
              }}>
                <Typography variant="body2" sx={{ 
                  mb: 1, 
                  fontWeight: 'bold', 
                  color: '#9c27b0',
                  fontSize: '0.8rem'
                }}>
                  Sous-catégories :
                </Typography>
                <Box sx={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 0.5,
                  alignItems: 'flex-start',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  '&::-webkit-scrollbar': {
                    display: 'none'
                  },
                  cursor: 'grab',
                  '&:active': {
                    cursor: 'grabbing'
                  },
                  WebkitOverflowScrolling: 'touch',
                  scrollBehavior: 'smooth'
                }}>
                  <Button
                    variant={selectedSubcategory === null ? "contained" : "outlined"}
                    onClick={() => {
                      setSelectedSubcategory(null);
                    }}
                    sx={{ 
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      minWidth: 'fit-content',
                      flexShrink: 0,
                      backgroundColor: selectedSubcategory === null ? '#9c27b0' : 'transparent',
                      color: selectedSubcategory === null ? 'white' : '#9c27b0',
                      borderColor: '#9c27b0',
                      fontSize: '0.7rem',
                      py: 0.5,
                      px: 1,
                      '&:hover': {
                        backgroundColor: selectedSubcategory === null ? '#7b1fa2' : 'rgba(156, 39, 176, 0.1)'
                      }
                    }}
                  >
                    Toutes
                  </Button>
                  {/* Sous-catégories extraites des catégories associées de la catégorie sélectionnée */}
                  {(() => {
                    // Debug: Vérifier les données
                    console.log('Debug - selectedCategory:', selectedCategory);
                    console.log('Debug - total products:', products.length);
                    console.log('Debug - products with associatedCategories:', products.filter(p => p.associatedCategories && p.associatedCategories.length > 0).length);
                    console.log('Debug - sample product with associatedCategories:', products.find(p => p.associatedCategories && p.associatedCategories.length > 0));
                    
                    // Extraire les sous-catégories uniquement des produits de la catégorie sélectionnée
                    const categorySubcategories = new Set<string>();
                    
                    if (selectedCategory) {
                      // Si une catégorie est sélectionnée, filtrer les produits de cette catégorie
                      // selectedCategory contient l'ID de la catégorie, il faut trouver le nom
                      const selectedCategoryObj = categories.find(cat => cat.id === selectedCategory);
                      const selectedCategoryName = selectedCategoryObj ? selectedCategoryObj.name : null;
                      
                      console.log('Debug - selectedCategory ID:', selectedCategory);
                      console.log('Debug - selectedCategory name:', selectedCategoryName);
                      
                      const filteredProducts = selectedCategoryName ? 
                        products.filter(product => product.category === selectedCategoryName) : 
                        [];
                      console.log('Debug - filteredProducts for category:', selectedCategoryName, filteredProducts.length);
                      
                      filteredProducts.forEach(product => {
                        if (product.associatedCategories && Array.isArray(product.associatedCategories)) {
                          product.associatedCategories.forEach(cat => {
                            if (cat && cat.trim()) {
                              categorySubcategories.add(cat.trim());
                            }
                          });
                        }
                      });
                    } else {
                      // Si aucune catégorie n'est sélectionnée, afficher toutes les sous-catégories
                      products.forEach(product => {
                        if (product.associatedCategories && Array.isArray(product.associatedCategories)) {
                          product.associatedCategories.forEach(cat => {
                            if (cat && cat.trim()) {
                              categorySubcategories.add(cat.trim());
                            }
                          });
                        }
                      });
                    }
                    
                    console.log('Debug - categorySubcategories found:', Array.from(categorySubcategories));
                    
                    // Si aucune sous-catégorie n'est trouvée, afficher des exemples temporaires
                    const subcategoriesToShow = Array.from(categorySubcategories).length > 0 ? 
                      Array.from(categorySubcategories) : 
                      ['Sous-catégorie 1', 'Sous-catégorie 2', 'Sous-catégorie 3'];
                    
                    return subcategoriesToShow
                      .filter(subcat => 
                        !subcategorySearchTerm || 
                        subcat.toLowerCase().includes(subcategorySearchTerm.toLowerCase())
                      )
                      .map((subcategory, index) => (
                      <Button
                        key={index}
                        variant={selectedSubcategory === subcategory ? "contained" : "outlined"}
                        onClick={() => {
                          setSelectedSubcategory(subcategory);
                        }}
                        sx={{ 
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          minWidth: 'fit-content',
                          flexShrink: 0,
                          backgroundColor: selectedSubcategory === subcategory ? '#9c27b0' : 'transparent',
                          color: selectedSubcategory === subcategory ? 'white' : '#9c27b0',
                          borderColor: '#9c27b0',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          py: 0.5,
                          px: 1,
                          '&:hover': {
                            backgroundColor: selectedSubcategory === subcategory ? 
                              '#7b1fa2' : 
                              'rgba(156, 39, 176, 0.1)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 2px 8px rgba(156, 39, 176, 0.4)'
                          },
                          '&:active': {
                            transform: 'scale(0.98)'
                          }
                        }}
                      >
                        {subcategory}
                      </Button>
                    ));
                  })()}
                </Box>
              </Box>
           </Box>
         );

             case 'search':
         const totalAmount = cartItems.reduce((sum, item) => {
           const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
           return sum + (price * item.quantity);
         }, 0);
         
         return (
           <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
             <Box sx={{ p: 0.5, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
               {/* Boutons de mode de règlement côte à côte */}
               <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                 {/* Bouton Espèces - 1/3 de la largeur */}
                 <Button
                   variant="contained"
                   sx={{ 
                     flex: 1,
                     py: 1, 
                     fontSize: '1.1rem', 
                     fontWeight: 'bold', 
                     minHeight: '60px',
                     backgroundColor: '#2e7d32',
                     '&:hover': { backgroundColor: '#1b5e20' },
                     '&:disabled': { backgroundColor: '#ccc' },
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     justifyContent: 'center',
                     textAlign: 'center'
                   }}
                   onClick={() => handleDirectPayment('Espèces')}
                   disabled={cartItems.length === 0}
                 >
                   <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     💵 ESPÈCES
                   </Box>
                   <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     {totalAmount.toFixed(2)} €
                   </Box>
                 </Button>
                 
                 {/* Bouton SumUp - 1/3 de la largeur */}
                 <Button
                   variant="contained"
                   sx={{ 
                     flex: 1,
                     py: 1, 
                     fontSize: '1.1rem', 
                     fontWeight: 'bold', 
                     minHeight: '60px',
                     backgroundColor: '#1976d2',
                     '&:hover': { backgroundColor: '#1565c0' },
                     '&:disabled': { backgroundColor: '#ccc' },
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     justifyContent: 'center',
                     textAlign: 'center'
                   }}
                   onClick={() => handleDirectPayment('SumUp')}
                   disabled={cartItems.length === 0}
                 >
                   <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     📱 SumUp
                   </Box>
                   <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     {totalAmount.toFixed(2)} €
                   </Box>
                 </Button>
                 
                 {/* Bouton Carte - 1/3 de la largeur */}
                 <Button
                   variant="contained"
                   sx={{ 
                     flex: 1,
                     py: 1, 
                     fontSize: '1.1rem', 
                     fontWeight: 'bold', 
                     minHeight: '60px',
                     backgroundColor: '#ff9800',
                     '&:hover': { backgroundColor: '#f57c00' },
                     '&:disabled': { backgroundColor: '#ccc' },
                     display: 'flex',
                     flexDirection: 'column',
                     alignItems: 'center',
                     justifyContent: 'center',
                     textAlign: 'center'
                   }}
                   onClick={() => handleDirectPayment('Carte')}
                   disabled={cartItems.length === 0}
                 >
                   <Box sx={{ fontSize: '1rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     💳 Carte
                   </Box>
                   <Box sx={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1.2 }}>
                     {totalAmount.toFixed(2)} €
                   </Box>
                 </Button>
               </Box>
               
               {/* Séparateur */}
               <Divider sx={{ my: 0.5 }} />
               
               {/* Boutons de total */}
               <Box sx={{ display: 'flex', gap: 0.5 }}>
                 {/* Total Espèces */}
                 <Button
                   variant="outlined"
                   sx={{ 
                     flex: 1,
                     py: 0.5, 
                     fontSize: '1.1rem', 
                     fontWeight: 800, 
                     minHeight: '35px',
                     borderColor: '#2e7d32',
                     color: '#2e7d32',
                     '&:hover': { 
                       borderColor: '#1b5e20',
                       backgroundColor: '#e8f5e8'
                     }
                   }}
                    onClick={() => { setPaymentRecapMethod('cash'); setShowPaymentRecap(true); }}
                 >
                   {paymentTotals['Espèces'].toFixed(2)} €
                 </Button>
                 
                 {/* Total SumUp */}
                  <Button
                   variant="outlined"
                   sx={{ 
                     flex: 1,
                     py: 0.5, 
                     fontSize: '1.1rem', 
                     fontWeight: 800, 
                     minHeight: '35px',
                     borderColor: '#1976d2',
                     color: '#1976d2',
                     '&:hover': { 
                       borderColor: '#1565c0',
                       backgroundColor: '#e3f2fd'
                     }
                   }}
                    onClick={() => { setPaymentRecapMethod('sumup'); setShowPaymentRecap(true); }}
                 >
                   {paymentTotals['SumUp'].toFixed(2)} €
                 </Button>
                 
                 {/* Total Carte */}
                  <Button
                   variant="outlined"
                   sx={{ 
                     flex: 1,
                     py: 0.5, 
                     fontSize: '1.1rem', 
                     fontWeight: 800, 
                     minHeight: '35px',
                     borderColor: '#ff9800',
                     color: '#ff9800',
                     '&:hover': { 
                       borderColor: '#f57c00',
                       backgroundColor: '#fff3e0'
                     }
                   }}
                    onClick={() => { setPaymentRecapMethod('card'); setShowPaymentRecap(true); }}
                 >
                   {paymentTotals['Carte'].toFixed(2)} €
                 </Button>
               </Box>
             </Box>
           </Box>
         );

                           case 'settings':
          return (() => {
            // Calcul des dimensions des boutons pour la fenêtre 5 (361x170)
            const windowWidth = window.width; // 361px
            const windowHeight = window.height; // 170px
            const padding = 4; // 0.5 * 8px = 4px de padding
            const gap = 2; // 0.25 * 8px = 2px de gap
            
            // Calcul pour 4 lignes de 3 boutons
            const totalGapsWidth = 4; // 2 gaps entre colonnes + 2 gaps aux extrémités
            const totalGapsHeight = 6; // 3 gaps entre lignes + 2 gaps aux extrémités
            const totalPaddingWidth = 8; // 2 * 4px de padding
            const totalPaddingHeight = 8; // 2 * 4px de padding
            
            const availableWidth = windowWidth - totalGapsWidth - totalPaddingWidth; // 361 - 4 - 8 = 349
            const availableHeight = windowHeight - totalGapsHeight - totalPaddingHeight; // 170 - 6 - 8 = 156
            
            const buttonWidth = Math.floor(availableWidth / 3); // Math.floor(349 / 3) = 116
            const buttonHeight = Math.floor(availableHeight / 4); // Math.floor(156 / 4) = 39
            
            console.log('🔍 DEBUG - Calculs des boutons fenêtre 5:', {
              windowWidth,
              windowHeight,
              padding,
              gap,
              totalGapsWidth,
              totalGapsHeight,
              totalPaddingWidth,
              totalPaddingHeight,
              availableWidth,
              availableHeight,
              buttonWidth,
              buttonHeight,
              expectedButtonWidth: 116,
              expectedButtonHeight: 39
            });
            
            return (
              <Box sx={{ 
                height: '100%', 
                display: 'grid', 
                gridTemplateColumns: `repeat(3, ${buttonWidth}px)`,
                gridTemplateRows: `repeat(4, ${buttonHeight}px)`,
                gap: `${gap}px`,
                p: 0.5,
                boxSizing: 'border-box',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <input
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  id="csv-import-settings"
                  onChange={handleImportCSV}
                />
                <label htmlFor="csv-import-settings" style={{ width: '100%', height: '100%', display: 'block' }}>
                  <Button
                    variant="contained"
                    component="span"
                    disabled={importStatus === 'importing'}
                    sx={{ 
                      width: '100%',
                      height: '100%',
                                          fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: importStatus === 'importing' ? '#ccc' : '#ff5722',
                    '&:hover': { backgroundColor: importStatus === 'importing' ? '#ccc' : '#e64a19' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                    }}
                  >
                    {importStatus === 'importing' ? 'Import...' : 'Import CSV'}
                  </Button>
                </label>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#795548',
                    '&:hover': { backgroundColor: '#5d4037' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Bouton libre')}
                >
                  Libre
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#607d8b',
                    '&:hover': { backgroundColor: '#455a64' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 3')}
                >
                  Vide 3
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#ff4081',
                    '&:hover': { backgroundColor: '#e91e63' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 4')}
                >
                  Vide 4
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#3f51b5',
                    '&:hover': { backgroundColor: '#303f9f' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 5')}
                >
                  Vide 5
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#4caf50',
                    '&:hover': { backgroundColor: '#388e3c' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 6')}
                >
                  Vide 6
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#ff9800',
                    '&:hover': { backgroundColor: '#f57c00' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 7')}
                >
                  Vide 7
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#9c27b0',
                    '&:hover': { backgroundColor: '#7b1fa2' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 8')}
                >
                  Vide 8
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#00bcd4',
                    '&:hover': { backgroundColor: '#0097a7' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => console.log('Vide 9')}
                >
                  Vide 9
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#009688',
                    '&:hover': { backgroundColor: '#00796b' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => setShowCategoryManagementModal(true)}
                >
                  Gestion Catégories
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#673ab7',
                    '&:hover': { backgroundColor: '#5e35b1' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => setShowSubcategoryManagementModal(true)}
                >
                  Gestion Sous-catégories
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.5rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: isEditMode ? '#f44336' : '#ff9800',
                    '&:hover': { backgroundColor: isEditMode ? '#d32f2f' : '#f57c00' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.0,
                    padding: '1px'
                  }}
                  onClick={() => {
                    // Basculer entre le mode vente et le mode édition
                    const newEditMode = !isEditMode;
                    setIsEditMode(newEditMode);
                    setShowEditModeNotification(newEditMode);
                    
                    if (newEditMode) {
                      console.log('🖊️ Mode édition activé - Cliquez sur un article pour le modifier');
                    } else {
                      console.log('💰 Mode vente activé - Cliquez sur un article pour l\'ajouter au panier');
                    }
                  }}
                >
                  {isEditMode ? 'Mode Vente' : 'Modifier Article'}
                </Button>
              </Box>
            );
          })()

                           case 'import':
          return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                Gestion Données
              </Typography>
              <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2" align="center" sx={{ mb: 1 }}>
                  {products.length} produits chargés
                </Typography>
                <Typography variant="body2" align="center" sx={{ mb: 2 }}>
                  {categories.length} catégories
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    id="csv-import-input"
                    onChange={handleImportCSV}
                  />
                  <label htmlFor="csv-import-input">
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ImportExport />}
                      component="span"
                      disabled={importStatus === 'importing'}
                      sx={{
                        width: '100%',
                        backgroundColor: importStatus === 'importing' ? '#f5f5f5' : 'transparent'
                      }}
                    >
                      {importStatus === 'importing' ? 'Import en cours...' : 'Importer CSV'}
                    </Button>
                  </label>
                  
                  {/* Affichage du statut */}
                  {importStatus !== 'idle' && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        textAlign: 'center',
                        color: importStatus === 'success' ? 'success.main' : 
                               importStatus === 'error' ? 'error.main' : 'info.main',
                        fontWeight: 'bold'
                      }}
                    >
                      {importMessage}
                    </Typography>
                  )}
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    // TODO: Exporter les données
                    alert('Fonctionnalité d\'export à implémenter');
                  }}
                >
                  Exporter Données
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                                    onClick={() => {
                     // TODO: Réinitialiser aux données par défaut
                     // eslint-disable-next-line no-restricted-globals
                     if (confirm('Réinitialiser aux données par défaut ?')) {
                       // Réinitialiser les données
                     }
                   }}
                >
                  Réinitialiser
                </Button>
              </Box>
            </Box>
          );

        case 'stats':
          return (() => {
            // Mise à l'échelle dynamique 2 colonnes x 3 lignes
            const windowWidth = window.width;
            const windowHeight = window.height;
            const padding = 4; // 0.5 * 8px
            const gap = 2; // 0.25 * 8px
            const cols = 2;
            const rows = 3;
            const totalGapsWidth = (cols - 1) * gap + 2 * gap;
            const totalGapsHeight = (rows - 1) * gap + 2 * gap;
            const totalPaddingWidth = 2 * padding;
            const totalPaddingHeight = 2 * padding;
            const usableWidth = Math.max(0, windowWidth - totalGapsWidth - totalPaddingWidth);
            const usableHeight = Math.max(0, windowHeight - totalGapsHeight - totalPaddingHeight);
            const cellWidth = usableWidth / cols;
            const cellHeight = usableHeight / rows;
            const buttonSize = Math.min(cellWidth, cellHeight);
            const fontPx = Math.max(11, Math.floor(buttonSize * 0.18));
            const buttonFont = `${(fontPx / 16).toFixed(2)}rem`;
            const commonButtonSx = {
              flex: 1,
              height: '100%',
              fontSize: buttonFont,
              fontWeight: 'bold',
              color: '#fff',
              textTransform: 'none' as const,
              lineHeight: 1.2,
              padding: '4px',
              overflow: 'hidden',
              whiteSpace: 'normal' as const,
              wordBreak: 'break-word' as const,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center' as const,
            };
            return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 0.5, gap: 0.25 }}>
              {/* Grille 2x3 pour les 6 boutons de fonction */}
              <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#2196f3',
                    '&:hover': { backgroundColor: '#1976d2' },
                  }}
                  onClick={() => setShowDailyReportModal(true)}
                >
                  Rapport
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#4caf50',
                    '&:hover': { backgroundColor: '#388e3c' },
                  }}
                  onClick={() => openGlobalDiscountModal()}
                >
                  Remise
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#607d8b',
                    '&:hover': { backgroundColor: '#546e7a' },
                  }}
                  onClick={() => setShowSalesRecap(true)}
                >
                  Récap ventes
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#455a64',
                    '&:hover': { backgroundColor: '#37474f' },
                  }}
                  onClick={() => setShowTransactionHistory(true)}
                >
                  Tickets jour
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#8d6e63',
                    '&:hover': { backgroundColor: '#6d4c41' },
                  }}
                  onClick={() => setShowTicketEditor(true)}
                >
                  Modifier ticket
                </Button>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 0.25, flex: 1 }}>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#9c27b0',
                    '&:hover': { backgroundColor: '#7b1fa2' },
                  }}
                  onClick={() => { setClosures(StorageService.loadClosures()); setSelectedClosureIdx(null); setShowClosures(true); }}
                >
                  Historique clôture
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    ...commonButtonSx,
                    backgroundColor: '#9e9e9e',
                    '&:hover': { backgroundColor: '#757575' },
                  }}
                  onClick={() => setShowEndOfDay(true)}
                >
                  Fin de journée
                </Button>
              </Box>
            </Box>
            );
          })();

        case 'subcategories':
          return (
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              backgroundColor: '#ff5722',
              border: '3px solid #d84315',
              borderRadius: '8px',
              p: 1,
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}>
              <Typography variant="h6" sx={{ 
                textAlign: 'center', 
                fontWeight: 'bold', 
                color: '#e65100',
                mb: 1,
                fontSize: '0.9rem'
              }}>
                Sous-Catégories
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 0.5, 
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Chip 
                  label="Sous-cat 1" 
                  sx={{ 
                    backgroundColor: '#ff9800', 
                    color: 'white',
                    fontSize: '0.7rem'
                  }} 
                />
                <Chip 
                  label="Sous-cat 2" 
                  sx={{ 
                    backgroundColor: '#ff9800', 
                    color: 'white',
                    fontSize: '0.7rem'
                  }} 
                />
                <Chip 
                  label="Sous-cat 3" 
                  sx={{ 
                    backgroundColor: '#ff9800', 
                    color: 'white',
                    fontSize: '0.7rem'
                  }} 
                />
              </Box>
            </Box>
          );

        case 'free':
          return (() => {
            // Calcul des dimensions des boutons pour la fenêtre 6 (361x170)
            const windowWidth = window.width; // 361px
            const windowHeight = window.height; // 170px
            const padding = 4; // 0.5 * 8px = 4px de padding
            const gap = 2; // 0.25 * 8px = 2px de gap
            
            // Calcul pour 4 lignes de 3 boutons (12 boutons total)
            const totalGapsWidth = 4; // 2 gaps entre colonnes + 2 gaps aux extrémités
            const totalGapsHeight = 6; // 3 gaps entre lignes + 2 gaps aux extrémités
            const totalPaddingWidth = 8; // 2 * 4px de padding
            const totalPaddingHeight = 8; // 2 * 4px de padding
            
            const availableWidth = windowWidth - totalGapsWidth - totalPaddingWidth; // 361 - 4 - 8 = 349
            const availableHeight = windowHeight - totalGapsHeight - totalPaddingHeight; // 170 - 6 - 8 = 156
            
            const buttonWidth = Math.floor(availableWidth / 3); // Math.floor(349 / 3) = 116
            const buttonHeight = Math.floor(availableHeight / 4); // Math.floor(156 / 4) = 39
            
            console.log('🔍 DEBUG - Calculs des boutons fenêtre 6:', {
              windowWidth,
              windowHeight,
              padding,
              gap,
              totalGapsWidth,
              totalGapsHeight,
              totalPaddingWidth,
              totalPaddingHeight,
              availableWidth,
              availableHeight,
              buttonWidth,
              buttonHeight,
              expectedButtonWidth: 116,
              expectedButtonHeight: 39
            });
            
            return (
              <Box sx={{ 
                height: '100%', 
                display: 'grid', 
                gridTemplateColumns: `repeat(3, ${buttonWidth}px)`,
                gridTemplateRows: `repeat(4, ${buttonHeight}px)`,
                gap: `${gap}px`,
                p: 0.5,
                boxSizing: 'border-box',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: window.id === 'window8' ? '#e8f5e8' : 'transparent',
                border: window.id === 'window8' ? '2px solid #4caf50' : 'none',
                borderRadius: window.id === 'window8' ? '8px' : '0px'
              }}>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#f44336',
                    '&:hover': { backgroundColor: '#d32f2f' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 1')}
                >
                  Libre 1
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#e91e63',
                    '&:hover': { backgroundColor: '#c2185b' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 2')}
                >
                  Libre 2
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#9c27b0',
                    '&:hover': { backgroundColor: '#7b1fa2' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 3')}
                >
                  Libre 3
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#673ab7',
                    '&:hover': { backgroundColor: '#512da8' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 4')}
                >
                  Libre 4
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#3f51b5',
                    '&:hover': { backgroundColor: '#303f9f' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 5')}
                >
                  Libre 5
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#2196f3',
                    '&:hover': { backgroundColor: '#1976d2' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 6')}
                >
                  Libre 6
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#03a9f4',
                    '&:hover': { backgroundColor: '#0288d1' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 7')}
                >
                  Libre 7
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#00bcd4',
                    '&:hover': { backgroundColor: '#0097a7' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 8')}
                >
                  Libre 8
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#009688',
                    '&:hover': { backgroundColor: '#00796b' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 9')}
                >
                  Libre 9
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#4caf50',
                    '&:hover': { backgroundColor: '#388e3c' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 10')}
                >
                  Libre 10
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#8bc34a',
                    '&:hover': { backgroundColor: '#689f38' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 11')}
                >
                  Libre 11
                </Button>
                <Button
                  variant="contained"
                  sx={{ 
                    width: '100%',
                    height: '100%',
                    fontSize: getScaledFontSize('0.65rem'), 
                    fontWeight: 'bold', 
                    backgroundColor: '#cddc39',
                    '&:hover': { backgroundColor: '#afb42b' },
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    textTransform: 'none',
                    lineHeight: 1.1,
                    padding: '2px'
                  }}
                  onClick={() => console.log('Libre 12')}
                >
                  Libre 12
                </Button>
              </Box>
            );
          })();



      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: '#f5f5f5'
    }}>
      {/* Indicateur de mode drag and drop */}
      {isDragging && (
        <Box sx={{
          position: 'fixed',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: 'rgba(25, 118, 210, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          pointerEvents: 'none'
        }}>
          🎯 Glissez-déposez pour réorganiser les produits
        </Box>
      )}

      {/* Notification de règlement réussi */}
      {showPaymentSuccess && (
        <Box sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10000,
          backgroundColor: 'rgba(76, 175, 80, 0.95)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '15px',
          fontSize: '18px',
          fontWeight: 'bold',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          textAlign: 'center',
          animation: 'fadeInOut 3s ease-in-out',
          '@keyframes fadeInOut': {
            '0%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.8)' },
            '20%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1.1)' },
            '80%': { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
            '100%': { opacity: 0, transform: 'translate(-50%, -50%) scale(0.8)' }
          }
        }}>
          ✅ Règlement {paymentMethod} réussi !
        </Box>
      )}

                           {windows
          .filter(window => ['categories', 'products', 'cart', 'search', 'window5', 'window6', 'window7'].includes(window.id)) // Afficher les 7 fenêtres
          .map((window) => (
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
              // Couleurs professionnelles distinctes pour chaque fenêtre
              ...(window.id === 'categories' && {
                borderColor: '#1976d2',
                backgroundColor: '#f3f8ff',
                '& .MuiTypography-h6': { color: '#1976d2' }
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
              ...(window.id === 'window5' && {
                borderColor: '#9c27b0',
                backgroundColor: '#f3e5f5',
                '& .MuiTypography-h6': { color: '#9c27b0' }
              }),
              ...(window.id === 'window6' && {
                borderColor: '#0288d1',
                backgroundColor: '#e1f5fe',
                '& .MuiTypography-h6': { color: '#0288d1' }
              }),
              ...(window.id === 'window7' && {
                borderColor: '#388e3c',
                backgroundColor: '#e8f5e8',
                '& .MuiTypography-h6': { color: '#388e3c' }
              })
            }}
            // onMouseDown={(e) => handleMouseDown(e, window.id)}
          >
           {/* Contenu de la fenêtre */}
           <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
             {renderWindowContent(window)}
             {renderResizeHandles(window)}
           </Box>
         </Paper>
      ))}

             {/* Modale de sélection des déclinaisons */}
       <VariationModal
         open={variationModalOpen}
         product={selectedProduct}
         onClose={() => setVariationModalOpen(false)}
         onSelectVariation={handleVariationSelect}
       />

               {/* Modale de remise individuelle */}
        {showDiscountModal && selectedItemForDiscount && (
          <ItemDiscountModal
            open={showDiscountModal}
            onClose={() => setShowDiscountModal(false)}
            item={selectedItemForDiscount}
            onApplyDiscount={applyItemDiscount}
          />
        )}

       {/* Modale Recap */}
       <RecapModal
         open={showRecapModal}
         onClose={() => setShowRecapModal(false)}
         cartItems={cartItems}
       />

       {/* Modale de remise globale */}
       <GlobalDiscountModal
         open={showGlobalDiscountModal}
         onClose={() => setShowGlobalDiscountModal(false)}
         cartItems={cartItems}
         onApplyDiscount={applyGlobalDiscount}
       />

       {/* Modale de gestion des catégories */}
       <CategoryManagementModal
         open={showCategoryManagementModal}
         onClose={() => setShowCategoryManagementModal(false)}
         categories={categories}
         onUpdateCategories={handleUpdateCategories}
       />

      {/* Modale de rapport journalier */}
       <DailyReportModal
         open={showDailyReportModal}
         onClose={() => setShowDailyReportModal(false)}
         cartItems={cartItems}
       />

      {/* Modale historique des transactions du jour */}
      <Dialog open={showTransactionHistory} onClose={() => setShowTransactionHistory(false)} maxWidth="md" fullWidth>
        <DialogTitle>Tickets de la journée</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1 }}>
            <Button size="small" variant={filterPayment==='all'?'contained':'outlined'} onClick={() => setFilterPayment('all')}>Tous</Button>
            <Button size="small" variant={filterPayment==='cash'?'contained':'outlined'} onClick={() => setFilterPayment('cash')}>Espèces</Button>
            <Button size="small" variant={filterPayment==='card'?'contained':'outlined'} onClick={() => setFilterPayment('card')}>Carte</Button>
            <Button size="small" variant={filterPayment==='sumup'?'contained':'outlined'} onClick={() => setFilterPayment('sumup')}>SumUp</Button>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mb: 1 }}>
            <TextField size="small" label="Montant min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
            <TextField size="small" label="Montant max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
            <TextField size="small" label="Montant exact" value={filterAmountExact} onChange={(e) => setFilterAmountExact(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          </Box>
          <TextField size="small" fullWidth label="Contient produit" value={filterProductText} onChange={(e) => setFilterProductText(e.target.value)} sx={{ mb: 1 }} />

          <List dense>
            {todayTransactions
              .filter(t => {
                const m = String((t as any).paymentMethod || '').toLowerCase();
                if (filterPayment === 'cash' && !(m==='cash' || m.includes('esp'))) return false;
                if (filterPayment === 'card' && !(m==='card' || m.includes('carte'))) return false;
                if (filterPayment === 'sumup' && m!=='sumup') return false;
                const amount = t.total || 0;
                const min = parseFloat(filterAmountMin || 'NaN');
                const max = parseFloat(filterAmountMax || 'NaN');
                const exact = parseFloat(filterAmountExact || 'NaN');
                if (!Number.isNaN(exact) && Math.abs(amount - exact) > 0.009) return false;
                if (!Number.isNaN(min) && amount < min) return false;
                if (!Number.isNaN(max) && amount > max) return false;
                if (filterProductText.trim()) {
                  const needle = filterProductText.toLowerCase();
                  const items = Array.isArray(t.items) ? t.items : [];
                  const has = items.some(it => it.product.name.toLowerCase().includes(needle));
                  if (!has) return false;
                }
                return true;
              })
              .map(t => {
                const firstName = Array.isArray(t.items) && t.items.length > 0 ? t.items[0].product.name : '(vide)';
                const qty = Array.isArray(t.items) ? t.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
                return (
                  <ListItem key={t.id} sx={{ py: 0.25, borderBottom: '1px solid #eee', px: 1 }}>
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: '90px 98px 72px 48px 12px 1fr 120px auto auto',
                      alignItems: 'center',
                      gap: 1,
                      width: '100%'
                    }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#666' }}>#{t.id.slice(-6)}</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#666' }}>{new Date(t.timestamp as any).toLocaleDateString('fr-FR')}</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#666' }}>{new Date(t.timestamp as any).toLocaleTimeString('fr-FR')}</Typography>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontFamily: 'monospace' }}>{qty}</Typography>
                      <Typography variant="body2">x</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{firstName}</Typography>
                      <Typography variant="body2" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{(t.total||0).toFixed(2)} €</Typography>
                      <Button size="small" variant="outlined" onClick={() => { setSelectedTicketId(t.id); setSelectedTicketDraft({ ...t, items: (Array.isArray(t.items)?t.items:[]).map(i=>({ ...i })) } as any); setShowTicketEditor(true); }}>Modifier</Button>
                      <Button size="small" color="error" onClick={() => {
                        if (!window.confirm('Inverser les ventes de ce ticket (retour) ?')) return;
                        const inverse = {
                          ...t,
                          id: `${t.id}-R`,
                          total: -Math.abs(t.total||0),
                          items: (Array.isArray(t.items)?t.items:[]).map(it => ({ ...it, quantity: -Math.abs(it.quantity||0) })),
                          timestamp: new Date(),
                        } as any;
                        StorageService.addDailyTransaction(inverse);
                        setTodayTransactions(StorageService.loadTodayTransactions());
                      }}>Inverser</Button>
                    </Box>
                  </ListItem>
                );
              })}
            {todayTransactions.filter(t => {
              const m = String((t as any).paymentMethod || '').toLowerCase();
              if (filterPayment === 'cash' && !(m==='cash' || m.includes('esp'))) return false;
              if (filterPayment === 'card' && !(m==='card' || m.includes('carte'))) return false;
              if (filterPayment === 'sumup' && m!=='sumup') return false;
              const amount = t.total || 0;
              const min = parseFloat(filterAmountMin || 'NaN');
              const max = parseFloat(filterAmountMax || 'NaN');
              if (!Number.isNaN(min) && amount < min) return false;
              if (!Number.isNaN(max) && amount > max) return false;
              if (filterProductText.trim()) {
                const needle = filterProductText.toLowerCase();
                const items = Array.isArray(t.items) ? t.items : [];
                const has = items.some(it => it.product.name.toLowerCase().includes(needle));
                if (!has) return false;
              }
              return true;
            }).length === 0 && (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Aucun ticket pour ces filtres</Box>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTransactionHistory(false)}>Fermer</Button>
          <Button color="error" onClick={() => { StorageService.clearTodayTransactions(); setTodayTransactions([]); }}>Vider</Button>
        </DialogActions>
      </Dialog>

      {/* Modale des clôtures (archives) */}
      <Dialog open={showClosures} onClose={() => setShowClosures(false)} maxWidth="md" fullWidth>
        <DialogTitle>Clôtures archivées</DialogTitle>
        <DialogContent>
          {closures.length === 0 ? (
            <Typography>Aucune clôture enregistrée.</Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ width: 260 }}>
                <List dense>
                  {closures.map((c, idx) => (
                    <ListItem key={idx} button selected={selectedClosureIdx===idx} onClick={() => setSelectedClosureIdx(idx)}>
                      <ListItemText
                        primary={`Clôture Z${c.zNumber || '?'} — ${new Date(c.closedAt).toLocaleDateString('fr-FR')}`}
                        secondary={new Date(c.closedAt).toLocaleTimeString('fr-FR')}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              <Box sx={{ flex: 1 }}>
                {selectedClosureIdx === null ? (
                  <Typography variant="body2">Sélectionnez une clôture pour la visualiser.</Typography>
                ) : (() => {
                  const c = closures[selectedClosureIdx];
                  const txs = c.transactions || [];
                  const totalCA = txs.reduce((s: number, t: any) => s + (t.total || 0), 0);
                  const byMethod = txs.reduce((acc: Record<string, number>, t: any) => {
                    const m = String(t.paymentMethod || '').toLowerCase();
                    const key = m.includes('esp') || m==='cash' ? 'Espèces' : m.includes('carte') || m==='card' ? 'Carte' : 'SumUp';
                    acc[key] = (acc[key] || 0) + (t.total || 0);
                    return acc;
                  }, {} as Record<string, number>);
                  const rows = computeDailyProductSales(txs).slice(0, 10);
                  return (
                    <Box>
                      <Typography variant="h6" sx={{ mb: 1 }}>Clôture Z{c.zNumber}</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>Clôturée le {new Date(c.closedAt).toLocaleString('fr-FR')}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1">Total CA</Typography>
                        <Typography variant="subtitle1">{totalCA.toFixed(2)} €</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Totaux par mode de règlement</Typography>
                      <List dense>
                        {['Espèces','Carte','SumUp'].map(k => (
                          <ListItem key={k} sx={{ py: 0.25 }}>
                            <ListItemText primary={k} />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{(byMethod[k]||0).toFixed(2)} €</Typography>
                          </ListItem>
                        ))}
                      </List>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Top 10 articles</Typography>
                      <List dense>
                        {rows.map(({ product, totalQty, totalAmount }) => (
                          <ListItem key={product.id} sx={{ py: 0.25 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                              <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {product.name}
                              </Typography>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {`Qté: ${totalQty} • CA: ${totalAmount.toFixed(2)} €`}
                              </Typography>
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  );
                })()}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClosures(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Modale récap par mode de règlement */}
      <Dialog open={showPaymentRecap} onClose={() => setShowPaymentRecap(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {paymentRecapMethod === 'cash' ? 'Tickets Espèces' : paymentRecapMethod === 'card' ? 'Tickets Carte' : 'Tickets SumUp'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {/* Tri dans la modale: par quantité, montant, nom, famille, sous-famille */}
            <Button size="small" variant={paymentRecapSort==='qty'?'contained':'outlined'} onClick={() => setPaymentRecapSort('qty')}>Tri quantité</Button>
            <Button size="small" variant={paymentRecapSort==='amount'?'contained':'outlined'} onClick={() => setPaymentRecapSort('amount')}>Tri montant</Button>
            <Button size="small" variant={paymentRecapSort==='name'?'contained':'outlined'} onClick={() => setPaymentRecapSort('name')}>Tri nom</Button>
            <Button size="small" variant={paymentRecapSort==='category'?'contained':'outlined'} onClick={() => setPaymentRecapSort('category')}>Tri famille</Button>
            <Button size="small" variant={paymentRecapSort==='subcategory'?'contained':'outlined'} onClick={() => setPaymentRecapSort('subcategory')}>Tri sous-famille</Button>
          </Box>
          {(() => {
            const filtered = todayTransactions.filter(t => {
              const m = String((t as any).paymentMethod || '').toLowerCase();
              if (paymentRecapMethod === 'cash') return m === 'cash' || m.includes('esp');
              if (paymentRecapMethod === 'card') return m === 'card' || m.includes('carte');
              if (paymentRecapMethod === 'sumup') return m === 'sumup';
              return true;
            });
            const sorted = [...filtered].sort((a, b) => {
              if (paymentRecapSort === 'qty') {
                const qa = Array.isArray(a.items) ? a.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
                const qb = Array.isArray(b.items) ? b.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
                if (qa !== qb) return qb - qa;
              } else if (paymentRecapSort === 'amount') {
                if (a.total !== b.total) return b.total - a.total;
              } else if (paymentRecapSort === 'name') {
                const an = Array.isArray(a.items) && a.items.length > 0 ? a.items[0].product.name : '';
                const bn = Array.isArray(b.items) && b.items.length > 0 ? b.items[0].product.name : '';
                if (an !== bn) return an.localeCompare(bn);
              } else if (paymentRecapSort === 'category') {
                const ac = Array.isArray(a.items) && a.items.length > 0 ? a.items[0].product.category : '';
                const bc = Array.isArray(b.items) && b.items.length > 0 ? b.items[0].product.category : '';
                if (ac !== bc) return ac.localeCompare(bc);
              } else if (paymentRecapSort === 'subcategory') {
                const asub = Array.isArray(a.items) && a.items.length > 0 ? ((a.items[0].product.associatedCategories && a.items[0].product.associatedCategories[0]) || '') : '';
                const bsub = Array.isArray(b.items) && b.items.length > 0 ? ((b.items[0].product.associatedCategories && b.items[0].product.associatedCategories[0]) || '') : '';
                if (asub !== bsub) return asub.localeCompare(bsub);
              }
              return String(a.id).localeCompare(String(b.id));
            });
            const totalAmount = filtered.reduce((s, t) => s + (t.total || 0), 0);
            return (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    Total: {totalAmount.toFixed(2)} €
                  </Typography>
                </Box>
                {paymentRecapSort !== 'category' ? (
                  <List dense>
                    {sorted.map(t => {
                      const firstName = Array.isArray(t.items) && t.items.length > 0 ? t.items[0].product.name : '(vide)';
                      const qty = Array.isArray(t.items) ? t.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;
                      return (
                        <ListItem key={t.id} sx={{ py: 0.25, borderBottom: '1px solid #eee' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                            <Typography variant="body2" sx={{ width: 48, textAlign: 'right', fontFamily: 'monospace' }}>
                              {qty}
                            </Typography>
                            <Typography variant="body2" sx={{ px: 0.5 }}>x</Typography>
                            <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {firstName}
                            </Typography>
                            <Typography variant="body2" sx={{ width: 110, textAlign: 'right', fontFamily: 'monospace' }}>
                              {t.total.toFixed(2)} €
                            </Typography>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                ) : (
                  <List dense>
                    {(() => {
                      const categoryMap = new Map<string, Map<string, { name: string; qty: number; amount: number }>>();
                      for (const tx of filtered) {
                        const items = Array.isArray(tx.items) ? tx.items : [];
                        for (const it of items) {
                          const cat = it.product.category || '';
                          const key = it.product.id;
                          const amount = (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice) * (it.quantity || 0);
                          if (!categoryMap.has(cat)) categoryMap.set(cat, new Map());
                          const prodMap = categoryMap.get(cat)!;
                          const prev = prodMap.get(key) || { name: it.product.name, qty: 0, amount: 0 };
                          prev.qty += (it.quantity || 0);
                          prev.amount += amount;
                          prodMap.set(key, prev);
                        }
                      }
                      const categories = Array.from(categoryMap.keys()).sort((a, b) => a.localeCompare(b));
                      return categories.map(cat => {
                        const prodMap = categoryMap.get(cat)!;
                        const lines = Array.from(prodMap.values()).sort((a, b) => b.qty - a.qty);
                        return (
                          <Box key={cat} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 0.5 }}>Famille {cat}:</Typography>
                            {lines.map(line => (
                              <ListItem key={cat + '::' + line.name} sx={{ py: 0.25, borderBottom: '1px dashed #eee' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                                  <Typography variant="body2" sx={{ width: 48, textAlign: 'right', fontFamily: 'monospace' }}>{line.qty}</Typography>
                                  <Typography variant="body2" sx={{ px: 0.5 }}>x</Typography>
                                  <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.name}</Typography>
                                  <Typography variant="body2" sx={{ width: 110, textAlign: 'right', fontFamily: 'monospace' }}>{line.amount.toFixed(2)} €</Typography>
                                </Box>
                              </ListItem>
                            ))}
                          </Box>
                        );
                      });
                    })()}
                  </List>
                )}
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPaymentRecap(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Modale récapitulatif ventes du jour */}
      <Dialog open={showSalesRecap} onClose={() => setShowSalesRecap(false)} maxWidth="md" fullWidth>
        <DialogTitle>Récapitulatif des ventes du jour</DialogTitle>
        <DialogContent>
          {(() => {
            const rows = computeDailyProductSales(todayTransactions);
            if (rows.length === 0) {
              return <Typography>Aucune vente aujourd'hui.</Typography>;
            }
            const totalQty = rows.reduce((a, r) => a + r.totalQty, 0);
            const totalAmount = rows.reduce((a, r) => a + r.totalAmount, 0);
            return (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, fontWeight: 'bold' }}>
                  <Typography variant="body2">Articles: {totalQty}</Typography>
                  <Typography variant="body2">CA: {totalAmount.toFixed(2)} €</Typography>
                </Box>
                <List dense sx={{ pt: 0 }}>
                  {rows.map(({ product, totalQty, totalAmount }) => (
                    <ListItem
                      key={product.id}
                      disableGutters
                      sx={{ py: 0.25, borderBottom: '1px solid #f0f0f0' }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                        <Typography variant="body2" sx={{ width: 56, textAlign: 'right', fontFamily: 'monospace' }}>
                          {totalQty}
                        </Typography>
                        <Typography variant="body2" sx={{ width: 90, textAlign: 'right', fontFamily: 'monospace' }}>
                          {totalAmount.toFixed(2)} €
                        </Typography>
                        <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSalesRecap(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Modale fin de journée / Clôture */}
      <Dialog open={showEndOfDay} onClose={() => setShowEndOfDay(false)} maxWidth="md" fullWidth>
        <DialogTitle>Clôture de la journée</DialogTitle>
        <DialogContent>
          {(() => {
            const txs = todayTransactions;
            const totalCA = txs.reduce((s, t) => s + (t.total || 0), 0);
            const byMethod = txs.reduce((acc: Record<string, number>, t) => {
              const m = String((t as any).paymentMethod || '').toLowerCase();
              const key = m.includes('esp') || m==='cash' ? 'Espèces' : m.includes('carte') || m==='card' ? 'Carte' : 'SumUp';
              acc[key] = (acc[key] || 0) + (t.total || 0);
              return acc;
            }, {} as Record<string, number>);
            const rows = computeDailyProductSales(txs).slice(0, 10);
            return (
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Heure de clôture: {new Date().toLocaleString('fr-FR')}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="h6">Total CA</Typography>
                  <Typography variant="h6">{totalCA.toFixed(2)} €</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Totaux par mode de règlement</Typography>
                <List dense>
                  {['Espèces','Carte','SumUp'].map(k => (
                    <ListItem key={k} sx={{ py: 0.25 }}>
                      <ListItemText primary={k} />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{(byMethod[k]||0).toFixed(2)} €</Typography>
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Top 10 articles</Typography>
                <List dense>
                  {rows.map(({ product, totalQty, totalAmount }) => (
                    <ListItem key={product.id} sx={{ py: 0.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {`Qté: ${totalQty} • CA: ${totalAmount.toFixed(2)} €`}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              </Box>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEndOfDay(false)}>Annuler</Button>
          <Button color="error" onClick={() => {
            if (!window.confirm('Valider la clôture de la journée ? Cette action archivera et remettra à zéro.')) return;
            const z = StorageService.incrementZNumber();
            const payload = {
              zNumber: z,
              closedAt: new Date().toISOString(),
              transactions: todayTransactions,
            };
            StorageService.saveClosure(payload);
            StorageService.clearTodayTransactions();
            setTodayTransactions([]);
            setShowEndOfDay(false);
            alert(`Clôture effectuée. Z${z} enregistré.`);
          }}>Valider la clôture</Button>
        </DialogActions>
      </Dialog>

      {/* Modale d'édition/suppression d'un ticket */}
      <Dialog open={showTicketEditor} onClose={() => setShowTicketEditor(false)} maxWidth="md" fullWidth>
        <DialogTitle>Modifier un ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              select
              fullWidth
              label="Sélectionner un ticket"
              value={selectedTicketId || ''}
              onChange={(e) => setSelectedTicketId(e.target.value)}
              SelectProps={{ native: true }}
            >
              <option value="" disabled>Choisir…</option>
              {todayTransactions.map(t => (
                <option key={t.id} value={t.id}>#{t.id.slice(-6)} — {new Date(t.timestamp).toLocaleTimeString('fr-FR')}</option>
              ))}
            </TextField>
          </Box>

          {selectedTicketId && (() => {
            const tx = selectedTicketDraft || todayTransactions.find(t => t.id === selectedTicketId);
            if (!tx) return null;
            const updateQty = (productId: string, delta: number) => {
              const baseItems = Array.isArray(tx.items) ? tx.items : [];
              const newItems = baseItems.map(it =>
                it.product.id === productId ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it
              ).filter(it => it.quantity > 0);
              const newTotal = newItems.reduce((s, it) => s + (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice) * it.quantity, 0);
              const updated = { ...tx, items: newItems, total: newTotal } as Transaction;
              setSelectedTicketDraft(updated);
            };
            const removeLine = (productId: string) => updateQty(productId, -9999);

            return (
              <List dense>
                {tx.items.map(it => (
                  <ListItem key={it.product.id} sx={{ py: 0.25 }}>
                    <ListItemText
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                      primary={it.product.name}
                      secondary={`${it.quantity} x ${(it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice).toFixed(2)} € = ${(it.quantity * (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice)).toFixed(2)} €`}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button size="small" variant="outlined" onClick={() => updateQty(it.product.id, -1)}>-</Button>
                      <Button size="small" variant="outlined" onClick={() => updateQty(it.product.id, +1)}>+</Button>
                      <Button size="small" color="error" onClick={() => removeLine(it.product.id)}>Suppr</Button>
                    </Box>
                  </ListItem>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
                  <Typography variant="body2" fontWeight="bold">Total</Typography>
                  <Typography variant="body2" fontWeight="bold">{tx.total.toFixed(2)} €</Typography>
                </Box>
              </List>
            );
          })()}
        </DialogContent>
        <DialogActions>
          {selectedTicketId && (
            <>
              <Button color="error" onClick={() => { StorageService.deleteDailyTransaction(selectedTicketId); setTodayTransactions(StorageService.loadTodayTransactions()); setSelectedTicketId(null); setSelectedTicketDraft(null); }}>Supprimer le ticket</Button>
              <Button variant="contained" onClick={() => {
                if (!selectedTicketDraft) { setShowTicketEditor(false); return; }
                StorageService.updateDailyTransaction(selectedTicketDraft);
                setTodayTransactions(StorageService.loadTodayTransactions());
                setSelectedTicketDraft(null);
                setShowTicketEditor(false);
              }}>Valider</Button>
            </>
          )}
          <Button onClick={() => { setSelectedTicketDraft(null); setShowTicketEditor(false); }}>Fermer</Button>
        </DialogActions>
      </Dialog>

       {/* Modale de modification d'article */}
       <ProductEditModal
         open={showProductEditModal}
         onClose={() => setShowProductEditModal(false)}
         product={selectedProductForEdit}
         categories={categories}
         onSave={handleSaveProduct}
         onDelete={handleDeleteProduct}
       />

       {/* Modale de gestion des sous-catégories */}
       <SubcategoryManagementModal
         open={showSubcategoryManagementModal}
         onClose={() => setShowSubcategoryManagementModal(false)}
         categories={categories}
         products={products}
         onUpdateSubcategories={handleUpdateSubcategories}
       />

       {/* Notification permanente du mode édition */}
       {showEditModeNotification && (
         <Box
           sx={{
             position: 'fixed',
             top: '20px',
             right: '20px',
             zIndex: 9999,
             backgroundColor: '#f44336',
             color: 'white',
             padding: '16px 20px',
             borderRadius: '8px',
             boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
             border: '2px solid #d32f2f',
             maxWidth: '350px',
             animation: 'slideIn 0.3s ease-out'
           }}
         >
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
             <Box
               sx={{
                 width: '12px',
                 height: '12px',
                 backgroundColor: 'white',
                 borderRadius: '50%',
                 animation: 'pulse 2s infinite'
               }}
             />
             <Box>
               <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                 Mode Édition Activé
               </Typography>
               <Typography variant="body2" sx={{ opacity: 0.9 }}>
                 Cliquez sur "Mode Vente" pour retourner à la vente
               </Typography>
             </Box>
           </Box>
         </Box>
       )}

     </Box>
   );
 };

export default WindowManager; 