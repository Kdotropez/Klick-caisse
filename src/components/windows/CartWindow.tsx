import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, Button, IconButton, Chip } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { CartItem } from '../../types/Product';

interface CartWindowProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onCheckout: () => void;
}

const CartWindow: React.FC<CartWindowProps> = ({
  cartItems,
  onUpdateQuantity,
  onCheckout,
}) => {
  const total = cartItems.reduce((sum, item) => {
    const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    return sum + (price * item.quantity);
  }, 0);

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
      
      <List dense sx={{ flexGrow: 1, overflow: 'auto' }}>
        {cartItems.map((item) => {
          const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
          const variationId = item.selectedVariation?.id || null;
          
          return (
            <ListItem key={`${item.product.id}-${variationId || 'main'}`} sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {item.product.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity - 1)}>
                      <Remove fontSize="small" />
                    </IconButton>
                    <Chip label={item.quantity} size="small" />
                    <IconButton size="small" onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity + 1)}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {(price * item.quantity).toFixed(2)} €
                </Typography>
              </ListItemSecondaryAction>
            </ListItem>
          );
        })}
      </List>
      
      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          TOTAL: {total.toFixed(2)} €
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          sx={{ mt: 1 }}
        >
          PAIEMENT
        </Button>
      </Box>
    </Box>
  );
};

export default CartWindow; 