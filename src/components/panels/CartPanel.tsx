import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { CartItem } from '../../types/Product';
import { APP_VERSION } from '../../version';

export interface ItemDiscount {
  type: 'euro' | 'percent' | 'price';
  value: number;
}

interface CartPanelProps {
  cartItems: CartItem[];
  itemDiscounts: Record<string, ItemDiscount>;
  globalDiscount: { type: 'euro' | 'percent'; value: number } | null;
  getItemFinalPrice: (item: CartItem) => number;
  getTotalWithGlobalDiscount: () => number;
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  onOpenDiscountModal: (item: CartItem) => void;
  onOpenRecap: () => void;
  onOpenGlobalDiscount: () => void;
  
  onResetCartAndDiscounts: () => void;
  onRemoveItemDiscount: (discountKey: string) => void;
  onClearGlobalDiscount: () => void;
  promoBanner?: React.ReactNode;
  autoGlassDiscountEnabled?: boolean;
  onToggleAutoGlassDiscount?: () => void;
  autoAssocDiscountEnabled?: boolean;
  onToggleAutoAssocDiscount?: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({
  cartItems,
  itemDiscounts,
  globalDiscount,
  getItemFinalPrice,
  getTotalWithGlobalDiscount,
  onUpdateQuantity,
  onRemoveItem,
  onOpenDiscountModal,
  onOpenRecap,
  onOpenGlobalDiscount,
  onResetCartAndDiscounts,
  onRemoveItemDiscount,
  onClearGlobalDiscount,
  promoBanner,
  autoGlassDiscountEnabled = true,
  onToggleAutoGlassDiscount,
  autoAssocDiscountEnabled = true,
  onToggleAutoAssocDiscount,
}) => {
  const total = getTotalWithGlobalDiscount();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Protection contre les états incohérents avec stabilisation
  const safeCartItems = useMemo(() => {
    if (!Array.isArray(cartItems)) return [];
    
    return cartItems.filter(item => 
      item && 
      item.product && 
      typeof item.product.id === 'string' &&
      typeof item.quantity === 'number' &&
      item.quantity > 0
    );
  }, [cartItems]);

  // Callbacks stables pour éviter les re-rendus
  const handleUpdateQuantity = useCallback((productId: string, variationId: string | null, quantity: number) => {
    onUpdateQuantity(productId, variationId, quantity);
  }, [onUpdateQuantity]);

  const handleRemoveItem = useCallback((productId: string, variationId: string | null) => {
    onRemoveItem(productId, variationId);
  }, [onRemoveItem]);

  const handleOpenDiscountModal = useCallback((item: CartItem) => {
    onOpenDiscountModal(item);
  }, [onOpenDiscountModal]);

  // Auto-scroll vers le bas quand de nouveaux articles sont ajoutés
  useEffect(() => {
    if (scrollContainerRef.current && safeCartItems.length > 0) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [safeCartItems.length]);

  return (
    <Paper
      sx={{
        p: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      
      {promoBanner}
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>
          TICKET DE CAISSE
        </Typography>
        <Typography variant="caption" align="center" display="block">
          {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Klick V{APP_VERSION}
        </Typography>
      </Box>

      <Box ref={scrollContainerRef} sx={{ flexGrow: 1, overflow: 'auto', p: 0.5 }}>
        {safeCartItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Panier vide
          </Typography>
        ) : (
          <List dense>
            {safeCartItems.map((item, index) => {
              const variationId = item.selectedVariation?.id || null;
              const discountKey = `${item.product.id}-${variationId || 'main'}`;
              const discount = itemDiscounts[discountKey];
              if (discount) {
                console.log(`[CART] remise détectée pour ${discountKey}:`, discount);
              } else {
                console.log(`[CART] aucune remise pour ${discountKey}`);
              }
              const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
              const finalPrice = getItemFinalPrice(item);
              const originalTotal = originalPrice * item.quantity;
              const finalTotal = finalPrice * item.quantity;

              return (
                <React.Fragment key={`${item.product.id}-${variationId || 'main'}`}>
                  <ListItem 
                    sx={{
                      py: 0.5,
                      cursor: 'pointer',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 0.5,
                      backgroundColor: '#fafafa'
                    }}
                    onClick={() => onOpenDiscountModal(item)}
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
                                sx={{ color: '#2196f3', fontWeight: 'normal', ml: 0.5, fontStyle: 'italic' }}
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

                          {discount && (() => {
                            const discountAmountPerUnit = originalPrice - finalPrice;
                            const discountAmountTotal = discountAmountPerUnit * item.quantity;
                            const discountPercent = ((discountAmountPerUnit / originalPrice) * 100);

                            return (
                              <Box sx={{ display: 'flex', gap: 0.5, ml: 1, alignItems: 'center' }}>
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
                                    onRemoveItemDiscount(discountKey);
                                  }}
                                  sx={{ color: '#ff0000', fontSize: '0.8rem', ml: 0.5, p: 0.5, minWidth: 'auto' }}
                                >
                                  ✕
                                </IconButton>
                              </Box>
                            );
                          })()}

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
                  {index < safeCartItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        {(() => {
          const subtotal = cartItems.reduce((sum, item) => {
            const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
            return sum + (originalPrice * item.quantity);
          }, 0);
          const individualDiscounts = cartItems.reduce((sum, item) => {
            const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
            const originalTotal = originalPrice * item.quantity;
            const finalPrice = getItemFinalPrice(item);
            const finalTotal = finalPrice * item.quantity;
            return sum + (originalTotal - finalTotal);
          }, 0);
          let globalDiscountAmount = 0;
          if (globalDiscount) {
            const totalWithoutIndividualDiscount = cartItems.reduce((sum, item) => {
              const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
              const hasIndividualDiscount = itemDiscounts[discountKey];
              if (!hasIndividualDiscount) {
                const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                return sum + (originalPrice * item.quantity);
              }
              return sum;
            }, 0);
            globalDiscountAmount = globalDiscount.type === 'euro'
              ? Math.min(totalWithoutIndividualDiscount, globalDiscount.value)
              : totalWithoutIndividualDiscount * (globalDiscount.value / 100);
          }
          const totalDiscounts = individualDiscounts + globalDiscountAmount;
          return (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Sous-total: {subtotal.toFixed(2)} €</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                  Remises: -{totalDiscounts.toFixed(2)} €
                </Typography>
                {globalDiscount && (
                  <IconButton size="small" onClick={onClearGlobalDiscount} sx={{ color: '#f44336', p: 0.25 }} title="Annuler la remise principale">
                    ✕
                  </IconButton>
                )}
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Total: {total.toFixed(2)} €
              </Typography>
            </Box>
          );
        })()}

        <Box sx={{ display: 'flex', gap: 0.25, mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onOpenRecap}
            sx={{ backgroundColor: '#1976d2', flex: 1, fontSize: '0.6rem', py: 0.25, minHeight: 24 }}
          >
            Récap
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onOpenGlobalDiscount}
            sx={{ backgroundColor: '#ff9800', flex: 1, fontSize: '0.6rem', py: 0.25, minHeight: 24 }}
          >
            Rem.
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onResetCartAndDiscounts}
            sx={{ backgroundColor: '#f44336', flex: 1, fontSize: '0.6rem', py: 0.25, minHeight: 24 }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onToggleAutoGlassDiscount}
            sx={{ 
              backgroundColor: autoGlassDiscountEnabled ? '#4caf50' : '#9e9e9e', 
              flex: 1, 
              fontSize: '0.6rem',
              py: 0.25,
              minHeight: 24
            }}
            title="Activer/désactiver la remise auto 6 verres"
          >
            Auto
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={onToggleAutoAssocDiscount}
            sx={{ 
              backgroundColor: autoAssocDiscountEnabled ? '#4caf50' : '#9e9e9e', 
              flex: 1, 
              fontSize: '0.6rem',
              py: 0.25,
              minHeight: 24
            }}
            title="Activer/désactiver la remise associative (seau/vasque)"
          >
            Assoc.
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CartPanel;



