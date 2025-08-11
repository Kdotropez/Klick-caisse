import React from 'react';
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
}) => {
  const total = getTotalWithGlobalDiscount();

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
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>
          TICKET DE CAISSE
        </Typography>
        <Typography variant="caption" align="center" display="block">
          {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR')} · Klick V2.2
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 0.5 }}>
        {cartItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Panier vide
          </Typography>
        ) : (
          <List dense>
            {cartItems.map((item, index) => {
              const variationId = item.selectedVariation?.id || null;
              const discountKey = `${item.product.id}-${variationId || 'main'}`;
              const discount = itemDiscounts[discountKey];
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
                  {index < cartItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body1" sx={{ textAlign: 'right', mb: 0.5 }}>
          Sous-total: {cartItems.reduce((sum, item) => {
            const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
            return sum + (originalPrice * item.quantity);
          }, 0).toFixed(2)} €
        </Typography>

        {(() => {
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

            if (globalDiscount.type === 'euro') {
              globalDiscountAmount = Math.min(totalWithoutIndividualDiscount, globalDiscount.value);
            } else {
              globalDiscountAmount = totalWithoutIndividualDiscount * (globalDiscount.value / 100);
            }
          }

          const totalDiscounts = individualDiscounts + globalDiscountAmount;
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, mb: 0.5 }}>
              <Typography variant="body1" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                Total remises: -{totalDiscounts.toFixed(2)} €
              </Typography>
              {globalDiscount && (
                <IconButton size="small" onClick={onClearGlobalDiscount} sx={{ color: '#f44336' }} title="Annuler la remise principale">
                  ✕
                </IconButton>
              )}
            </Box>
          );
        })()}

        <Typography variant="h6" sx={{ fontWeight: 'bold', textAlign: 'right' }}>
          TOTAL: {total.toFixed(2)} €
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onOpenRecap}
            sx={{ backgroundColor: '#1976d2', flex: 1, fontSize: '0.8rem' }}
          >
            📋 Recap
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onOpenGlobalDiscount}
            sx={{ backgroundColor: '#ff9800', flex: 1, fontSize: '0.8rem' }}
          >
            💰 Remise
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onResetCartAndDiscounts}
            sx={{ backgroundColor: '#f44336', flex: 1, fontSize: '0.8rem' }}
          >
            🔄 Reset
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CartPanel;



