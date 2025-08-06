import React from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import { Add, Remove, Delete } from '@mui/icons-material';
import { CartItem } from '../types/Product';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, variationId: string | null, quantity: number) => void;
  onRemoveItem: (productId: string, variationId: string | null) => void;
  onCheckout: () => void;
}

const Cart: React.FC<CartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
}) => {
  const total = items.reduce((sum, item) => {
    const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    return sum + (price * item.quantity);
  }, 0);

  const formatPrice = (price: number) => {
    return price.toFixed(2) + ' €';
  };

  return (
    <Paper sx={{ width: 400, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* En-tête du ticket */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', backgroundColor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>
          TICKET DE CAISSE
        </Typography>
        <Typography variant="body2" align="center">
          {new Date().toLocaleDateString('fr-FR')} - {new Date().toLocaleTimeString('fr-FR')}
        </Typography>
      </Box>

      {/* Liste des articles */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List dense>
          {items.map((item, index) => {
            const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
            const variationId = item.selectedVariation?.id || null;
            
            return (
              <React.Fragment key={`${item.product.id}-${variationId || 'main'}`}>
                <ListItem sx={{ py: 1 }}>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.product.name}
                        </Typography>
                        {item.selectedVariation && (
                          <Typography variant="caption" color="text.secondary">
                            {item.selectedVariation.attributes}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <Chip label={item.quantity} size="small" />
                        <IconButton
                          size="small"
                          onClick={() => onUpdateQuantity(item.product.id, variationId, item.quantity + 1)}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatPrice(price * item.quantity)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPrice(price)} / unité
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => onRemoveItem(item.product.id, variationId)}
                        sx={{ ml: 1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < items.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* Total et bouton de paiement */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', backgroundColor: 'grey.50' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            TOTAL
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {formatPrice(total)}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={onCheckout}
          disabled={items.length === 0}
          sx={{ fontWeight: 'bold' }}
        >
          PAIEMENT ({items.length} article{items.length > 1 ? 's' : ''})
        </Button>
      </Box>
    </Paper>
  );
};

export default Cart; 