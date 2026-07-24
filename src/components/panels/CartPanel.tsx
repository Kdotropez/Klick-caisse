import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  Divider,
  Chip,
  TextField,
} from '@mui/material';
import { Add, Remove, Edit } from '@mui/icons-material';
import { CartItem } from '../../types/Product';
import { APP_VERSION } from '../../version';
import {
  computeTicketTotalBreakdown,
  isLineExcludedFromGlobalDiscount,
  loadDiscountExclusionSettings,
  type ItemDiscount,
} from '../../utils/ticketTotal';

export type { ItemDiscount };

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
  onApplyItemDiscount: (itemId: string, variationId: string | null, discountType: 'euro' | 'percent' | 'price', value: number) => void;
  customerName?: string | null;
  onPickCustomer?: () => void;
  onClearCustomer?: () => void;
  onCreateProReceipt?: () => void;
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
  onApplyItemDiscount,
  customerName,
  onPickCustomer,
  onClearCustomer,
  onCreateProReceipt,
}) => {
  const total = getTotalWithGlobalDiscount();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingPrice, setEditingPrice] = useState<{ key: string; value: string } | null>(null);

  const exclusionSettings = useMemo(() => loadDiscountExclusionSettings(), []);

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

  const totalsBreakdown = useMemo(() => {
    return computeTicketTotalBreakdown(
      Array.isArray(cartItems) ? cartItems : [],
      itemDiscounts as Record<string, ItemDiscount>,
      globalDiscount,
      exclusionSettings
    );
  }, [cartItems, exclusionSettings, globalDiscount, itemDiscounts]);

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
        {/* Client courant */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Client:</Typography>
          <Typography variant="body2" sx={{ color: customerName ? '#1976d2' : '#666' }}>
            {customerName || 'Aucun'}
          </Typography>
          <Button size="small" variant="outlined" onClick={onPickCustomer} sx={{ ml: 'auto' }}>Associer</Button>
          {customerName && (
            <Button size="small" color="error" onClick={onClearCustomer}>Effacer</Button>
          )}
        </Box>
        {safeCartItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Panier vide
          </Typography>
        ) : (
          <List dense>
            {safeCartItems.map((item, index) => {
              const isExcludedForDiscount = isLineExcludedFromGlobalDiscount(item, exclusionSettings);
              const variationId = item.selectedVariation?.id || null;
              const discountKey = `${item.product.id}-${variationId || 'main'}`;
              const discount = itemDiscounts[discountKey];
              const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
              const finalPrice = getItemFinalPrice(item);
              const originalTotal = originalPrice * item.quantity;
              const finalTotal = finalPrice * item.quantity;
              const discountAmountPerUnit = originalPrice - finalPrice;
              const discountAmountTotal = discountAmountPerUnit * item.quantity;
              const discountPercent = originalPrice > 0 ? (discountAmountPerUnit / originalPrice) * 100 : 0;

              return (
                <React.Fragment key={`${item.product.id}-${variationId || 'main'}`}>
                  <ListItem 
                    sx={{
                      py: 0.5,
                      cursor: isExcludedForDiscount ? 'default' : 'pointer',
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      mb: 0.5,
                      backgroundColor: '#fafafa',
                      opacity: isExcludedForDiscount ? 0.7 : 1
                    }}
                    onClick={() => { if (!isExcludedForDiscount) onOpenDiscountModal(item); }}
                    title={isExcludedForDiscount ? 'Remise exclue pour cet article' : undefined}
                  >
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto auto auto', alignItems: 'center', gap: 0.5, width: '100%' }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 'bold', minWidth: 0 }}>
                        {item.product.name}
                        {item.selectedVariation && (
                          <Typography component="span" variant="body2" sx={{ color: '#2196f3', fontWeight: 'normal', ml: 0.5, fontStyle: 'italic' }}>
                            ({item.selectedVariation.attributes})
                          </Typography>
                        )}
                        {isExcludedForDiscount && (
                          <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                            (remise exclue)
                          </Typography>
                        )}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                        <IconButton size="small" onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity - 1)} sx={{ p: 0.25 }}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Chip label={item.quantity} size="small" sx={{ height: 22 }} />
                        <IconButton size="small" onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity + 1)} sx={{ p: 0.25 }}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                        {editingPrice?.key === discountKey ? (
                          <>
                            <TextField
                              size="small"
                              type="text"
                              value={editingPrice.value}
                              onChange={(e) => setEditingPrice({ key: discountKey, value: e.target.value })}
                              placeholder="0,00"
                              sx={{ width: 76, '& .MuiInputBase-input': { py: 0.25, px: 0.75 } }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const normalized = editingPrice.value.replace(',', '.');
                                  const val = parseFloat(normalized);
                                  if (Number.isFinite(val) && val >= 0) {
                                    onApplyItemDiscount(item.product.id, variationId, 'price', val);
                                    setEditingPrice(null);
                                  } else {
                                    alert('Prix invalide');
                                  }
                                }
                                if (e.key === 'Escape') setEditingPrice(null);
                              }}
                            />
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                const normalized = editingPrice.value.replace(',', '.');
                                const val = parseFloat(normalized);
                                if (Number.isFinite(val) && val >= 0) {
                                  onApplyItemDiscount(item.product.id, variationId, 'price', val);
                                  setEditingPrice(null);
                                } else {
                                  alert('Prix invalide');
                                }
                              }}
                              sx={{ minWidth: 0, px: 0.75, py: 0.1 }}
                            >
                              ✓
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ width: 62, textAlign: 'right', fontWeight: 'bold', color: discount?.type==='price' ? '#ef6c00' : '#666', textDecoration: discount?.type==='price' ? 'underline' : 'none' }}
                              onClick={() => {
                                const currentUnit = finalPrice;
                                setEditingPrice({ key: discountKey, value: currentUnit.toFixed(2).replace('.', ',') });
                              }}
                              title={discount?.type==='price' ? 'Prix modifié - cliquer pour changer' : 'Cliquer pour modifier le prix'}
                            >
                              {(discount?.type==='price' ? finalPrice : originalPrice).toFixed(2)} €
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => {
                                const currentUnit = finalPrice;
                                setEditingPrice({ key: discountKey, value: currentUnit.toFixed(2).replace('.', ',') });
                              }}
                              sx={{ p: 0.25 }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </Box>

                      {discount && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }} onClick={(e) => e.stopPropagation()}>
                          <Typography variant="caption" noWrap sx={{ color: '#ef6c00', fontWeight: 'bold', maxWidth: 92 }}>
                            -{discountAmountTotal.toFixed(2)}€ ({discountPercent.toFixed(0)}%)
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ color: '#666', textDecoration: 'line-through', maxWidth: 70 }}>
                            {originalTotal.toFixed(2)}€
                          </Typography>
                          <IconButton size="small" onClick={() => onRemoveItemDiscount(discountKey)} sx={{ color: '#ff0000', p: 0.25 }}>
                            ✕
                          </IconButton>
                        </Box>
                      )}

                      <Box sx={{ backgroundColor: '#2196F3', color: 'white', px: 1, py: 0.25, borderRadius: 1, fontSize: '0.85rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {finalTotal.toFixed(2)} €
                      </Box>

                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(item.product.id, variationId);
                        }}
                        sx={{ color: '#f44336', p: 0.25 }}
                      >
                        ✕
                      </IconButton>
                    </Box>
                  </ListItem>
                  {index < safeCartItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Sous-total: {totalsBreakdown.subtotal.toFixed(2)} €</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
              Remises: -{totalsBreakdown.totalDiscounts.toFixed(2)} €
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
          <Button
            variant="contained"
            size="small"
            onClick={onCreateProReceipt}
            sx={{ 
              backgroundColor: '#3f51b5', 
              flex: 1, 
              fontSize: '0.6rem',
              py: 0.25,
              minHeight: 24
            }}
            title="Créer un ticket pro à partir du panier"
          >
            Ticket pro
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CartPanel;



