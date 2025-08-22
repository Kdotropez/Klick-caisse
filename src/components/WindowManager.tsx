import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import CartPanel from './panels/CartPanel';
import PaymentPanel from './panels/PaymentPanel';
// import CategoriesPanelFull from './panels/CategoriesPanelFull';
import SettingsPanel from './panels/SettingsPanel';
import ImportPanel from './panels/ImportPanel';
import StatsPanel from './panels/StatsPanel';
import SubcategoriesPanel from './panels/SubcategoriesPanel';
import FreePanel from './panels/FreePanel';
import {
  Box,
  Paper,
  Typography,
  // IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  // ListItemText,
  // Divider,
  TextField,
} from '@mui/material';
// import {
//   Add,
//   Remove,
// } from '@mui/icons-material';
import { Product, Category, CartItem, ProductVariation, Transaction } from '../types';
import { Cashier } from '../types/Cashier';
import { saveProductionData } from '../data/productionData';
// import { formatEuro } from '../utils/currency';
import { parsePrice } from '../utils/number';
import VariationModal from './VariationModal';
import RecapModal from './RecapModal';
import PaymentRecapByMethodModal, { PaymentRecapSort } from './modals/PaymentRecapByMethodModal';

import { StorageService } from '../services/StorageService';
import TransactionHistoryModal from './modals/TransactionHistoryModal';
import GlobalTicketsModal from './modals/GlobalTicketsModal';
import GlobalTicketEditorModal from './modals/GlobalTicketEditorModal';
import ClosuresModal from './modals/ClosuresModal';
import EndOfDayModal from './modals/EndOfDayModal';
import DiscountRulesModal from './modals/DiscountRulesModal';
import GlobalDiscountModal from './GlobalDiscountModal';
import ItemDiscountModal from './ItemDiscountModal';
 
import CategoryManagementModal from './CategoryManagementModal';
import DailyReportModal from './DailyReportModal';
import ProductEditModal from './ProductEditModal';
import SubcategoryManagementModal from './SubcategoryManagementModal';
import ProductsPanel from './panels/ProductsPanel';


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
  currentStoreCode?: string;
  onStoreChange?: (code: string) => void;

}

const WindowManager: React.FC<WindowManagerProps> = ({
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
  currentStoreCode,
  onStoreChange,
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

  // Normalisation unifiée des sous-catégories (labels et tags produits)
  const normalizeSubcategory = useCallback((input: string) => {
    const base = normalizeDecimals(StorageService.normalizeLabel(String(input || '')).replace(/,/g, '.'));
    return base.replace(/[^a-z0-9. ]/g, '').replace(/\s+/g, ' ').trim();
  }, []);

  // Normaliser les décimaux pour rendre équivalents 8,5 / 8.5 / 8.50 → 8.50
  const normalizeDecimals = (s: string): string => {
    if (!s) return s;
    // Remplacer virgule par point et compléter à 2 décimales si une seule est fournie
    return s
      .replace(/,/g, '.')
      .replace(/(\d+)[.](\d)(?!\d)/g, '$1.$20');
  };

  // États pour la modale de déclinaisons
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // État pour la modale récapitulative
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [showDiscountRules, setShowDiscountRules] = useState(false);
  
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<CartItem | null>(null);
  const [itemDiscounts, setItemDiscounts] = useState<{[key: string]: {type: 'euro' | 'percent' | 'price', value: number}}>({});
  const [globalDiscount, setGlobalDiscount] = useState<{type: 'euro' | 'percent', value: number} | null>(null);
  const [autoGlassDiscountEnabled, setAutoGlassDiscountEnabled] = useState<boolean>(true);
  const [autoAssocDiscountEnabled, setAutoAssocDiscountEnabled] = useState<boolean>(true);
  
  // État pour mémoriser les compensations déjà appliquées (verrouillage)
  const [lockedCompensations, setLockedCompensations] = useState<{
    seau: Record<string, number>; // key -> montant compensé
    vasque: Record<string, number>; // key -> montant compensé
  }>({ seau: {}, vasque: {} });

  // Fonction wrapper pour onRemoveItem qui gère aussi les compensations verrouillées
  const handleRemoveItem = (productId: string, variationId: string | null) => {
    const key = `${productId}-${variationId || 'main'}`;
    
    // Supprimer les compensations verrouillées pour cet article
    setLockedCompensations(prev => {
      const newSeau = { ...prev.seau };
      const newVasque = { ...prev.vasque };
      delete newSeau[key];
      delete newVasque[key];
      return { seau: newSeau, vasque: newVasque };
    });
    
    // Supprimer l'article
    onRemoveItem(productId, variationId);
  };

  // Initialiser automatiquement les barèmes PACK → Seau si absents
  useEffect(() => {
    try {
      const settings = StorageService.loadSettings() || {} as any;
      const rules = settings.autoDiscountRules || {};
      const savedRows: any[] = Array.isArray(rules.savedRows) ? rules.savedRows : [];

      const desired: Array<{ num: number; label: string; amount: number }> = [
        { num: 6.5, label: 'PACK 6.5', amount: 19 },
        { num: 8.5, label: 'PACK 8.5', amount: 21 },
        { num: 10,  label: 'PACK 10',  amount: 20 },
        { num: 12,  label: 'PACK 12',  amount: 22 },
      ];

      const extractNum = (s: string): number => {
        const m = String(s || '').match(/(\d+(?:[.,]\d+)?)/);
        return m ? parseFloat(m[1].replace(',', '.')) : NaN;
      };

      const hasRowFor = (num: number): boolean => savedRows.some(r => {
        if (!r) return false;
        const isPack = String(r.sourceCategory || '').toLowerCase().includes('pack verre');
        const isSeau = String(r.target || '').toLowerCase() === 'seau';
        const n = extractNum(r.subcategory);
        return isPack && isSeau && Number.isFinite(n) && Math.abs(n - num) < 1e-6;
      });

      const toAdd = desired
        .filter(d => !hasRowFor(d.num))
        .map((d, i) => ({
          id: `def-pack-seau-${Date.now()}-${i}`,
          minQty: 1,
          subcategory: d.label,
          target: 'seau',
          amount: d.amount,
          sourceCategory: 'pack verre',
        }));

      if (toAdd.length > 0) {
        const next = {
          ...settings,
          autoDiscountRules: {
            ...rules,
            savedRows: [...savedRows, ...toAdd],
          }
        };
        StorageService.saveSettings(next);
      }
    } catch {}
  }, []);
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
  const [recapDate, setRecapDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [showSalesRecap, setShowSalesRecap] = useState(false);
  
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
  // Tickets globaux (toutes sauvegardes)
  const [showGlobalTickets, setShowGlobalTickets] = useState(false);
  const [globalFilterPayment, setGlobalFilterPayment] = useState<'all' | 'cash' | 'card' | 'sumup'>('all');
  const [globalAmountMin, setGlobalAmountMin] = useState<string>('');
  const [globalAmountMax, setGlobalAmountMax] = useState<string>('');
  const [globalAmountExact, setGlobalAmountExact] = useState<string>('');
  // const [globalProductText, setGlobalProductText] = useState<string>('');
  const [globalDateFrom, setGlobalDateFrom] = useState<string>(''); // yyyy-mm-dd
  const [globalDateTo, setGlobalDateTo] = useState<string>('');
  const [globalTimeFrom, setGlobalTimeFrom] = useState<string>(''); // HH:MM
  const [globalTimeTo, setGlobalTimeTo] = useState<string>('');
  const [globalSelectedIds, setGlobalSelectedIds] = useState<Set<string>>(new Set());
  const [globalOnlyToday, setGlobalOnlyToday] = useState<boolean>(false);
  const [showDiscountDetails, setShowDiscountDetails] = useState<boolean>(false);
  // Saisie de quantité via pavé numérique (catégories)
  const [pendingQtyInput, setPendingQtyInput] = useState<string>('');
  // Expansion des lignes (détails des tickets)
  const [expandedDayTicketIds, setExpandedDayTicketIds] = useState<Set<string>>(new Set());
  const [expandedGlobalTicketIds, setExpandedGlobalTicketIds] = useState<Set<string>>(new Set());
  const [daySelectedIds, setDaySelectedIds] = useState<Set<string>>(new Set());
  const [productSortMode, setProductSortMode] = useState<'sales' | 'name'>('sales');
  // Éditeur pour un ticket sélectionné dans Tickets globaux
  const [showGlobalEditor, setShowGlobalEditor] = useState(false);
  const [globalEditorDraft, setGlobalEditorDraft] = useState<any | null>(null);
  const [globalEditorIsToday, setGlobalEditorIsToday] = useState<boolean>(false);
  // Sélection multiple en mode édition
  const [selectedProductsForDeletion, setSelectedProductsForDeletion] = useState<Set<string>>(new Set());
  // Réfs pour remettre les barres sur "Toutes"
  const categoriesScrollRef = useRef<HTMLDivElement | null>(null);
  const subcategoriesScrollRef = useRef<HTMLDivElement | null>(null);

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
  
  const computePaymentTotalsFromTransactions = useCallback((transactions: Transaction[]) => {
    let cash = 0, card = 0, sumup = 0;
    for (const tx of transactions) {
      const method = String((tx as any).paymentMethod || '').toLowerCase();
      if (method === 'cash' || method.includes('esp')) cash += tx.total;
      else if (method === 'card' || method.includes('carte')) card += tx.total;
      else if (method === 'sumup') sumup += tx.total;
    }
    return { 'Espèces': cash, 'SumUp': sumup, 'Carte': card } as typeof paymentTotals;
  }, []);
  
  // États pour les totaux par méthode de paiement
  const [paymentTotals, setPaymentTotals] = useState({
    'Espèces': 0,
    'SumUp': 0,
    'Carte': 0
  });
  const totalDailyDiscounts = useMemo(() => {
    try {
      let total = 0;
      for (const tx of todayTransactions) {
        // Somme des montants sans remise (prix catalogue)
        const originalSum = tx.items.reduce((sum, it) => {
          const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
          return sum + unit * (it.quantity || 0);
        }, 0);
        const discountTx = Math.max(0, originalSum - tx.total);
        total += discountTx;
      }
      return total;
    } catch { return 0; }
  }, [todayTransactions]);

  // Remises automatiques: 6 verres achetés d'une même sous-catégorie → remise en % par ligne
  useEffect(() => {
    try {
      if (!autoGlassDiscountEnabled) {
        // Si désactivé, retirer toutes les remises auto de type percent sur verres
        const next: typeof itemDiscounts = { ...itemDiscounts };
        for (const key of Object.keys(next)) {
          if (next[key]?.type === 'percent') delete next[key];
        }
        if (Object.keys(next).length !== Object.keys(itemDiscounts).length) setItemDiscounts(next);
        return;
      }
      const normalizeKey = (s: string) =>
        normalizeDecimals(StorageService.normalizeLabel(String(s)))
          .replace(/[^a-z0-9. ]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      
      // Barèmes configurables (chargés depuis les paramètres), avec valeurs par défaut
      const settings = ((): any => {
        try { return StorageService.loadSettings() || {}; } catch { return {}; }
      })();
      const rules = settings.autoDiscountRules || {};
      const defaultGlassPairs: Array<[string, number]> = [
        ['verre 4', 4.17],
        ['verre 4.0', 4.17],
        ['verre 6.5', 3.85],
        ['verre 6.50', 3.85],
        ['verre 8.5', 3.92],
        ['verre 8.50', 3.92],
        ['verre 10', 5.0],
        ['verre 12', 5.56],
        ['calice metal', 5.0],
      ];
      // `glassBySubcat` attendu comme Record<string, number>
      const glassMapFromSettings: Record<string, number> | undefined = rules.glassBySubcat;
      const glassEffective: Record<string, number> = (glassMapFromSettings && Object.keys(glassMapFromSettings).length > 0)
        ? glassMapFromSettings
        : Object.fromEntries(defaultGlassPairs);
      const DISCOUNT_BY_SUBCAT: Record<string, number> = Object.fromEntries(
        Object.entries(glassEffective).map(([k, v]) => [normalizeKey(k), v])
      );

      // Remises automatiques PACK VERRE (à l'unité, en euros)
      const defaultPackPairs: Array<[string, number]> = [
        ['pack 6.5', 1.5],
        ['pack 6.50', 1.5],
        ['pack 8.5', 2],
        ['pack 8.50', 2],
        ['pack 10', 3],
        ['pack 12', 4],
      ];
      const packMapEffective: Record<string, number> = Object.fromEntries(
        defaultPackPairs.map(([k, v]) => [normalizeKey(k), v])
      );

      // Agréger les quantités par type de verre (basé sur catégorie/verre et prix) + mémoriser les lignes
      const qtyBySubcat: Record<string, number> = {};
      const lineKeysBySubcat: Record<string, string[]> = {};
      for (const it of cartItems) {
        const catNorm = normalizeKey(it.product.category || '');
        const nameNorm = normalizeKey(it.product.name || '');
        let matched: string | undefined;
        // Détection prioritaire par prix si catégorie ou nom indique "verre"
        if (catNorm.includes('verre') || nameNorm.includes('verre')) {
          const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
          const n = Math.round(unit * 100) / 100;
          const whole = Math.round(n);
          const frac = Math.round((n - whole) * 100);
          const label = frac === 0 ? `${whole}` : (frac === 50 ? `${whole}.5` : n.toFixed(1));
          const key = normalizeKey(`verre ${label}`);
          if (DISCOUNT_BY_SUBCAT[key] !== undefined) matched = key;
        }
        // Essai secondaire: parse "verre X" dans le nom produit
        if (!matched && nameNorm.includes('verre')) {
          const m = nameNorm.match(/verre\s*(\d+(?:\.\d+)?)/);
          if (m) {
            const key = normalizeKey(`verre ${m[1]}`);
            if (DISCOUNT_BY_SUBCAT[key] !== undefined) matched = key;
          }
        }
        // Dernier recours: mappage par prix sans exigence de catégorie si ça correspond
        if (!matched) {
          const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
          const n = Math.round(unit * 100) / 100;
          const whole = Math.round(n);
          const frac = Math.round((n - whole) * 100);
          const label = frac === 0 ? `${whole}` : (frac === 50 ? `${whole}.5` : n.toFixed(1));
          const key = normalizeKey(`verre ${label}`);
          if (DISCOUNT_BY_SUBCAT[key] !== undefined) matched = key;
        }
        if (!matched) continue;
        qtyBySubcat[matched] = (qtyBySubcat[matched] || 0) + (it.quantity || 0);
        const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
        if (!lineKeysBySubcat[matched]) lineKeysBySubcat[matched] = [];
        lineKeysBySubcat[matched].push(key);
      }

      const next = { ...itemDiscounts } as Record<string, {type: 'euro' | 'percent' | 'price', value: number}>;
      // Appliquer/retirer pour chaque sous-catégorie selon seuil 6
      for (const sub of Object.keys(qtyBySubcat)) {
        const percent = DISCOUNT_BY_SUBCAT[sub];
        const keys = lineKeysBySubcat[sub] || [];
        if (qtyBySubcat[sub] >= 6) {
          for (const key of keys) {
            next[key] = { type: 'percent', value: percent };
        }
      } else {
          for (const key of keys) {
            if (next[key] && next[key].type === 'percent' && Math.abs(next[key].value - percent) < 1e-6) {
            delete next[key];
          }
        }
      }
      }

      // Appliquer remises PACK VERRE à l'unité (si Auto activé)
      if (autoGlassDiscountEnabled) {
        for (const it of cartItems) {
          const categoryNorm = normalizeKey(it.product.category || '');
          const nameNorm = normalizeKey(it.product.name || '');
          const assocList = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
          let matchedPackKey: string | undefined;
          // Chercher dans les sous-catégories associées
          for (const raw of assocList) {
            const n = normalizeKey(String(raw));
            if (packMapEffective[n] !== undefined) { matchedPackKey = n; break; }
          }
          // Sinon tenter via le nom produit
          if (!matchedPackKey && (categoryNorm.includes('pack') || nameNorm.includes('pack'))) {
            const m = nameNorm.match(/pack\s*(\d+(?:\.\d+)?)/);
            if (m) {
              const possible = normalizeKey(`pack ${m[1]}`);
              if (packMapEffective[possible] !== undefined) matchedPackKey = possible;
            }
          }
          if (!matchedPackKey) continue;
          const discountEuro = packMapEffective[matchedPackKey] || 0;
          if (discountEuro > 0) {
            const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
            next[key] = { type: 'euro', value: discountEuro };
          }
        }
      } else {
        // Si Auto désactivé: retirer remises PACK appliquées précédemment
        for (const it of cartItems) {
          const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
          if (next[key] && next[key].type === 'euro') {
            const val = next[key].value;
            // Supprimer si cela correspond à l'un des montants pack connus
            if ([1.5, 2, 3, 4].some(v => Math.abs((val as number) - v) < 1e-6)) {
              delete next[key];
            }
          }
        }
      }

      // Détecter, par sous-catégorie, si une remise verres est effectivement appliquée
      // (sert à conditionner les compensations seau/vasque, y compris pour le cas "12 verres")
      const hasGlassDiscountBySub: Record<string, boolean> = {};
      for (const sub of Object.keys(lineKeysBySubcat)) {
        const keys = lineKeysBySubcat[sub] || [];
        hasGlassDiscountBySub[sub] = keys.some(k => next[k]?.type === 'percent');
      }

      // Règle complémentaire: pour chaque set (6 verres même sous-catégorie) + 1 "seau"
      // Compensation fixe par set selon la sous-catégorie de verre
      // - verre 6.5 → 19€
      // - verre 8.5 → 21€
      // Préparer un index des lignes (prix unitaire, quantité) utilisable par seau/vasque
      const keyToInfo: Record<string, { unit: number; qty: number }> = {};
      for (const it of cartItems) {
        const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
        const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
        keyToInfo[key] = { unit, qty: it.quantity || 0 };
      }
      // Cibles de compensation: catégories "seau" et "vasque(s)"
      const targetLineInfos: Array<{ key: string; subtotal: number; qty: number }> = [];
      let totalTargetQty = 0;
      for (const it of cartItems) {
        const catNorm = normalizeKey(it.product.category || '');
        if (catNorm.includes('seau') || catNorm.includes('vasque')) {
          const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
          const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
          const qty = it.quantity || 0;
          targetLineInfos.push({ key, subtotal: unit * qty, qty });
          totalTargetQty += qty;
        }
      }

      // Si l'associative est désactivée OU si la remise verres est désactivée,
      // nettoyer et ne rien appliquer (les compensations dépendent des remises verres)
      if (!autoAssocDiscountEnabled || !autoGlassDiscountEnabled) {
        for (const { key } of targetLineInfos) {
          if (next[key] && next[key].type === 'euro') delete next[key];
        }
      } else {
        const defaultSeau: Record<string, number> = {
          'verre 6.5': 19,
          'verre 6.50': 19,
          'verre 8.5': 21,
          'verre 8.50': 21,
          'verre 10': 20,
          'verre 12': 22,
        };
        // Mêler règles sauvegardées (pack verre -> seau) et map seauBySubcat
        const seauFromSettings: Record<string, number> | undefined = rules.seauBySubcat;
        const seauEffective: Record<string, number> = (seauFromSettings && Object.keys(seauFromSettings).length > 0)
          ? { ...defaultSeau, ...seauFromSettings }
          : defaultSeau;
        // Construire aussi une map des règles explicites PACK VERRE -> SEAU (PACK X -> verre X)
        const packToSeauComp: Record<string, number> = (() => {
          const out: Record<string, number> = {};
          const saved: any[] = Array.isArray(rules.savedRows) ? rules.savedRows : [];
          for (const row of saved) {
            if (row && row.sourceCategory === 'pack verre' && row.target === 'seau') {
              const m = String(row.subcategory || '').match(/(\d+(?:[.,]\d+)?)/);
              if (!m) continue;
              const num = m[1].replace(',', '.');
              const verreKey = normalizeKey(`verre ${num}`);
              const euro = Number(row.amount) || 0;
              if (euro > 0) out[verreKey] = euro;
            }
          }
          return out;
        })();
        const SEAU_COMP_BY_SUB: Record<string, number> = Object.fromEntries(
          Object.entries(seauEffective).map(([k, v]) => [normalizeKey(k), v])
        );

        // Préparer info lignes (prix/qty) pour allocation
        const keyToInfo: Record<string, { unit: number; qty: number }> = {};
        for (const it of cartItems) {
          const key = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
          const unit = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
          keyToInfo[key] = { unit, qty: it.quantity || 0 };
        }

        const hasVasqueTargets = targetLineInfos.some(t => {
          const keyParts = t.key.split('-');
          const prod = cartItems.find(ci => `${ci.product.id}-${ci.selectedVariation?.id || 'main'}` === t.key)?.product;
          const catNorm = normalizeKey(prod?.category || '');
          return catNorm.includes('vasque');
        });

        // 1) VASQUES: consommer des sets de 12 verres (2x 6) par sous-type
        const vasqueComps: number[] = [];
        let totalVasqueComps = 0; // Limiter le nombre total de compensations vasque (GLOBAL)
        const defaultVasque: Record<string, number> = {
          'verre 6.5': 23,
          'verre 6.50': 23,
          'verre 8.5': 22,
          'verre 8.50': 22,
          'verre 10': 20,
          'verre 12': 22,
        };
        const vasqueFromSettings: Record<string, number> | undefined = rules.vasqueBySubcat;
        const vasqueEffective: Record<string, number> = (vasqueFromSettings && Object.keys(vasqueFromSettings).length > 0)
          ? { ...vasqueFromSettings }
          : { ...defaultVasque };
        // Demande client: 12 verres (verre 12) → vasque = 24€
        vasqueEffective['verre 12'] = 24;
        const VASQUE_COMP_BY_SUB: Record<string, number> = Object.fromEntries(
          Object.entries(vasqueEffective).map(([k, v]) => [normalizeKey(k), v])
        );
        const remainingPoolsBySub: Record<string, Array<{unit:number; qty:number}>> = {};
        
        // Calculer les limites globales pour les compensations VASQUE
        let totalGlassesForVasque = 0;
        for (const sub of Object.keys(qtyBySubcat)) {
          const comp12 = VASQUE_COMP_BY_SUB[sub] || 0;
          if (comp12 <= 0) continue;
          if (!hasGlassDiscountBySub[sub]) continue;
          const keys = lineKeysBySubcat[sub] || [];
          const pools = keys.map(k => keyToInfo[k]).filter(Boolean).map(info => ({ unit: info.unit, qty: info.qty }));
          const remainingQty = pools.reduce((s, p) => s + Math.max(0, p.qty), 0);
          totalGlassesForVasque += remainingQty;
        }
        const maxVasqueComps = Math.floor(totalGlassesForVasque / 12);
        for (const sub of Object.keys(qtyBySubcat)) {
          const totalQty = qtyBySubcat[sub] || 0;
          const compPerSet = SEAU_COMP_BY_SUB[sub] || 0;
          const percentVerre = autoGlassDiscountEnabled ? (DISCOUNT_BY_SUBCAT[sub] || 0) : 0;
          const keys = lineKeysBySubcat[sub] || [];
          const pools = keys.map(k => keyToInfo[k]).filter(Boolean).map(info => ({ unit: info.unit, qty: info.qty }));
          // Les vasques ne s'appliquent QUE si une remise verres est effectivement appliquée pour ce sous-type
          if (hasVasqueTargets && hasGlassDiscountBySub[sub]) {
            const sets12 = Math.floor(totalQty / 12);
            for (let s = 0; s < sets12; s++) {
              // Limiter à 1 compensation vasque par set de 12 verres (GLOBAL)
              if (totalVasqueComps >= maxVasqueComps) break;
              
              let need12 = 12;
              let discountSum12 = 0;
              for (let idx = 0; idx < pools.length && need12 > 0; idx++) {
                const take = Math.min(need12, Math.max(0, pools[idx].qty));
                if (take > 0) {
                  discountSum12 += take * pools[idx].unit * (percentVerre / 100);
                  pools[idx].qty -= take;
                  need12 -= take;
                }
              }
              // Compensation vasque = barème dédié
              const comp12 = VASQUE_COMP_BY_SUB[sub] || 0;
              const net12 = Math.max(0, comp12 - discountSum12);
              if (net12 > 0) {
                console.log(`[COMPENSATION VASQUE] Sous-cat: ${sub}, Barème: ${comp12}€, Remise auto: ${discountSum12.toFixed(2)}€, Net: ${net12.toFixed(2)}€`);
                vasqueComps.push(net12);
                totalVasqueComps++;
              }
            }
          }
          remainingPoolsBySub[sub] = pools;
        }

        // 2) SEAUX: consommer des sets de 6 verres sur le reste
        const seauComps: number[] = [];
        let totalSeauComps = 0; // Limiter le nombre total de compensations seau (GLOBAL)
        
        // Calculer d'abord le total de verres disponibles pour les compensations seau
        let totalGlassesForSeau = 0;
        for (const sub of Object.keys(qtyBySubcat)) {
          const compPerSet = SEAU_COMP_BY_SUB[sub] || 0;
          if (compPerSet <= 0) continue;
          if (!hasGlassDiscountBySub[sub]) continue;
          const pools = (remainingPoolsBySub[sub] || []).map(p => ({...p}));
          const remainingQty = pools.reduce((s, p) => s + Math.max(0, p.qty), 0);
          totalGlassesForSeau += remainingQty;
        }
        
        // Calculer le nombre maximum de compensations seau (sera ajusté plus tard)
        let maxSeauComps = Math.floor(totalGlassesForSeau / 6);
        
        for (const sub of Object.keys(qtyBySubcat)) {
          const compPerSet = SEAU_COMP_BY_SUB[sub] || 0;
          if (compPerSet <= 0) continue;
          // Les seaux ne s'appliquent QUE si une remise verres est effectivement appliquée pour ce sous-type
          if (!hasGlassDiscountBySub[sub]) continue;
          const percentVerre = (DISCOUNT_BY_SUBCAT[sub] || 0);
          const pools = (remainingPoolsBySub[sub] || []).map(p => ({...p}));
          // calculer combien d'unités restent
          const remainingQty = pools.reduce((s, p) => s + Math.max(0, p.qty), 0);
          const sets6 = Math.floor(remainingQty / 6);
          for (let s = 0; s < sets6; s++) {
            // Limiter à 1 compensation seau par set de 6 verres (GLOBAL)
            if (totalSeauComps >= maxSeauComps) break;
            
            let need = 6;
            let discountSum = 0;
            for (let idx = 0; idx < pools.length && need > 0; idx++) {
              const take = Math.min(need, Math.max(0, pools[idx].qty));
              if (take > 0) {
                discountSum += take * pools[idx].unit * (percentVerre / 100);
                pools[idx].qty -= take;
                need -= take;
              }
            }
            // Compensation seau = barème seau - remise auto sur 6 verres
            const net = Math.max(0, compPerSet - discountSum);
            if (net > 0) {
              console.log(`[COMPENSATION SEAU] Sous-cat: ${sub}, Barème: ${compPerSet}€, Remise auto: ${discountSum.toFixed(2)}€, Net: ${net.toFixed(2)}€`);
              seauComps.push(net);
              totalSeauComps++;
            }
          }
        }

        const VASQUE_BASELINE = 22;
        // 2bis) VASQUES: consommer des sets de 12 verres en mélangeant les sous-catégories
        // Règle: compensation nette = 22 - remise verres auto sur 12 unités
        const vasqueFromMixedTwelve: number[] = [];
        let mixedVasqueComps = 0; // Limiter les compensations vasque mixtes
        {
          // Cloner les pools restants pour consommer en global
          const mixedPools: Record<string, Array<{unit:number; qty:number}>> = {};
          for (const [sub, arr] of Object.entries(remainingPoolsBySub)) {
            mixedPools[sub] = arr.map(p => ({ ...p }));
          }
          // Fonction pour calculer le total restant
          const totalQty = () => Object.values(mixedPools).reduce((s, arr) => s + arr.reduce((ss, p) => ss + Math.max(0, p.qty), 0), 0);
          while (totalQty() >= 12 && mixedVasqueComps < 1) {
            let need = 12;
            let discountSum12 = 0;
            // Parcours simple: consommer séquentiellement par sous-catégorie
            for (const sub of Object.keys(mixedPools)) {
              if (need <= 0) break;
              const percentVerre = DISCOUNT_BY_SUBCAT[sub] || 0;
              const arr = mixedPools[sub];
              for (let idx = 0; idx < arr.length && need > 0; idx++) {
                const take = Math.min(need, Math.max(0, arr[idx].qty));
                if (take > 0) {
                  discountSum12 += take * arr[idx].unit * (percentVerre / 100);
                  arr[idx].qty -= take;
                  need -= take;
                }
              }
            }
            if (need > 0) break; // sécurité
            const net = Math.max(0, VASQUE_BASELINE - discountSum12);
            if (net > 0) {
              console.log(`[COMPENSATION VASQUE MIXTE] Barème: ${VASQUE_BASELINE}€, Remise auto: ${discountSum12.toFixed(2)}€, Net: ${net.toFixed(2)}€`);
              vasqueFromMixedTwelve.push(net);
              mixedVasqueComps++;
            }
          }
        }

        // 3) VASQUES via (2 packs) ou (1 pack + 6 verres)
        
        // Préparer la liste des packs présents (par type 6.5/8.5/10/12)
        type PackUnit = { key: string; num: number; auto: number };
        const packUnits: PackUnit[] = [];
        let packVasqueComps = 0; // Limiter les compensations vasque par packs
        for (const it of cartItems) {
          const catNorm = normalizeKey(it.product.category || '');
          if (!(catNorm.includes('pack') && catNorm.includes('verre'))) continue;
          // Détecter le type PACK X depuis sous-catégories associées puis nom
          let num: number | null = null;
          const assocList = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
          for (const raw of assocList) {
            const m = normalizeKey(String(raw)).match(/pack\s*(\d+(?:\.\d+)?)/);
            if (m) { num = parseFloat(m[1]); break; }
          }
          if (num === null) {
            const m = normalizeKey(it.product.name || '').match(/pack\s*(\d+(?:\.\d+)?)/);
            if (m) num = parseFloat(m[1]);
          }
          if (num === null || !Number.isFinite(num)) continue;
          const auto = (num === 6.5 ? 1.5 : num === 8.5 ? 2 : num === 10 ? 3 : num === 12 ? 4 : 0);
          const qty = Math.max(1, it.quantity || 0);
          for (let q = 0; q < qty; q++) packUnits.push({ key: `${it.product.id}-${it.selectedVariation?.id || 'main'}`, num, auto });
        }
        // a) Paires de packs (similaires ou différents) → 1 vasque
        const vasqueFromPackPairs: number[] = [];
        if (packUnits.length >= 2 && packVasqueComps < 1) {
          // Former des paires deux par deux en minimisant la somme des remises auto pour maximiser la compensation
          const autos = packUnits.map(p => p.auto).sort((a,b)=>a-b);
          for (let i = 0; i + 1 < autos.length && packVasqueComps < 1; i += 2) {
            const net = Math.max(0, VASQUE_BASELINE - (autos[i] + autos[i+1]));
            if (net > 0) {
              console.log(`[COMPENSATION VASQUE PACKS] Barème: ${VASQUE_BASELINE}€, Remise auto packs: ${(autos[i] + autos[i+1]).toFixed(2)}€, Net: ${net.toFixed(2)}€`);
              vasqueFromPackPairs.push(net);
              packVasqueComps++;
            }
          }
        }
        // b) 1 pack + 6 verres (sur pools restants) → 1 vasque
        const vasqueFromPackPlusSix: number[] = [];
        if (packUnits.length >= 1 && packVasqueComps < 1) {
          // Construire des pools modifiables pour consommer 6 verres
          const poolsBySub: Record<string, Array<{unit:number; qty:number}>> = {};
          for (const [sub, arr] of Object.entries(remainingPoolsBySub)) {
            poolsBySub[sub] = arr.map(p=>({ ...p }));
          }
          const autoOf = (n:number)=> (n===6.5?1.5:n===8.5?2:n===10?3:n===12?4:0);
          // trier packs pour donner priorité à ceux avec auto le plus élevé (ça réduit le net, mais l'ordre n'est pas critique)
          const sortedPacks = [...packUnits].sort((a,b)=>a.auto-b.auto);
          for (const p of sortedPacks) {
            if (packVasqueComps >= 1) break; // Limiter à 1 compensation vasque par pack+6
            // calculer remise verres sur 6 unités, en consommant depuis poolsBySub
            let need6 = 6;
            let discount6 = 0;
            const subs = Object.keys(poolsBySub);
            // ordre arbitraire; on peut aussi prioriser les sous-types avec plus de qty
            for (const sub of subs) {
              if (need6<=0) break;
              const percentVerre = (DISCOUNT_BY_SUBCAT[sub] || 0);
              const arr = poolsBySub[sub];
              for (let idx=0; idx<arr.length && need6>0; idx++) {
                const take = Math.min(need6, Math.max(0, arr[idx].qty));
                if (take>0) {
                  discount6 += take * arr[idx].unit * (percentVerre/100);
                  arr[idx].qty -= take;
                  need6 -= take;
                }
              }
            }
            if (need6>0) continue; // pas assez de verres pour constituer un set de 6
            const net = Math.max(0, VASQUE_BASELINE - autoOf(p.num) - discount6);
            if (net>0) {
              console.log(`[COMPENSATION VASQUE PACK+6] Barème: ${VASQUE_BASELINE}€, Remise auto pack: ${autoOf(p.num)}€, Remise auto 6 verres: ${discount6.toFixed(2)}€, Net: ${net.toFixed(2)}€`);
              vasqueFromPackPlusSix.push(net);
              packVasqueComps++;
            }
          }
        }

        // Répartition sur vasques puis sur seaux, séparément
        const vasqueTargets = targetLineInfos.filter(t => {
          const prod = cartItems.find(ci => `${ci.product.id}-${ci.selectedVariation?.id || 'main'}` === t.key)?.product;
          const catNorm = normalizeKey(prod?.category || '');
          return catNorm.includes('vasque');
        });
        const seauTargets = targetLineInfos.filter(t => {
          const prod = cartItems.find(ci => `${ci.product.id}-${ci.selectedVariation?.id || 'main'}` === t.key)?.product;
          const catNorm = normalizeKey(prod?.category || '');
          return catNorm.includes('seau');
        });
        
        // Ajuster le nombre maximum de compensations seau en fonction du nombre de seaux disponibles
        maxSeauComps = Math.min(maxSeauComps, seauTargets.length);

        // Cas explicite demandé: 1 PACK VERRE (ex: PACK 6.5) + 1 SEAU => appliquer la compensation du barème "seau"
        // On détecte des lignes PACK VERRE et on mappe PACK X.Y -> "verre X.Y" pour utiliser SEAU_COMP_BY_SUB
        // Cette compensation s'applique même si aucune remise verres (percent) n'a été appliquée sur des lignes "verre"
        const packBasedComps: number[] = [];
        console.log(`[DEBUG] Recherche de packs dans ${cartItems.length} articles, ${seauTargets.length} seaux disponibles`);
        console.log(`[DEBUG] Tous les articles:`, cartItems.map(it => ({
          name: it.product.name,
          category: it.product.category,
          normalized: normalizeKey(it.product.category || '')
        })));
        
        if (seauTargets.length > 0) {
          for (const it of cartItems) {
            const catNorm = normalizeKey(it.product.category || '');
            console.log(`[DEBUG] Article: ${it.product.name}, Catégorie: ${it.product.category}, Normalisée: ${catNorm}`);
            if (!(catNorm.includes('pack') && catNorm.includes('verre'))) {
              console.log(`[DEBUG] Ignoré: pas un pack verre (${catNorm} ne contient pas 'pack' ET 'verre')`);
              continue;
            }

            // Tenter d'extraire "pack X" depuis sous-catégories associées puis depuis le nom
            let matchedSub: string | null = null;
            const assocList = Array.isArray(it.product.associatedCategories) ? it.product.associatedCategories : [];
            for (const raw of assocList) {
              const n = normalizeKey(String(raw));
              const m = n.match(/pack\s*(\d+(?:\.\d+)?)/);
              if (m) { matchedSub = normalizeKey(`verre ${m[1]}`); break; }
            }
            if (!matchedSub) {
              const nameNorm = normalizeKey(it.product.name || '');
              const m = nameNorm.match(/pack\s*(\d+(?:\.\d+)?)/);
              if (m) matchedSub = normalizeKey(`verre ${m[1]}`);
            }
            if (!matchedSub) continue;

            // Priorité: n'appliquer la compensation PACK->SEAU que si une règle explicite existe
            const compConfigured = packToSeauComp[matchedSub];
            if (compConfigured === undefined) continue;
            // Calcul de la compensation nette (barème pack->seau − remise auto du pack)
            const mnum = matchedSub.match(/verre\s*(\d+(?:\.\d+)?)/);
            const num = mnum ? parseFloat(mnum[1]) : NaN;
            const packAuto = Number.isFinite(num)
              ? (num === 6.5 ? 1.5 : num === 8.5 ? 2 : num === 10 ? 3 : num === 12 ? 4 : 0)
              : 0;
            const compNet = Math.max(0, compConfigured - packAuto);
            if (compNet <= 0) continue;

            console.log(`[COMPENSATION PACK→SEAU] Pack: ${matchedSub}, Barème: ${compConfigured}€, Remise auto pack: ${packAuto}€, Net: ${compNet.toFixed(2)}€`);

            // Ajouter une compensation par quantité de packs (limité par le nombre de seaux disponibles)
            const times = Math.max(1, it.quantity || 0);
            for (let i = 0; i < times; i++) {
              packBasedComps.push(compNet);
            }
          }
        }

        // Nettoyage des anciennes remises compensatoires
        for (const { key } of targetLineInfos) {
          if (next[key] && next[key].type === 'euro') {
            delete next[key];
          }
        }



        const distribute = (amounts: number[], targets: Array<{key:string; subtotal:number; qty:number}>, options?: {singleTarget?: boolean}) => {
          const total = amounts.reduce((s,v)=>s+v,0);
          if (total <= 0 || targets.length === 0) return;
          
          if (options?.singleTarget) {
            const first = targets[0];
            const apply = Math.min(total, first.subtotal);
            const perUnitEuro = first.qty > 0 ? (apply / first.qty) : 0;
            if (perUnitEuro > 0) {
              next[first.key] = { type: 'euro', value: perUnitEuro };
            }
            return;
          }
          
          let remaining = total;
          for (const { key, subtotal, qty } of targets) {
            if (remaining <= 0) break;
            
            const apply = Math.min(remaining, subtotal);
            const perUnitEuro = qty > 0 ? (apply / qty) : 0;
            if (perUnitEuro > 0) {
              next[key] = { type: 'euro', value: perUnitEuro };
            }
            remaining -= apply;
          }
        };

        // Vasques: appliquer sur UNE SEULE vasque
        distribute(vasqueComps, vasqueTargets, { singleTarget: true });
        // Seaux - limiter le nombre de seaux cibles
        const limitedSeauTargets = seauTargets.slice(0, seauComps.length);
        distribute(seauComps, limitedSeauTargets);
        // Packs -> Seaux (compensation nette) - appliquer sur des seaux différents
        if (packBasedComps.length > 0 && seauTargets.length > 0) {
          console.log(`[DEBUG] packBasedComps: ${packBasedComps.length} compensations, seauTargets: ${seauTargets.length} seaux`);
          console.log(`[DEBUG] packBasedComps:`, packBasedComps);
          console.log(`[DEBUG] seauTargets:`, seauTargets.map(t => ({ key: t.key, qty: t.qty })));
          
          // Limiter le nombre de compensations au nombre de seaux disponibles
          const maxComps = Math.min(packBasedComps.length, seauTargets.length);
          const limitedComps = packBasedComps.slice(0, maxComps);
          
          console.log(`[DEBUG] maxComps: ${maxComps}, limitedComps:`, limitedComps);
          
          // Appliquer chaque compensation sur un seau différent
          for (let i = 0; i < limitedComps.length && i < seauTargets.length; i++) {
            const seauTarget = seauTargets[i];
            const compAmount = limitedComps[i];
            const perUnitEuro = seauTarget.qty > 0 ? (compAmount / seauTarget.qty) : 0;
            if (perUnitEuro > 0) {
              next[seauTarget.key] = { type: 'euro', value: perUnitEuro };
              console.log(`[DEBUG] Compensation appliquée sur seau ${i+1}: ${perUnitEuro.toFixed(2)}€ par unité`);
            }
          }
        }
        // Nouvelles règles vasque (2 packs), (1 pack + 6 verres), (12 verres mélangés) - seulement pour les vasques sans compensation existante
        const extraVasque = [...vasqueFromPackPairs, ...vasqueFromPackPlusSix, ...vasqueFromMixedTwelve];
        if (extraVasque.length > 0 && vasqueTargets.length > 0) {
          const availableVasqueTargets = vasqueTargets.filter(t => {
            const hasExistingDiscount = next[t.key] && next[t.key].type === 'euro';
            return !hasExistingDiscount;
          });
          if (availableVasqueTargets.length > 0) {
            const limitQty = availableVasqueTargets.reduce((s,t)=>s + Math.max(0, t.qty), 0);
            const limited = extraVasque.slice(0, limitQty);
            distribute(limited, availableVasqueTargets, { singleTarget: true });
          }
        }
      }

      // (Suppression demandée) — logique de compensation vasque retirée entièrement.

      const changed = Object.keys(next).length !== Object.keys(itemDiscounts).length ||
        Object.keys(next).some(k => JSON.stringify(next[k]) !== JSON.stringify((itemDiscounts as any)[k]));
      if (changed) setItemDiscounts(next);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems, autoGlassDiscountEnabled, autoAssocDiscountEnabled, lockedCompensations]);

  useEffect(() => {
    setPaymentTotals(computePaymentTotalsFromTransactions(todayTransactions));
  }, [todayTransactions, computePaymentTotalsFromTransactions]);

  // Remises automatiques désactivées temporairement (réintégration prévue)
  // useEffect(() => {}, [cartItems]);

  // La suppression se fait via la croix rouge (onRemoveItemDiscount)

  // Si le ticket sélectionné n'existe plus (ex.: vidage), réinitialiser la sélection
  // Nettoyage d'anciens états (modale édition supprimée)
  
  // États pour l'import CSV
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  
  // Force le re-rendu quand les catégories changent
  // categoriesVersion supprimé (non utilisé)

  // Fonction pour gérer le scan de code-barre (déplacée au-dessus de l'effet qui l'utilise)
  const handleBarcodeScan = useCallback((barcode: string) => {
    const normalizeEan13 = (raw: string): string => {
      if (!raw) return '';
      let s = String(raw).trim().replace(/\s+/g, '');
      s = s.replace(/,/g, '.');
      if (/e[+\-]?/i.test(s)) {
        const n = Number.parseFloat(s);
        if (Number.isFinite(n)) s = Math.round(n).toString();
      }
      s = s.replace(/\D/g, '');
      if (s.length > 13) s = s.slice(0, 13);
      return s;
    };

    if (isEditMode) {
      setSearchTerm(barcode);
      return;
    }
    const nb = normalizeEan13(barcode);
    const scannedProduct = products.find(p => {
      const pe = normalizeEan13(p.ean13);
      if (pe && pe === nb) return true;
      return p.reference === barcode;
    });
    if (scannedProduct) {
      if (scannedProduct.variations && scannedProduct.variations.length > 0) {
        setSelectedProduct(scannedProduct);
        setVariationModalOpen(true);
      } else {
        onProductClick(scannedProduct);
      }
      setTimeout(() => setSearchTerm(''), 100);
    } else {
      setSearchTerm(barcode);
    }
  }, [products, isEditMode, onProductClick]);
  
  // Écouteur global pour les codes-barres
  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout: ReturnType<typeof setTimeout>;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignorer si on est dans un champ de saisie
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ajouter le caractère au buffer
      barcodeBuffer += e.key;
      
      // Réinitialiser le timeout
      clearTimeout(barcodeTimeout);
      
      // Si on a 13 chiffres, traiter comme un code-barres
      if (/^\d{8,13}$/.test(barcodeBuffer)) {
        console.log(`🎯 Code-barres détecté globalement: ${barcodeBuffer}`);
        e.preventDefault();
        e.stopPropagation();
        handleBarcodeScan(barcodeBuffer);
        barcodeBuffer = '';
      } else if (barcodeBuffer.length > 13) {
        // Buffer trop long, réinitialiser
        barcodeBuffer = '';
      } else {
        // Attendre plus de caractères
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100); // 100ms de délai entre les caractères
      }
    };
    
    // Ajouter l'écouteur global
    // keypress peut être verbeux; éviter la capture si déjà saisi dans inputs
    document.addEventListener('keypress', handleKeyPress);
    
    // Nettoyer l'écouteur
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      clearTimeout(barcodeTimeout);
    };
  }, [products, isEditMode, cartItems, handleBarcodeScan]);



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
          height: applyScale(220), // Hauteur ajustée pour éviter tout recouvrement avec la grille
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

  // Recentrer les barres sur le bouton "Toutes" quand on revient à null
  useEffect(() => {
    if (selectedCategory === null && categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollLeft = 0;
    }
  }, [selectedCategory]);
  useEffect(() => {
    if (selectedSubcategory === null && subcategoriesScrollRef.current) {
      subcategoriesScrollRef.current.scrollLeft = 0;
    }
  }, [selectedSubcategory]);

  // Forcer un re-render quand les filtres changent pour éviter les problèmes de cache
  // const filterKey = `${selectedCategory}-${selectedSubcategory}-${searchTerm}-${currentPage}`;


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

  // Détection d'appareil tactile (non utilisée)

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
      // Réorganiser les produits par échange (swap) entre source et cible
      const draggedIndex = products.findIndex(p => p.id === draggedProduct.id);
      const targetIndex = products.findIndex(p => p.id === targetProduct.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newProducts = [...products];
        const tmp = newProducts[draggedIndex];
        newProducts[draggedIndex] = newProducts[targetIndex];
        newProducts[targetIndex] = tmp;
        
        console.log('Échange de produits:', {
          from: { index: draggedIndex, name: draggedProduct.name },
          to: { index: targetIndex, name: targetProduct.name },
        });
        
        onProductsReorder?.(newProducts);
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

    // Calculer le total avec toutes remises (individuelles + globale)
    const total = getTotalWithGlobalDiscount();

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
      itemDiscounts: { ...itemDiscounts },
      globalDiscount: globalDiscount ? { ...globalDiscount } : null,
    };
    StorageService.addDailyTransaction(tx as any);
    // Sauvegarde automatique complète (silencieuse) + téléchargement JSON (obligatoire après encaissement)
    try { StorageService.addAutoBackup(); } catch {}
    try { StorageService.downloadFullBackup(); } catch {}
    setTodayTransactions(StorageService.loadTodayTransactions());

    // Mettre à jour les compteurs de ventes et vider le panier
    onCheckout();

    // Réinitialiser toutes les remises pour la vente suivante
    setItemDiscounts({});
    setGlobalDiscount(null);

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
  if (process.env.NODE_ENV === 'development' && false) console.log('🔍 Debug Filtrage:', {
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
  
  if (process.env.NODE_ENV === 'development' && false) console.log('🔍 Debug Déduplication:', {
    originalCount: products.length,
    uniqueCount: uniqueProducts.length,
    duplicates: products.length - uniqueProducts.length
  });
  
  const filteredProducts = uniqueProducts.filter(product => {
    // Filtrage par recherche flexible: ordre libre, débuts de mots, sous-séquence, sans accents
    const normalize = (s: string) => (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const rawTokens = normalize(searchTerm).trim().split(/\s+/).filter(Boolean);
    const tokens = rawTokens.filter(t => t.length >= 2);
    const effectiveTokens = tokens.length > 0 ? tokens : rawTokens; // si l'utilisateur tape <2 lettres

    const fields = [
      product.name,
      product.category,
      product.reference,
      product.ean13,
      ...(Array.isArray(product.associatedCategories) ? product.associatedCategories : []),
      ...(Array.isArray(product.variations) ? product.variations.map(v => v.attributes) : [])
    ].map(normalize).join(' ');

    const words = fields.split(/[^a-z0-9]+/).filter(Boolean);
    const nameWords = normalize(product.name).split(/[^a-z0-9]+/).filter(Boolean);
    const acronym = nameWords.map(w => w[0]).join('');
    const isSubsequence = (word: string, token: string) => {
      let i = 0;
      for (let c of word) {
        if (c === token[i]) i++;
        if (i === token.length) return true;
      }
      return false;
    };
    const tokenMatches = (token: string) => {
      // correspond si: préfixe de mot, inclusion, sous-séquence d'un mot, ou sous-séquence de l'acronyme
      if (acronym && isSubsequence(acronym, token)) return true;
      for (const w of words) {
        if (w.startsWith(token)) return true;
        if (w.includes(token)) return true;
        if (isSubsequence(w, token)) return true;
      }
      return false;
    };

    const matchesSearch = effectiveTokens.length === 0 || effectiveTokens.every(tokenMatches);
    
    // Si aucune catégorie ni sous-catégorie n'est sélectionnée, afficher tous les produits
    if (!selectedCategory && !selectedSubcategory) {
      return matchesSearch;
    }
    
    // Filtrage par sous-catégorie (priorité sur la catégorie) —
    // si une catégorie est sélectionnée, on impose aussi la catégorie (intersection)
    if (selectedSubcategory) {
      const target = normalizeSubcategory(String(selectedSubcategory));
      const assoc = Array.isArray(product.associatedCategories) ? product.associatedCategories : [];
      let hasSubcategory = assoc.some(cat => normalizeSubcategory(String(cat)) === target);


      if (!hasSubcategory) return false;
      if (selectedCategory) {
        const selectedCat = categories.find(c => c.id === selectedCategory);
        const matchesCategory = selectedCat && StorageService.normalizeLabel(selectedCat.name) === StorageService.normalizeLabel(product.category);
        return !!matchesCategory && matchesSearch;
      }
      return matchesSearch;
    }
    
    // Filtrage par catégorie par défaut
    if (selectedCategory) {
      const selectedCat = categories.find(c => c.id === selectedCategory);
      const matchesCategory = selectedCat && StorageService.normalizeLabel(selectedCat.name) === StorageService.normalizeLabel(product.category);
      
      // Debug: Afficher les détails de la comparaison
      if (product.name.includes('tee shirt') || product.name.includes('vetement')) {
        if (process.env.NODE_ENV === 'development' && false) console.log('🔍 Debug Produit:', {
          productName: product.name,
          productCategory: product.category,
          selectedCategory,
          categoryFound: selectedCat,
          categoryId: selectedCat?.id,
          matchesCategory
        });
      }
      
      return matchesCategory && matchesSearch;
    }
    
    return matchesSearch;
  });
  
  if (process.env.NODE_ENV === 'development' && false) console.log('🔍 Debug Résultat:', {
    filteredCount: filteredProducts.length,
    firstFewProducts: filteredProducts.slice(0, 3).map(p => ({ name: p.name, category: p.category }))
  });

  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const endIndex = startIndex + CARDS_PER_PAGE;
  
  // Tri: articles les plus vendus aujourd'hui en premier (toutes variations confondues)
  const sortedAndFilteredProducts = isEditMode
    ? filteredProducts
    : [...filteredProducts].sort((a, b) => {
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
  if (process.env.NODE_ENV === 'development' && false) console.log('🔍 Debug CurrentProducts:', {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleMouseDown = (e: React.MouseEvent<HTMLElement>, windowId: string) => {
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleResizeStart = (
    e: React.MouseEvent<HTMLElement>,
    windowId: string,
    direction: string
  ) => {
    e.stopPropagation();
    const win = windows.find(w => w.id === windowId);
    if (!win) return;
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: win.width,
      height: win.height,
    });
    setResizingWindow(windowId);
    setResizeDirection(direction);
    bringToFront(windowId);
  };

  useEffect(() => {
    if (!draggedWindow && !resizingWindow) return;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedWindow, resizingWindow]);

  // Mettre à jour les dimensions de l'écran quand la fenêtre change de taille
  useEffect(() => {
    const handleResize = () => {
      const newDimensions = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      if (
        newDimensions.width === screenDimensions.width &&
        newDimensions.height === screenDimensions.height
      ) {
        return;
      }
      setScreenDimensions(newDimensions);
      
      const newScaleFactor = calculateScaleFactor();
      if (newScaleFactor !== scaleFactor) {
      setScaleFactor(newScaleFactor);
      }
      // logs désactivés
    };

    // Initialisation
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [screenDimensions.width, screenDimensions.height, scaleFactor]);

  
  
  // Fonctions de gestion des déclinaisons
  const handleProductClick = (product: Product) => {
    // Appliquer la quantité saisie si présente
    if (pendingQtyInput && /^\d+$/.test(pendingQtyInput)) {
      const qty = Math.max(1, parseInt(pendingQtyInput, 10));
      setPendingQtyInput('');
      if (product.variations.length > 0) {
        setSelectedProduct(product);
        setVariationModalOpen(true);
      } else {
        // Chercher une ligne existante (sans variation)
        const existing = cartItems.find(item => item.product.id === product.id && !item.selectedVariation);
        if (existing) {
          onUpdateQuantity(product.id, null, existing.quantity + qty);
    } else {
          // Créer la ligne puis la fixer à qty
          onProductClick(product);
          setTimeout(() => onUpdateQuantity(product.id, null, qty), 0);
        }
      }
      return;
    }
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
    // Insérer ou mettre à jour le produit dans la liste
    const exists = products.some(p => p.id === updatedProduct.id);
    const updatedProducts = exists
      ? products.map(p => (p.id === updatedProduct.id ? updatedProduct : p))
      : [updatedProduct, ...products];
    
    if (onProductsReorder) {
      onProductsReorder(updatedProducts);
    }
    
    // Sauvegarder automatiquement dans localStorage
    saveProductionData(updatedProducts, categories);
    
    console.log('✅ Article modifié et sauvegardé avec succès:', updatedProduct.name);
  };

  const handleCreateNewProduct = () => {
    const selectedCategoryName = selectedCategory
      ? (categories.find(c => c.id === selectedCategory)?.name || '')
      : '';
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: '',
      reference: '',
      ean13: '',
      category: selectedCategoryName,
      associatedCategories: [],
      wholesalePrice: 0,
      finalPrice: 0,
      crossedPrice: 0,
      salesCount: 0,
      position: 0,
      remisable: true,
      variations: []
    };
    setSelectedProductForEdit(newProduct);
    setShowProductEditModal(true);
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

    // Ne pas écraser les sous-catégories des produits; only save display order for the category
    const normalizedOrder = Array.from(new Set(newSubcategories
      .map(s => StorageService.sanitizeLabel(s))
      .filter(Boolean)));
    const updatedCategories = categories.map(cat =>
      cat.id === categoryId ? { ...cat, subcategoryOrder: normalizedOrder } as any : cat
    );
    onUpdateCategories?.(updatedCategories);
    saveProductionData(products, updatedCategories);
    console.log(`✅ Ordre des sous-catégories mis à jour pour ${category.name}:`, normalizedOrder);
  };

  // Fonction pour importer un fichier CSV ou JSON nested
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('importing');
    setImportMessage('Import en cours...');

    try {
      // Branche JSON nested
      if (file.name.toLowerCase().endsWith('.json')) {
        const result = await (await import('../services/CSVImportService')).CSVImportService.importJSONNested(file);
        if (!result.success) throw new Error(result.message);

        // Fusion catégories sur nom normalisé
        const normalizeCat = (s: string) => StorageService.normalizeLabel(s);
        const existingByNormName = new Map<string, Category>();
        for (const cat of categories) existingByNormName.set(normalizeCat(cat.name), cat);
        const existingIds = categories
          .map(c => c.id)
          .map(id => (id && /^cat_\d+$/.test(id) ? parseInt(id.split('_')[1], 10) : 0));
        const baseId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        let added = 0;
        const newOnes: Category[] = result.categories
          .filter(c => !existingByNormName.has(normalizeCat(c.name)))
          .map(c => ({ ...c, id: `cat_${baseId + (++added)}` }));
        const mergedCategories: Category[] = [...categories, ...newOnes];

        // Fusion non destructive des produits par id
        const byId = new Map(products.map(p => [p.id, p] as const));
        const mergedProducts: Product[] = (() => {
          const updated = new Map<string, Product>();
          // Commencer par existants
          for (const p of products) updated.set(p.id, p);
          // Appliquer nouveaux
          for (const np of result.products) {
            const existing = byId.get(np.id);
            if (existing) {
              updated.set(np.id, {
                ...existing,
                name: np.name || existing.name,
                category: np.category || existing.category,
                ean13: np.ean13 || existing.ean13,
                finalPrice: Number.isFinite(np.finalPrice as any) ? np.finalPrice : existing.finalPrice,
                wholesalePrice: Number.isFinite(np.wholesalePrice as any) ? np.wholesalePrice : existing.wholesalePrice,
                crossedPrice: Number.isFinite(np.crossedPrice as any) ? np.crossedPrice : existing.crossedPrice,
                // Conserver sous-catégories existantes si non fournies
                associatedCategories: (Array.isArray(np.associatedCategories) && np.associatedCategories.length > 0)
                  ? np.associatedCategories
                  : (existing.associatedCategories || []),
                // Conserver variations si non fournies
                variations: (Array.isArray(np.variations) && np.variations.length > 0)
                  ? np.variations
                  : (existing.variations || []),
              });
            } else {
              updated.set(np.id, np);
            }
          }
          return Array.from(updated.values());
        })();

        // Mettre à jour état + persistance
        onImportComplete(mergedProducts, mergedCategories);
        saveProductionData(mergedProducts, mergedCategories);
        setImportStatus('success');
        setImportMessage(`Import JSON réussi : ${mergedProducts.length} produits, ${mergedCategories.length} catégories`);
        setTimeout(() => { setImportStatus('idle'); setImportMessage(''); }, 1200);
        return;
      }

      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Fichier CSV invalide - pas assez de lignes');
      }

      // Détecter le séparateur: tab, point-virgule, virgule
      const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
      const delimiter = detectDelimiter(lines[0]);
      // Analyser les en-têtes (normalisation pour tolérer accents/variantes)
      // eslint-disable-next-line no-control-regex
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, ''));
      const normalizeHeader = (s: string) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const hIndex = (aliases: string[]) => headers.findIndex(x => aliases.some(a => normalizeHeader(x).includes(normalizeHeader(a))));

      // NOTE: On NE modifie PLUS l'EAN importé; on le conserve tel quel (texte).

      // Mapping des colonnes (robuste)
      const mapping = {
        id: hIndex(['identifiant produit','id product','id']),
        name: hIndex(['nom','name']),
        category: hIndex(['categorie par defaut','catégorie par défaut','categorie']),
        associatedCategories: hIndex(['categories associees','catégories associées']),
        sub1: hIndex(['sous categorie 1','sous-categorie 1']),
        sub2: hIndex(['sous categorie 2','sous-categorie 2']),
        sub3: hIndex(['sous categorie 3','sous-categorie 3']),
        finalPrice: hIndex(['prix de vente ttc final','prix de vente ttc','prix ttc']),
        ean13: hIndex(['ean13','ean']),
        reference: hIndex(['reference','référence']),
        wholesalePrice: hIndex(["prix d'achat ht", 'wholesale_price', 'prix de vente ht']),
        stock: hIndex(['quantite disponible','quantité disponible']),
        type: hIndex(['type']),
        variantId: hIndex(['identifiant declinaison','identifiant déclinaison','id declinaison','id déclinaison']),
        variantAttributes: hIndex(['liste des attributs','attributs','attributes'])
      } as const;

      // Vérifier les colonnes obligatoires
      if (mapping.id === -1 || mapping.name === -1 || mapping.category === -1) {
        throw new Error('Colonnes obligatoires manquantes dans le CSV');
      }

      const newProducts: Product[] = [];
      const categoriesSet = new Set<string>();
      const associatedCategoriesSet = new Set<string>();

      // Traiter chaque ligne
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        if (values.length < Math.max(...Object.values(mapping).filter(v => v !== -1)) + 1) continue;

        try {
          // eslint-disable-next-line no-control-regex
          const id = (values[mapping.id] || `prod_${i}`).replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
          // eslint-disable-next-line no-control-regex
          const name = (values[mapping.name] || 'Produit sans nom').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
          // eslint-disable-next-line no-control-regex
          const category = (values[mapping.category] || 'Général').replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
          const finalPrice = mapping.finalPrice !== -1 ? parsePrice(values[mapping.finalPrice]) : 0;
          // eslint-disable-next-line no-control-regex
          const ean13 = ((values[mapping.ean13] || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '')).trim();
          // eslint-disable-next-line no-control-regex
          const reference = (values[mapping.reference] || '').replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          
          const rowType = mapping.type !== -1 ? String(values[mapping.type] || '').toUpperCase().trim() : '';
          const variantIdRaw = mapping.variantId !== -1 ? String(values[mapping.variantId] || '').trim() : '';
          const variantAttributesRaw = mapping.variantAttributes !== -1 ? String(values[mapping.variantAttributes] || '').trim() : '';
          
          // Traiter les catégories associées (priorité sous-catégories 1..3)
          // Ne pas couper sur les virgules décimales (ex: "6,50").
          // On sépare sur: point-virgule ";", pipe "|" ou virgule non suivie d'un chiffre
          // eslint-disable-next-line no-control-regex
          const associatedCategoriesStr = (mapping.associatedCategories !== -1 ? values[mapping.associatedCategories] : '' ).replace(/[\x00-\x1F\x7F-\x9F]/g, '');
          const extraSubs = [mapping.sub1, mapping.sub2, mapping.sub3]
            .filter(idx => idx !== -1)
            .map(idx => values[idx] || '')
            .filter(Boolean);
          const associatedCategories = (extraSubs.length > 0)
            ? extraSubs
            : associatedCategoriesStr.split(/\s*(?:[;|]|,(?!\d))\s*/)
            .map(cat => StorageService.sanitizeLabel(cat))
            .map(cat => cat.trim())
            .filter(cat => cat && cat.length > 0);
          
          const wholesalePrice = mapping.wholesalePrice !== -1 ? 
            (parsePrice(values[mapping.wholesalePrice]) || (finalPrice > 0 ? finalPrice * 0.8 : 0)) : 
            (finalPrice > 0 ? finalPrice * 0.8 : 0);
          
          const cleanName = name.replace(/[^\w\s\-.]/g, '').trim();
          const cleanCategory = category.replace(/[^\w\s\-.]/g, '').trim();
          const cleanAssociatedCategories = associatedCategories
            .map(cat => StorageService.sanitizeLabel(cat))
            .map(cat => cat.trim())
            .filter(cat => cat && cat.length > 0);
          
          // Si c'est une ligne de variation, on l'attache au produit parent existant ou en cours de création
          const isVariationRow = (rowType === 'VARIATION' || (!!variantIdRaw));
          if (isVariationRow) {
            // Chercher le produit parent par id
            let parent = newProducts.find(p => p.id === id);
            if (!parent) parent = products.find(p => p.id === id);
            // En fallback, tenter par nom + catégorie
            if (!parent) parent = newProducts.find(p => p.name === cleanName && p.category === cleanCategory);
            if (!parent) parent = products.find(p => p.name === cleanName && p.category === cleanCategory);
            if (parent) {
              const variation = {
                id: variantIdRaw || `var_${i}`,
                ean13: ean13,
                reference: reference,
                attributes: variantAttributesRaw,
                priceImpact: 0,
                finalPrice: finalPrice > 0 ? finalPrice : (parent.finalPrice || 0),
              } as ProductVariation;
              parent.variations = Array.isArray(parent.variations) ? [...parent.variations, variation] : [variation];
              continue; // ne pas créer un produit séparé pour cette ligne
            }
            // si aucun parent trouvé, on laissera créer un produit simple ci-dessous
          }
          
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

      // Fusionner les catégories importées avec les existantes en préservant id/couleur/subcategoryOrder
      const normalizeCat = (s: string) => StorageService.normalizeLabel(s);
      const existingByNormName = new Map<string, Category>();
      for (const cat of categories) existingByNormName.set(normalizeCat(cat.name), cat);

      // Calculer le prochain id numérique pour éviter les collisions
      const existingIds = categories
        .map(c => c.id)
        .map(id => (id && /^cat_\d+$/.test(id) ? parseInt(id.split('_')[1], 10) : 0));
      const baseId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      let added = 0;

      // Ne plus supprimer les catégories existantes: on garde tout l'existant et on AJOUTE les nouvelles
      const newOnes: Category[] = Array.from(categoriesSet)
        .filter((catName) => !existingByNormName.has(normalizeCat(catName)))
        .map((catName) => {
          added += 1;
          return {
            id: `cat_${baseId + added}`,
        name: catName,
        color: getRandomColor(),
            productOrder: [],
          } as Category;
        });
      const mergedCategories: Category[] = [...categories, ...newOnes];

      // Appeler la fonction de callback pour mettre à jour les données (sans écraser les ordres existants)
      onImportComplete(newProducts, mergedCategories);

      setImportStatus('success');
      setImportMessage(`Import réussi : ${newProducts.length} produits, ${mergedCategories.length} catégories, ${associatedCategoriesSet.size} sous-catégories`);

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

  // Import des déclinaisons depuis "EXPORT VF DECLINAISONS WYSIWYG.csv"
  const handleImportVariationsCSV = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        alert('Fichier déclinaisons invalide');
        return;
      }
      const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
      const delimiter = detectDelimiter(lines[0]);
      // Nettoyer et normaliser les en-têtes (insensible accents/casse)
      // eslint-disable-next-line no-control-regex
      const rawHeaders = lines[0].split(delimiter).map(h => h.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim());
      const normalizeHeader2 = (s: string) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const normHeaders = rawHeaders.map(normalizeHeader2);
      const h = (aliases: string[]) => {
        const normAliases = aliases.map(normalizeHeader2);
        return normHeaders.findIndex(x => normAliases.some(a => x.includes(a)));
      };
      // Pas de normalisation destructrice sur l'EAN des déclinaisons non plus
      const map = {
        productId: h(['identifiant produit','id product','id']),
        varId: h(['identifiant déclinaison','id declinaison','id combination','id_combination']),
        attributes: h(['liste des attributs','attributes','attribute']),
        ean13: h(['ean13 décl.','ean13 decl.','ean13']),
        reference: h(['référence déclinaison','reference declinaison','reference']),
        impactTtc: h(['impact sur prix de vente ttc','impact ttc','impact sur prix de vente'])
      } as const;
      if (map.productId === -1 || map.attributes === -1) {
        alert('Colonnes clés manquantes dans le CSV déclinaisons');
        return;
      }
      const byProduct: Record<string, any[]> = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        const pid = (cols[map.productId] || '').trim();
        if (!pid) continue;
        // eslint-disable-next-line no-control-regex
        const varId = (map.varId !== -1 ? cols[map.varId] : `var_${i}`).replace(/\u0000/g, '').trim();
        // eslint-disable-next-line no-control-regex
        const attrs = (cols[map.attributes] || '').replace(/\u0000/g, '').trim();
        const ean = map.ean13 !== -1 ? (cols[map.ean13] || '').trim() : '';
        const ref = map.reference !== -1 ? (cols[map.reference] || '').trim() : '';
        const impact = map.impactTtc !== -1 ? parsePrice(cols[map.impactTtc]) : 0;
        if (!byProduct[pid]) byProduct[pid] = [];
        byProduct[pid].push({ id: varId, attributes: attrs, ean13: ean, reference: ref, priceImpact: impact });
      }
      // Mettre à jour les produits existants par identifiant exact
      const updated = products.map(p => {
        const list = byProduct[p.id];
        if (!list || list.length === 0) return p;
        const base = typeof p.finalPrice === 'number' ? p.finalPrice : 0;
        const variations = list.map(v => ({
          id: v.id || `var_${Date.now()}`,
          ean13: v.ean13 || '',
          reference: v.reference || '',
          attributes: v.attributes || '',
          priceImpact: v.priceImpact || 0,
          finalPrice: Math.max(0, base + (v.priceImpact || 0))
        }));
        return { ...p, variations };
      });
      if (onProductsReorder) onProductsReorder(updated);
      saveProductionData(updated, categories);
      alert('Déclinaisons importées et mises à jour.');
    } catch (e) {
      alert('Erreur import déclinaisons.');
    }
  };

  // Réparation EAN (Articles) depuis fichier local
  const handleRepairEANArticles = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('CSV invalide'); return; }
      const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
      const delimiter = detectDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g,' ').trim();
      const idxId = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h) === 'id' || norm(h).includes('id product'));
      const idxEan = headers.findIndex(h => norm(h).includes('ean'));
      if (idxId === -1 || idxEan === -1) { alert('Colonnes ID/EAN manquantes'); return; }
      const eanById = new Map<string,string>();
      for (let i=1;i<lines.length;i++){
        const cols = lines[i].split(delimiter);
        const pid = (cols[idxId]||'').trim();
        const ean = (cols[idxEan]||'').trim();
        if (pid) eanById.set(pid, ean);
      }
      const updated = products.map(p => eanById.has(p.id) ? { ...p, ean13: eanById.get(p.id) || '' } : p);
      onProductsReorder?.(updated);
      saveProductionData(updated, categories);
      alert(`EAN réparés (articles): ${eanById.size}`);
    } catch { alert('Erreur réparation EAN (articles)'); }
  };

  // Réparation EAN (Déclinaisons) depuis fichier local
  const handleRepairEANVariations = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('CSV invalide'); return; }
      const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
      const delimiter = detectDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g,' ').trim();
      const idxPid = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h).includes('id product') || norm(h)==='id');
      const idxAttr = headers.findIndex(h => norm(h).includes('liste des attributs') || norm(h).includes('attributes'));
      const idxEan = headers.findIndex(h => norm(h).includes('ean'));
      if (idxPid === -1 || idxAttr === -1 || idxEan === -1) { alert('Colonnes clés manquantes'); return; }
      const byPid: Record<string, Array<{attributes:string, ean13:string}>> = {};
      for (let i=1;i<lines.length;i++){
        const cols = lines[i].split(delimiter);
        const pid = (cols[idxPid]||'').trim();
        const attributes = (cols[idxAttr]||'').trim();
        const ean = (cols[idxEan]||'').trim();
        if (!pid) continue;
        if (!byPid[pid]) byPid[pid] = [];
        byPid[pid].push({ attributes, ean13: ean });
      }
      const updated = products.map(p => {
        const entries = byPid[p.id];
        if (!entries || entries.length===0) return p;
        const base = typeof p.finalPrice==='number'? p.finalPrice : 0;
        const variations = entries.map((e,idx)=>({
          id: p.variations?.[idx]?.id || `var_${Date.now()}_${idx}`,
          attributes: e.attributes,
          ean13: e.ean13,
          reference: p.variations?.[idx]?.reference || '',
          priceImpact: p.variations?.[idx]?.priceImpact || 0,
          finalPrice: Math.max(0, base + (p.variations?.[idx]?.priceImpact || 0))
        }));
        return { ...p, variations };
      });
      onProductsReorder?.(updated);
      saveProductionData(updated, categories);
      alert('EAN réparés (déclinaisons)');
    } catch { alert('Erreur réparation EAN (déclinaisons)'); }
  };

  // MAJ EAN (Articles) depuis GitHub (CSV brut)
  const handleRepairEANArticlesFromGitHub = async () => {
    try {
      setImportStatus('importing');
      setImportMessage('Téléchargement EAN depuis GitHub...');
      const url = 'https://raw.githubusercontent.com/Kdotropez/Klick-caisse/master/code%20barre%20pour%20synchro.csv';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Téléchargement impossible');
      const text = await res.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV vide');
      const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
      const delimiter = detectDelimiter(lines[0]);
      const headers = lines[0].split(delimiter).map(h => h.trim());
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
      const idxId = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h).includes('id product') || norm(h)==='id');
      const idxEan = headers.findIndex(h => norm(h)==='ean13' || norm(h).includes('ean'));
      if (idxId === -1 || idxEan === -1) throw new Error('Colonnes ID/EAN manquantes');
      const eanById = new Map<string,string>();
      for (let i=1;i<lines.length;i++){
        const cols = lines[i].split(delimiter);
        const pid = (cols[idxId]||'').trim();
        const ean = (cols[idxEan]||'').trim();
        if (pid) eanById.set(pid, ean);
      }
      const updated = products.map(p => eanById.has(p.id) ? { ...p, ean13: eanById.get(p.id) || '' } : p);
      onProductsReorder?.(updated);
      saveProductionData(updated, categories);
      setImportStatus('success');
      setImportMessage(`EAN mis à jour depuis GitHub: ${eanById.size}`);
      setTimeout(()=>{ setImportStatus('idle'); setImportMessage(''); }, 3000);
    } catch (e) {
      setImportStatus('error');
      setImportMessage('Erreur MAJ EAN depuis GitHub');
      setTimeout(()=>{ setImportStatus('idle'); setImportMessage(''); }, 3000);
    }
  };

  // Nettoyer catégories orphelines (qui ne correspondent à aucun produit)
  const handleCleanUnusedCategories = () => {
    const normalizeCat = (s: string) => StorageService.normalizeLabel(s);
    const used = new Set(products.map(p => normalizeCat(p.category)));
    const kept = categories.filter(c => used.has(normalizeCat(c.name)));
    if (kept.length === categories.length) {
      alert('Aucune catégorie orpheline à supprimer.');
      return;
    }
    onUpdateCategories?.(kept);
    saveProductionData(products, kept);
    alert('Catégories orphelines supprimées.');
  };

  // Purger toutes les catégories/sous-catégories localement
  const handlePurgeCategories = () => {
    // Efface les catégories et vide les associations sur les produits
    const purgedProducts = products.map(p => ({
      ...p,
      category: '',
      associatedCategories: [],
    }));
    onProductsReorder?.(purgedProducts);
    onUpdateCategories?.([]);
    // Vider le registre des sous-catégories persistant
    StorageService.saveSubcategories([]);
    // Réinitialiser l'UI
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setCategorySearchTerm('');
    setSubcategorySearchTerm('');
    saveProductionData(purgedProducts, []);
    alert('Catégories et sous-catégories effacées (local). Réimportez vos CSV.');
  };

  // Auditer les EAN (13 chiffres)
  const handleAuditEAN13 = () => {
    const onlyDigits = (s: string) => String(s || '').replace(/\D/g, '');
    let invalidProducts = 0;
    let invalidVariations = 0;
    for (const p of products) {
      const d = onlyDigits(p.ean13);
      if (d && d.length !== 13) invalidProducts += 1;
      if (Array.isArray(p.variations)) {
        for (const v of p.variations) {
          const dv = onlyDigits(v.ean13);
          if (dv && dv.length !== 13) invalidVariations += 1;
        }
      }
    }
    alert(`Audit EAN: produits invalides=${invalidProducts}, déclinaisons invalides=${invalidVariations}.\nUtilisez "Réparer EAN (Articles)" et "Réparer EAN (Décl.)" pour mettre à jour.`);
  };

  // Importer Articles et Déclinaisons depuis GitHub (raw)
  // util retiré (plus d'import GitHub)

  // (Import GitHub retiré sur demande)

  // Réinitialiser base (GitHub) retiré sur demande

  // Backup: exporter tout en JSON
  const handleExportAll = () => {
    const data = StorageService.exportFullBackup();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.download = `klick-caisse-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleImportAll = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      StorageService.importFullBackup(json);
      setTodayTransactions(StorageService.loadTodayTransactions());
      alert('Import terminé. Rechargez la page si nécessaire.');
    } catch (e) {
      alert('Fichier invalide ou erreur d\'import.');
    }
  };

  // Import sélectif: Transactions + Clôtures uniquement (ne touche pas produits/catégories)
  const handleImportTxOnly = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      // Transactions du jour et clôtures seulement
      if (json && typeof json === 'object') {
        const tx = (json as any).transactionsByDay ?? (json as any).transactions_by_day ?? (json as any).klick_caisse_transactions_by_day;
        if (tx && typeof tx === 'object') {
          localStorage.setItem('klick_caisse_transactions_by_day', JSON.stringify(tx));
        }
        const closures = (json as any).closures ?? (json as any).klick_caisse_closures;
        if (Array.isArray(closures)) {
          StorageService.saveAllClosures(closures);
        }
        const zCounter = (json as any).zCounter ?? (json as any).z_counter ?? (json as any).klick_caisse_z_counter;
        if (Number.isFinite(Number(zCounter))) {
          localStorage.setItem('klick_caisse_z_counter', String(Number(zCounter)));
        }
      }
      setTodayTransactions(StorageService.loadTodayTransactions());
      alert('Import sélectif (tickets/clôtures) terminé.');
    } catch (e) {
      alert('Fichier invalide ou erreur d\'import (sélectif).');
    }
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



  // Poignées de redimensionnement désactivées (fonction non utilisée)

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
          <ProductsPanel
            width={window.width}
            height={window.height}
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
            currentProducts={currentProducts}
            getCategoryColor={getCategoryColor}
            dailyQtyByProduct={dailyQtyByProduct}
            isEditMode={isEditMode}
            selectedProductsForDeletion={selectedProductsForDeletion}
            setSelectedProductsForDeletion={(next) => setSelectedProductsForDeletion(next)}
            dragOverProduct={dragOverProduct}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onProductClick={handleProductClick}
            onEditProduct={(p) => { setSelectedProductForEdit(p); setShowProductEditModal(true); }}
          />
        );

      case 'cart':
        return (
          <CartPanel
            cartItems={cartItems}
            itemDiscounts={itemDiscounts as any}
            globalDiscount={globalDiscount as any}
            getItemFinalPrice={getItemFinalPrice}
            getTotalWithGlobalDiscount={getTotalWithGlobalDiscount}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onOpenDiscountModal={openDiscountModal}
            onOpenRecap={() => setShowRecapModal(true)}
            onOpenGlobalDiscount={openGlobalDiscountModal}
            // Ouvre le tableau des remises via le bouton Récap s'il faut un accès rapide
            onResetCartAndDiscounts={() => { 
  setItemDiscounts({}); 
  setGlobalDiscount(null); 
  setLockedCompensations({ seau: {}, vasque: {} });
  cartItems.forEach(item => onRemoveItem(item.product.id, item.selectedVariation?.id || null)); 
}}
            onRemoveItemDiscount={(key) => { const next = { ...itemDiscounts } as any; delete next[key]; setItemDiscounts(next); }}
            onClearGlobalDiscount={() => setGlobalDiscount(null)}
            promoBanner={null}
            autoGlassDiscountEnabled={autoGlassDiscountEnabled}
            onToggleAutoGlassDiscount={() => setAutoGlassDiscountEnabled(v => !v)}
            autoAssocDiscountEnabled={autoAssocDiscountEnabled}
            onToggleAutoAssocDiscount={() => setAutoAssocDiscountEnabled(v => !v)}
          />
        );

             case 'categories':
         return (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Ligne 1: Boutons des catégories */}
            <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider', overflow: 'hidden' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant={selectedCategory === null ? 'contained' : 'outlined'}
                  onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                  sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.75rem', py: 0.25, px: 1 }}
                >
                  Toutes
                </Button>
                <Box ref={categoriesScrollRef} sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', overflowX: 'auto', overflowY: 'hidden', '&::-webkit-scrollbar': { display: 'none' } }}>
                  {categories
                    .filter(c => !categorySearchTerm || StorageService.normalizeLabel(c.name).includes(StorageService.normalizeLabel(categorySearchTerm)))
                    .map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? 'contained' : 'outlined'}
                      onClick={() => { setSelectedCategory(category.id); setSelectedSubcategory(null); }}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.75rem', py: 0.25, px: 1 }}
                    >
                      {category.name}
                    </Button>
                  ))}
                  <Button variant="outlined" size="small" onClick={()=>setShowDiscountRules(true)} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>Barèmes remises</Button>
                </Box>
              </Box>
            </Box>

            {/* Ligne 1bis: Sous-catégories (dynamiques) */}
            <Box sx={{ px: 1, py: 0.5, borderBottom: '1px solid #eee', backgroundColor: '#fafafa', overflow: 'hidden' }}>
              {(() => {
                // Construire la liste en dédupliquant sur une clé normalisée (insensible accents/casse)
                const selectedCatName = selectedCategory ? (categories.find(c => c.id === selectedCategory)?.name || '') : '';
                const catKey = (s: string) => StorageService.normalizeLabel(s);
                const normSelected = catKey(selectedCatName);
                const normToDisplay = new Map<string, string>();
                for (const p of products) {
                   if (selectedCatName) {
                     const pc = catKey(p.category || '');
                     if (pc !== normSelected) continue;
                   }
                  if (Array.isArray(p.associatedCategories)) {
                     const cleaned = p.associatedCategories
                      .map(sc => String(sc || '').trim())
                      .filter(sc => sc && sc !== '\\u0000')
                      .filter(sc => {
                        const norm = StorageService.normalizeLabel(sc);
                        const alnum = norm.replace(/[^a-z0-9]/g, '');
                        return alnum.length >= 2;
                      });
                for (const n of cleaned) {
                  const norm = StorageService.normalizeLabel(n);
                  const key = normalizeDecimals(norm);
                      if (!normToDisplay.has(key)) normToDisplay.set(key, n);
                    }
                  }
                }
                let list = Array.from(normToDisplay.values()).sort((a,b)=>a.localeCompare(b, 'fr', { sensitivity: 'base' }));
                // Appliquer l'ordre personnalisé si défini pour la catégorie sélectionnée
                if (selectedCategory) {
                  const cat = categories.find(c => c.id === selectedCategory);
                  const order = (cat && (cat as any).subcategoryOrder) as string[] | undefined;
                   if (order && Array.isArray(order) && order.length > 0) {
                     const norm = (s: string) => StorageService.normalizeLabel(s);
                    list.sort((a, b) => {
                      const ia = order.findIndex(o => norm(o) === norm(a));
                      const ib = order.findIndex(o => norm(o) === norm(b));
                      const aa = ia === -1 ? Number.MAX_SAFE_INTEGER : ia;
                      const bb = ib === -1 ? Number.MAX_SAFE_INTEGER : ib;
                      if (aa !== bb) return aa - bb;
                      return a.localeCompare(b, 'fr', { sensitivity: 'base' });
                    });
                  }
                }
                // En "Toute catégorie", garder l'affichage complet des sous-catégories dans la barre
                // même si une sous-catégorie est sélectionnée (on ne filtre que la grille)
                if (list.length === 0 && !selectedCategory) {
                  try {
                    const registry = StorageService.loadSubcategories();
                    list = Array.isArray(registry) ? registry.slice(0, 200) : [];
                  } catch {
                    list = [];
                  }
                }
                const normSelectedSub = StorageService.normalizeLabel(String(selectedSubcategory || ''));
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Button
                      size="small"
                      variant={selectedSubcategory === null ? 'contained' : 'outlined'}
                      onClick={() => setSelectedSubcategory(null)}
                      sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.72rem', py: 0.2, px: 0.8 }}
                    >
                      Toutes
                    </Button>
                    <Box ref={subcategoriesScrollRef} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                      {list
                        .filter(sc => !subcategorySearchTerm || StorageService.normalizeLabel(sc).includes(StorageService.normalizeLabel(subcategorySearchTerm)))
                        .map(sc => {
                        const norm = StorageService.normalizeLabel(sc);
                        const isActive = norm === normSelectedSub;
                        return (
                          <Button
                            key={sc}
                            size="small"
                            variant={isActive ? 'contained' : 'outlined'}
                            onClick={() => setSelectedSubcategory(sc)}
                            sx={{ textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'fit-content', flexShrink: 0, fontSize: '0.72rem', py: 0.2, px: 0.8 }}
                          >
                            {sc}
                          </Button>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })()}
            </Box>

            {/* Ligne 2: Recherches */}
            <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', borderBottom: '1px solid #eee' }}>
              <TextField
                size="small"
                placeholder="Rechercher article..."
                variant="outlined"
                sx={{ flex: 1 }}
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
              <TextField
                size="small"
                placeholder="Rechercher catégorie..."
                variant="outlined"
                sx={{ width: 220 }}
                value={categorySearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategorySearchTerm(e.target.value)}
              />
              <TextField
                size="small"
                placeholder="Rechercher sous-catégorie..."
                variant="outlined"
                sx={{ width: 240 }}
                value={subcategorySearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubcategorySearchTerm(e.target.value)}
              />
            </Box>

            {/* Ligne 3+4 combinées: Supprimer (si sélection) + Tri / Reset / Modifier article / Nouvel article / Gérer sous-catégories */}
            <Box sx={{ p: 1, display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee', flexWrap: 'nowrap' }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                {isEditMode && selectedProductsForDeletion.size > 0 && (
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => {
                      const ids = Array.from(selectedProductsForDeletion);
                      if (ids.length === 0) return;
                      // eslint-disable-next-line no-restricted-globals
                      if (!confirm(`Supprimer ${ids.length} article(s) sélectionné(s) ?`)) return;
                      const updatedProducts = products.filter(p => !ids.includes(p.id));
                      onProductsReorder?.(updatedProducts);
                      setSelectedProductsForDeletion(new Set());
                    }}
                  >
                    Supprimer ({selectedProductsForDeletion.size})
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                <Button
                  variant={productSortMode === 'sales' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setProductSortMode(productSortMode === 'sales' ? 'name' : 'sales')}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  {productSortMode === 'sales' ? 'Alphabétique' : 'Plus vendus'}
                </Button>
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
                    if (categoriesScrollRef.current) categoriesScrollRef.current.scrollLeft = 0;
                    if (subcategoriesScrollRef.current) subcategoriesScrollRef.current.scrollLeft = 0;
                  }}
                >
                  Reset
                </Button>
                <Button
                  variant={isEditMode ? 'outlined' : 'contained'}
                  size="small"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? 'Mode vente' : 'Modifier article'}
                </Button>
                <Button variant="contained" size="small" onClick={handleCreateNewProduct}>➕ Nouvel article</Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowSubcategoryManagementModal(true)}
                >
                  Gérer sous-catégories
                </Button>
              </Box>
            </Box>
          </Box>
              );
              // fin rendu catégories délégué à CategoriesPanelFull

             case 'search':
         return (
          <PaymentPanel
            cartItems={cartItems}
            totalAmount={getTotalWithGlobalDiscount()}
            paymentTotals={paymentTotals as any}
            onPayCash={() => handleDirectPayment('Espèces')}
            onPaySumUp={() => handleDirectPayment('SumUp')}
            onPayCard={() => handleDirectPayment('Carte')}
            onOpenCashRecap={() => { setPaymentRecapMethod('cash'); setShowPaymentRecap(true); }}
            onOpenSumUpRecap={() => { setPaymentRecapMethod('sumup'); setShowPaymentRecap(true); }}
            onOpenCardRecap={() => { setPaymentRecapMethod('card'); setShowPaymentRecap(true); }}
          />
         );

      case 'settings':
        return (
          <SettingsPanel
            width={window.width}
            height={window.height}
            getScaledFontSize={getScaledFontSize}
            importStatus={importStatus}
            onImportCSV={handleImportCSV}
            onImportVariationsCSV={(file)=>handleImportVariationsCSV(file)}
            onOpenCategoryManagement={() => setShowCategoryManagementModal(true)}
            onOpenSubcategoryManagement={() => setShowSubcategoryManagementModal(true)}
            isEditMode={isEditMode}
            onClearAllCategories={() => {
              const ok = typeof globalThis !== 'undefined' && typeof (globalThis as any).confirm === 'function'
                ? (globalThis as any).confirm('Effacer TOUTES les catégories ? Les produits resteront mais leur champ category sera vidé.')
                : true;
              if (!ok) return;
              const clearedProducts = products.map(p => ({ ...p, category: '' }));
              const clearedCategories: Category[] = [];
              onImportComplete(clearedProducts, clearedCategories);
              saveProductionData(clearedProducts, clearedCategories);
              if (typeof (globalThis as any).alert === 'function') (globalThis as any).alert('Toutes les catégories ont été effacées.');
            }}
            onToggleEditMode={() => {
              const newEditMode = !isEditMode;
              setIsEditMode(newEditMode);
              setShowEditModeNotification(newEditMode);
              setSelectedProductsForDeletion(new Set());
            }}
            selectedProductsForDeletionSize={selectedProductsForDeletion.size}
            areAllProductsSelected={selectedProductsForDeletion.size === products.length}
            onDeleteSelectedProducts={() => {
              // eslint-disable-next-line no-restricted-globals
              if (confirm(`Supprimer ${selectedProductsForDeletion.size} article(s) sélectionné(s) ?`)) {
                const selectedIds = Array.from(selectedProductsForDeletion);
                const updatedProducts = products.filter(p => !selectedIds.includes(p.id));
                onProductsReorder?.(updatedProducts);
                setSelectedProductsForDeletion(new Set());
              }
            }}
            onToggleSelectAllProducts={() => {
              if (selectedProductsForDeletion.size === products.length) {
                setSelectedProductsForDeletion(new Set());
              } else {
                setSelectedProductsForDeletion(new Set(products.map(p => p.id)));
              }
            }}
            onExportAll={handleExportAll}
            onImportAll={handleImportAll}
            onImportTxOnly={handleImportTxOnly}
            onOpenDiscountRules={() => setShowDiscountRules(true)}
          />
        )

      case 'import':
        return (
          <ImportPanel
            productsCount={products.length}
            categoriesCount={categories.length}
            importStatus={importStatus as any}
            importMessage={importMessage}
            onImportCSV={handleImportCSV}
            onRepairEANArticles={async (file: File) => {
              try {
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) { alert('CSV invalide'); return; }
                const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
                const delimiter = detectDelimiter(lines[0]);
                const headers = lines[0].split(delimiter).map(h => h.trim());
                const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g,' ').trim();
                const idxId = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h) === 'id' || norm(h).includes('id product'));
                const idxEan = headers.findIndex(h => norm(h).includes('ean'));
                if (idxId === -1 || idxEan === -1) { alert('Colonnes ID/EAN manquantes'); return; }
                const eanById = new Map<string,string>();
                for (let i=1;i<lines.length;i++){
                  const cols = lines[i].split(delimiter);
                  const pid = (cols[idxId]||'').trim();
                  const ean = (cols[idxEan]||'').trim();
                  if (pid) eanById.set(pid, ean);
                }
                const updated = products.map(p => eanById.has(p.id) ? { ...p, ean13: eanById.get(p.id) || '' } : p);
                onProductsReorder?.(updated);
                saveProductionData(updated, categories);
                alert(`EAN réparés (articles): ${eanById.size}`);
              } catch { alert('Erreur réparation EAN (articles)'); }
            }}
            onRepairEANVariations={async (file: File) => {
              try {
                const text = await file.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) { alert('CSV invalide'); return; }
                const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
                const delimiter = detectDelimiter(lines[0]);
                const headers = lines[0].split(delimiter).map(h => h.trim());
                const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g,' ').trim();
                const idxPid = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h).includes('id product') || norm(h)==='id');
                const idxAttr = headers.findIndex(h => norm(h).includes('liste des attributs') || norm(h).includes('attributes'));
                const idxEan = headers.findIndex(h => norm(h).includes('ean'));
                if (idxPid === -1 || idxAttr === -1 || idxEan === -1) { alert('Colonnes clés manquantes'); return; }
                const byPid: Record<string, Array<{attributes:string, ean13:string}>> = {};
                for (let i=1;i<lines.length;i++){
                  const cols = lines[i].split(delimiter);
                  const pid = (cols[idxPid]||'').trim();
                  const attributes = (cols[idxAttr]||'').trim();
                  const ean = (cols[idxEan]||'').trim();
                  if (!pid) continue;
                  if (!byPid[pid]) byPid[pid] = [];
                  byPid[pid].push({ attributes, ean13: ean });
                }
                const updated = products.map(p => {
                  const entries = byPid[p.id];
                  if (!entries || entries.length===0) return p;
                  const base = typeof p.finalPrice==='number'? p.finalPrice : 0;
                  const variations = entries.map((e,idx)=>({
                    id: p.variations?.[idx]?.id || `var_${Date.now()}_${idx}`,
                    attributes: e.attributes,
                    ean13: e.ean13,
                    reference: p.variations?.[idx]?.reference || '',
                    priceImpact: p.variations?.[idx]?.priceImpact || 0,
                    finalPrice: Math.max(0, base + (p.variations?.[idx]?.priceImpact || 0))
                  }));
                  return { ...p, variations };
                });
                onProductsReorder?.(updated);
                saveProductionData(updated, categories);
                alert('EAN réparés (déclinaisons)');
              } catch { alert('Erreur réparation EAN (déclinaisons)'); }
            }}
            onRepairEANArticlesFromGitHub={async () => {
              try {
                setImportStatus('importing');
                setImportMessage('Téléchargement EAN depuis GitHub...');
                const url = 'https://raw.githubusercontent.com/Kdotropez/Klick-caisse/master/code%20barre%20pour%20synchro.csv';
                const res = await fetch(url, { cache: 'no-store' });
                if (!res.ok) throw new Error('Téléchargement impossible');
                const text = await res.text();
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 2) throw new Error('CSV vide');
                const detectDelimiter = (s: string) => (s.includes('\t') ? '\t' : (s.includes(';') ? ';' : ','));
                const delimiter = detectDelimiter(lines[0]);
                const headers = lines[0].split(delimiter).map(h => h.trim());
                const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
                const idxId = headers.findIndex(h => norm(h).includes('identifiant produit') || norm(h).includes('id product') || norm(h)==='id');
                const idxEan = headers.findIndex(h => norm(h)==='ean13' || norm(h).includes('ean'));
                if (idxId === -1 || idxEan === -1) throw new Error('Colonnes ID/EAN manquantes');
                const eanById = new Map<string,string>();
                for (let i=1;i<lines.length;i++){
                  const cols = lines[i].split(delimiter);
                  const pid = (cols[idxId]||'').trim();
                  const ean = (cols[idxEan]||'').trim();
                  if (pid) eanById.set(pid, ean);
                }
                const updated = products.map(p => eanById.has(p.id) ? { ...p, ean13: eanById.get(p.id) || '' } : p);
                onProductsReorder?.(updated);
                saveProductionData(updated, categories);
                setImportStatus('success');
                setImportMessage(`EAN mis à jour depuis GitHub: ${eanById.size}`);
                setTimeout(()=>{ setImportStatus('idle'); setImportMessage(''); }, 3000);
              } catch (e) {
                setImportStatus('error');
                setImportMessage('Erreur MAJ EAN depuis GitHub');
                setTimeout(()=>{ setImportStatus('idle'); setImportMessage(''); }, 3000);
              }
            }}
          />
        );

        case 'stats':
          return (
            <StatsPanel
              width={window.width}
              height={window.height}
              onOpenDailyReport={() => setShowDailyReportModal(true)}
              onOpenGlobalDiscount={() => openGlobalDiscountModal()}
              onOpenSalesRecap={() => setShowSalesRecap(true)}
              onOpenGlobalTickets={() => { setGlobalOnlyToday(false); setShowGlobalTickets(true); }}
              onOpenClosures={() => { setClosures(StorageService.loadClosures()); setSelectedClosureIdx(null); setShowClosures(true); }}
              onOpenEndOfDay={() => setShowEndOfDay(true)}
              totalDailyDiscounts={totalDailyDiscounts}
            />
          );

        case 'subcategories':
          return (<SubcategoriesPanel />);

        case 'free':
          return (
            <FreePanel
              width={window.width}
              height={window.height}
              getScaledFontSize={getScaledFontSize}
              highlight={window.id === 'window8'}
              isEditMode={isEditMode}
              onToggleEditMode={() => {
                const newEditMode = !isEditMode;
                setIsEditMode(newEditMode);
                setShowEditModeNotification(newEditMode);
                setSelectedProductsForDeletion(new Set());
              }}
              onRepairEANArticles={handleRepairEANArticles}
              onRepairEANVariations={handleRepairEANVariations}
              onRepairEANArticlesFromGitHub={handleRepairEANArticlesFromGitHub}
              onCleanUnusedCategories={handleCleanUnusedCategories}
              onPurgeCategories={handlePurgeCategories}
              onAuditEAN13={handleAuditEAN13}

            />
          );



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
          .filter(window => ['categories', 'products', 'cart', 'search', 'window5', 'window6', 'window7'].includes(window.id)) // Afficher les fenêtres utiles
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
         itemDiscounts={itemDiscounts as any}
         globalDiscount={globalDiscount as any}
         getItemFinalPrice={getItemFinalPrice}
       />
       

       {/* Modale de remise globale */}
       <GlobalDiscountModal
         open={showGlobalDiscountModal}
         onClose={() => setShowGlobalDiscountModal(false)}
         cartItems={cartItems}
         onApplyDiscount={applyGlobalDiscount}
        onApplyItemDiscount={applyItemDiscount}
         onRemoveItemDiscount={(itemId, variationId)=>{
           const key = `${itemId}-${variationId || 'main'}`;
           const next = { ...itemDiscounts } as any;
           delete next[key];
           setItemDiscounts(next);
         }}
       />

       {/* Modale barèmes remises */}
       <DiscountRulesModal
         open={showDiscountRules}
         onClose={()=>setShowDiscountRules(false)}
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
      <TransactionHistoryModal
        open={showTransactionHistory}
        onClose={() => setShowTransactionHistory(false)}
        transactions={todayTransactions}
        filterPayment={filterPayment as any}
        setFilterPayment={(v:any) => setFilterPayment(v)}
        filterAmountMin={filterAmountMin}
        setFilterAmountMin={setFilterAmountMin}
        filterAmountMax={filterAmountMax}
        setFilterAmountMax={setFilterAmountMax}
        filterAmountExact={filterAmountExact}
        setFilterAmountExact={setFilterAmountExact}
        filterProductText={filterProductText}
        setFilterProductText={setFilterProductText}
        daySelectedIds={daySelectedIds}
        setDaySelectedIds={(updater:any) => setDaySelectedIds(prev => updater(prev))}
        expandedDayTicketIds={expandedDayTicketIds}
        setExpandedDayTicketIds={(updater:any) => setExpandedDayTicketIds(prev => updater(prev))}
        setTransactions={setTodayTransactions as any}
      />

      {/* Modale tickets globaux (toutes clôtures cumulées) */}
      <GlobalTicketsModal
        open={showGlobalTickets}
        onClose={() => setShowGlobalTickets(false)}
        onlyToday={globalOnlyToday}
        setOnlyToday={(v:boolean)=>setGlobalOnlyToday(v)}
        filterPayment={globalFilterPayment as any}
        setFilterPayment={(v:any)=>setGlobalFilterPayment(v)}
        amountMin={globalAmountMin}
        setAmountMin={setGlobalAmountMin}
        amountMax={globalAmountMax}
        setAmountMax={setGlobalAmountMax}
        amountExact={globalAmountExact}
        setAmountExact={setGlobalAmountExact}
        dateFrom={globalDateFrom}
        setDateFrom={setGlobalDateFrom}
        dateTo={globalDateTo}
        setDateTo={setGlobalDateTo}
        timeFrom={globalTimeFrom}
        setTimeFrom={setGlobalTimeFrom}
        timeTo={globalTimeTo}
        setTimeTo={setGlobalTimeTo}
        selectedIds={globalSelectedIds}
        setSelectedIds={(updater:any)=>setGlobalSelectedIds(prev=>updater(prev))}
        expandedIds={expandedGlobalTicketIds}
        setExpandedIds={(updater:any)=>setExpandedGlobalTicketIds(prev=>updater(prev))}
        showDiscountDetails={showDiscountDetails}
        setShowDiscountDetails={setShowDiscountDetails}
        onOpenEditor={(tid:string)=>{
          const todays = StorageService.loadTodayTransactions();
          let tx: any = todays.find(t => String(t.id) === String(tid));
          let isToday = !!tx;
          if (!tx) {
            const closures = StorageService.loadClosures();
            for (const c of closures) {
              const arr = Array.isArray(c.transactions) ? c.transactions : [];
              const found = arr.find((t: any) => String(t.id) === String(tid));
              if (found) { tx = found; break; }
            }
          }
          if (!tx) return;
          const draft = { ...tx, items: (Array.isArray(tx.items)?tx.items:[]).map((it:any)=>({ ...it })) };
          setGlobalEditorDraft(draft);
          setGlobalEditorIsToday(!!isToday);
          setShowGlobalEditor(true);
        }}
        refreshTodayTransactions={()=>setTodayTransactions(StorageService.loadTodayTransactions())}
      />
      {/* La modale inline précédente a été remplacée par GlobalTicketsModal */}

      {/* Éditeur d'un ticket depuis Tickets globaux */}
      <GlobalTicketEditorModal
        open={showGlobalEditor}
        onClose={() => setShowGlobalEditor(false)}
        isToday={globalEditorIsToday}
        draft={globalEditorDraft}
        setDraft={(updater:any)=>setGlobalEditorDraft((prev:any)=>updater(prev))}
        refreshToday={()=>setTodayTransactions(StorageService.loadTodayTransactions())}
      />

      {/* Modale des clôtures (archives) */}
      <ClosuresModal
        open={showClosures}
        onClose={() => setShowClosures(false)}
        closures={closures}
        selectedIdx={selectedClosureIdx}
        setSelectedIdx={setSelectedClosureIdx}
        computeDailyProductSales={computeDailyProductSales}
      />

      {/* Modale récap par mode de règlement */}
      <PaymentRecapByMethodModal
        open={showPaymentRecap}
        onClose={() => setShowPaymentRecap(false)}
        method={paymentRecapMethod as any}
        sort={paymentRecapSort as PaymentRecapSort}
        onChangeSort={(s) => setPaymentRecapSort(s as any)}
        transactions={(() => {
          try {
            const raw = localStorage.getItem('klick_caisse_transactions_by_day');
            if (!raw) return [];
            const map = JSON.parse(raw);
            const list = Array.isArray(map[recapDate]) ? map[recapDate] : [];
            return list.map((t:any)=>({ ...t, timestamp: new Date(t.timestamp) }));
          } catch { return todayTransactions; }
        })()}
      />

      {/* Modale récapitulatif ventes du jour */}
      <Dialog open={showSalesRecap} onClose={() => setShowSalesRecap(false)} maxWidth="md" fullWidth>
        <DialogTitle>Récapitulatif des ventes du jour</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 1 }}>
            <input type="date" value={recapDate} onChange={(e)=> setRecapDate(e.target.value)} />
          </Box>
          {(() => {
            const rows = computeDailyProductSales((() => {
              try {
                const raw = localStorage.getItem('klick_caisse_transactions_by_day');
                if (!raw) return [];
                const map = JSON.parse(raw);
                const list = Array.isArray(map[recapDate]) ? map[recapDate] : [];
                return list.map((t:any)=>({ ...t, timestamp: new Date(t.timestamp) }));
              } catch { return todayTransactions; }
            })());
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
      <EndOfDayModal
        open={showEndOfDay}
        onClose={() => setShowEndOfDay(false)}
        transactions={todayTransactions}
        computeDailyProductSales={computeDailyProductSales}
        refreshToday={()=>setTodayTransactions(StorageService.loadTodayTransactions())}
      />

      {/* Modale d'édition de ticket supprimée (remplacée par l'édition via Tickets jour) */}

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