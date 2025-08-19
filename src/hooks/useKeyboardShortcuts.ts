import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsProps {
  onCheckout: () => void;
  onClearCart: () => void;
  onSearch: () => void;
  onToggleLayout: () => void;
  onQuickPayment: (method: 'cash' | 'card' | 'sumup') => void;
  isLayoutLocked: boolean;
  hasItemsInCart: boolean;
}

export const useKeyboardShortcuts = ({
  onCheckout,
  onClearCart,
  onSearch,
  onToggleLayout,
  onQuickPayment,
  isLayoutLocked,
  hasItemsInCart,
}: KeyboardShortcutsProps) => {
  
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignorer si on est dans un champ de saisie
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const { key, ctrlKey, shiftKey, altKey } = event;

    // Raccourcis de base
    switch (key.toLowerCase()) {
      case 'f1':
        event.preventDefault();
        onSearch();
        break;
      
      case 'f2':
        event.preventDefault();
        onToggleLayout();
        break;
      
      case 'f3':
        event.preventDefault();
        if (hasItemsInCart) {
          onCheckout();
        }
        break;
      
      case 'f4':
        event.preventDefault();
        if (hasItemsInCart) {
          onClearCart();
        }
        break;
      
      case 'f5':
        event.preventDefault();
        if (hasItemsInCart) {
          onQuickPayment('cash');
        }
        break;
      
      case 'f6':
        event.preventDefault();
        if (hasItemsInCart) {
          onQuickPayment('card');
        }
        break;
      
      case 'f7':
        event.preventDefault();
        if (hasItemsInCart) {
          onQuickPayment('sumup');
        }
        break;
      
      case 'escape':
        event.preventDefault();
        // Fermer les modales ou annuler les actions
        break;
      
      case 'enter':
        event.preventDefault();
        if (hasItemsInCart) {
          onCheckout();
        }
        break;
      
      case 'delete':
      case 'backspace':
        event.preventDefault();
        if (hasItemsInCart) {
          onClearCart();
        }
        break;
    }

    // Raccourcis avec Ctrl
    if (ctrlKey) {
      switch (key.toLowerCase()) {
        case 's':
          event.preventDefault();
          onSearch();
          break;
        
        case 'p':
          event.preventDefault();
          if (hasItemsInCart) {
            onCheckout();
          }
          break;
        
        case 'c':
          event.preventDefault();
          if (hasItemsInCart) {
            onClearCart();
          }
          break;
        
        case 'l':
          event.preventDefault();
          onToggleLayout();
          break;
      }
    }

    // Raccourcis avec Alt
    if (altKey) {
      switch (key.toLowerCase()) {
        case '1':
          event.preventDefault();
          if (hasItemsInCart) {
            onQuickPayment('cash');
          }
          break;
        
        case '2':
          event.preventDefault();
          if (hasItemsInCart) {
            onQuickPayment('card');
          }
          break;
        
        case '3':
          event.preventDefault();
          if (hasItemsInCart) {
            onQuickPayment('sumup');
          }
          break;
      }
    }
  }, [onCheckout, onClearCart, onSearch, onToggleLayout, onQuickPayment, hasItemsInCart]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Retourner les raccourcis disponibles pour l'affichage
  const getShortcutsList = () => [
    { key: 'F1', description: 'Recherche' },
    { key: 'F2', description: 'Verrouiller/Déverrouiller disposition' },
    { key: 'F3', description: 'Paiement' },
    { key: 'F4', description: 'Vider le panier' },
    { key: 'F5', description: 'Paiement espèces' },
    { key: 'F6', description: 'Paiement carte' },
    { key: 'F7', description: 'Paiement SumUp' },
    { key: 'Entrée', description: 'Paiement rapide' },
    { key: 'Échap', description: 'Annuler/Fermer' },
    { key: 'Ctrl+S', description: 'Recherche' },
    { key: 'Ctrl+P', description: 'Paiement' },
    { key: 'Ctrl+C', description: 'Vider le panier' },
    { key: 'Ctrl+L', description: 'Verrouiller disposition' },
    { key: 'Alt+1', description: 'Paiement espèces' },
    { key: 'Alt+2', description: 'Paiement carte' },
    { key: 'Alt+3', description: 'Paiement SumUp' },
  ];

  return { getShortcutsList };
};

