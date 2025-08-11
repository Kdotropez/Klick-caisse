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
import {
  Add,
  Remove,
  Delete,
} from '@mui/icons-material';
import { CartItem } from '../../types/Product';

interface CartWindowProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  onCheckout: () => void;
  getItemFinalPrice: (item: CartItem) => number;
  getTotalWithGlobalDiscount: () => number;
  globalDiscount: { type: 'euro' | 'percent' | null; value: number };
  isLayoutLocked: boolean;
}

const CartWindow: React.FC<CartWindowProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  getItemFinalPrice,
  getTotalWithGlobalDiscount,
  globalDiscount,
  isLayoutLocked,
}) => {
  const total = getTotalWithGlobalDiscount();

  return (
    <Paper
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Typography variant="h6" gutterBottom>
        Panier ({cartItems.length} articles)
      </Typography>

      {/* Liste des articles */}
      <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        {cartItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Panier vide
          </Typography>
        ) : (
          <List dense>
            {cartItems.map((item, index) => {
              const finalPrice = getItemFinalPrice(item);
              const totalPrice = finalPrice * item.quantity;

              return (
                <React.Fragment key={`${item.product.id}-${item.selectedVariation?.id || 'no-variation'}`}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      p: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.product.name}
                        </Typography>
                        {item.selectedVariation && (
                          <Typography variant="caption" color="text.secondary">
                            {item.selectedVariation.attributes}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block">
                          {item.product.reference}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => onRemoveItem(item.product.id, item.selectedVariation?.id || null)}
                        disabled={isLayoutLocked}
                        sx={{ ml: 1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedVariation?.id || null, item.quantity - 1)}
                          disabled={isLayoutLocked}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" sx={{ minWidth: 30, textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, item.selectedVariation?.id || null, item.quantity + 1)}
                          disabled={isLayoutLocked}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {finalPrice.toFixed(2)}€
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total: {totalPrice.toFixed(2)}€
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < cartItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>

      {/* Remise globale */}
      {globalDiscount.type && (
        <Box sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Remise globale: {globalDiscount.value}
            {globalDiscount.type === 'euro' ? '€' : '%'}
          </Typography>
        </Box>
      )}

      {/* Total */}
      <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Total</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            {total.toFixed(2)}€
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onCheckout}
          disabled={cartItems.length === 0 || isLayoutLocked}
          sx={{ mb: 1 }}
        >
          Payer ({cartItems.length} articles)
        </Button>

        {cartItems.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                cartItems.forEach(item => {
                  onRemoveItem(item.product.id, item.selectedVariation?.id || null);
                });
              }}
              disabled={isLayoutLocked}
              sx={{ flex: 1 }}
            >
              Vider le panier
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default CartWindow; 