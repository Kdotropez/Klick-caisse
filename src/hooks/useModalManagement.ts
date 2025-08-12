import { useState } from 'react';
import { Product, CartItem } from '../types/Product';

export const useModalManagement = () => {
  // Modals de produits
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductEditModal, setShowProductEditModal] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);

  // Modals de remises
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showGlobalDiscountModal, setShowGlobalDiscountModal] = useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<CartItem | null>(null);

  // Modals de gestion
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false);
  const [showSubcategoryManagementModal, setShowSubcategoryManagementModal] = useState(false);

  // Modals de rapports
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showSalesRecap, setShowSalesRecap] = useState(false);
  const [showPaymentRecap, setShowPaymentRecap] = useState(false);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [showClosures, setShowClosures] = useState(false);
  const [showGlobalTickets, setShowGlobalTickets] = useState(false);
  const [showGlobalEditor, setShowGlobalEditor] = useState(false);

  // Modals de paiement
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');

  // États pour les modals de transactions
  const [recapDate, setRecapDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [paymentRecapMethod, setPaymentRecapMethod] = useState<'cash' | 'card' | 'sumup' | 'all'>('cash');
  const [paymentRecapSort, setPaymentRecapSort] = useState<'amount' | 'name' | 'qty' | 'category' | 'subcategory'>('amount');
  const [closures, setClosures] = useState<any[]>([]);
  const [selectedClosureIdx, setSelectedClosureIdx] = useState<number | null>(null);
  const [globalEditorDraft, setGlobalEditorDraft] = useState<any | null>(null);
  const [globalEditorIsToday, setGlobalEditorIsToday] = useState<boolean>(false);

  // Actions pour les modals de produits
  const openVariationModal = (product: Product) => {
    setSelectedProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setSelectedProduct(null);
  };

  const openProductEditModal = (product: Product) => {
    setSelectedProductForEdit(product);
    setShowProductEditModal(true);
  };

  const closeProductEditModal = () => {
    setShowProductEditModal(false);
    setSelectedProductForEdit(null);
  };

  // Actions pour les modals de remises
  const openDiscountModal = (item: CartItem) => {
    setSelectedItemForDiscount(item);
    setShowDiscountModal(true);
  };

  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    setSelectedItemForDiscount(null);
  };

  const openGlobalDiscountModal = () => {
    setShowGlobalDiscountModal(true);
  };

  const closeGlobalDiscountModal = () => {
    setShowGlobalDiscountModal(false);
  };

  // Actions pour les modals de gestion
  const openCategoryManagementModal = () => {
    setShowCategoryManagementModal(true);
  };

  const closeCategoryManagementModal = () => {
    setShowCategoryManagementModal(false);
  };

  const openSubcategoryManagementModal = () => {
    setShowSubcategoryManagementModal(true);
  };

  const closeSubcategoryManagementModal = () => {
    setShowSubcategoryManagementModal(false);
  };

  // Actions pour les modals de rapports
  const openRecapModal = () => {
    setShowRecapModal(true);
  };

  const closeRecapModal = () => {
    setShowRecapModal(false);
  };

  const openDailyReportModal = () => {
    setShowDailyReportModal(true);
  };

  const closeDailyReportModal = () => {
    setShowDailyReportModal(false);
  };

  const openTransactionHistory = () => {
    setShowTransactionHistory(true);
  };

  const closeTransactionHistory = () => {
    setShowTransactionHistory(false);
  };

  const openSalesRecap = () => {
    setShowSalesRecap(true);
  };

  const closeSalesRecap = () => {
    setShowSalesRecap(false);
  };

  const openPaymentRecap = () => {
    setShowPaymentRecap(true);
  };

  const closePaymentRecap = () => {
    setShowPaymentRecap(false);
  };

  const openEndOfDay = () => {
    setShowEndOfDay(true);
  };

  const closeEndOfDay = () => {
    setShowEndOfDay(false);
  };

  const openClosures = () => {
    setShowClosures(true);
  };

  const closeClosures = () => {
    setShowClosures(false);
  };

  const openGlobalTickets = () => {
    setShowGlobalTickets(true);
  };

  const closeGlobalTickets = () => {
    setShowGlobalTickets(false);
  };

  const openGlobalEditor = (draft: any, isToday: boolean = false) => {
    setGlobalEditorDraft(draft);
    setGlobalEditorIsToday(isToday);
    setShowGlobalEditor(true);
  };

  const closeGlobalEditor = () => {
    setShowGlobalEditor(false);
    setGlobalEditorDraft(null);
    setGlobalEditorIsToday(false);
  };

  // Actions pour les modals de paiement
  const showPaymentSuccessNotification = (method: string) => {
    setPaymentMethod(method);
    setShowPaymentSuccess(true);
  };

  const hidePaymentSuccessNotification = () => {
    setShowPaymentSuccess(false);
    setPaymentMethod('');
  };

  return {
    // États des modals
    variationModalOpen,
    selectedProduct,
    showProductEditModal,
    selectedProductForEdit,
    showDiscountModal,
    showGlobalDiscountModal,
    selectedItemForDiscount,
    showCategoryManagementModal,
    showSubcategoryManagementModal,
    showRecapModal,
    showDailyReportModal,
    showTransactionHistory,
    showSalesRecap,
    showPaymentRecap,
    showEndOfDay,
    showClosures,
    showGlobalTickets,
    showGlobalEditor,
    showPaymentSuccess,
    paymentMethod,

    // États pour les modals de transactions
    recapDate,
    setRecapDate,
    paymentRecapMethod,
    setPaymentRecapMethod,
    paymentRecapSort,
    setPaymentRecapSort,
    closures,
    setClosures,
    selectedClosureIdx,
    setSelectedClosureIdx,
    globalEditorDraft,
    setGlobalEditorDraft,
    globalEditorIsToday,
    setGlobalEditorIsToday,

    // Actions pour les modals de produits
    openVariationModal,
    closeVariationModal,
    openProductEditModal,
    closeProductEditModal,

    // Actions pour les modals de remises
    openDiscountModal,
    closeDiscountModal,
    openGlobalDiscountModal,
    closeGlobalDiscountModal,

    // Actions pour les modals de gestion
    openCategoryManagementModal,
    closeCategoryManagementModal,
    openSubcategoryManagementModal,
    closeSubcategoryManagementModal,

    // Actions pour les modals de rapports
    openRecapModal,
    closeRecapModal,
    openDailyReportModal,
    closeDailyReportModal,
    openTransactionHistory,
    closeTransactionHistory,
    openSalesRecap,
    closeSalesRecap,
    openPaymentRecap,
    closePaymentRecap,
    openEndOfDay,
    closeEndOfDay,
    openClosures,
    closeClosures,
    openGlobalTickets,
    closeGlobalTickets,
    openGlobalEditor,
    closeGlobalEditor,

    // Actions pour les modals de paiement
    showPaymentSuccessNotification,
    hidePaymentSuccessNotification,
  };
};
