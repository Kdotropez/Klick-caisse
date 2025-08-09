import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { CartItem, Transaction } from '../types/Product';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onCompleteTransaction: (transaction: Transaction) => void;
}

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  open,
  onClose,
  items,
  onCompleteTransaction,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'sumup'>('card');
  const [cashierName, setCashierName] = useState('');

  const subtotal = items.reduce((sum, item) => sum + (item.product.finalPrice * item.quantity), 0);
  const tax = subtotal * 0.20;
  const total = subtotal + tax;

  const handleComplete = () => {
    if (!cashierName.trim()) {
      alert('Veuillez saisir le nom du caissier');
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      items: [...items],
      total: total,
      paymentMethod: paymentMethod,
      cashierName: cashierName,
      timestamp: new Date(),
    };

    onCompleteTransaction(transaction);
    onClose();
    setCashierName('');
    setPaymentMethod('card');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Finaliser l'achat</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Résumé de la commande */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Résumé de la commande
            </Typography>
            <List dense>
              {items.map((item) => (
                <ListItem key={item.product.id}>
                  <ListItemText
                    primary={item.product.name}
                    secondary={`${item.quantity} x ${item.product.finalPrice.toFixed(2)} €`}
                  />
                  <Typography variant="body2">
                    {(item.quantity * item.product.finalPrice).toFixed(2)} €
                  </Typography>
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Sous-total:</Typography>
              <Typography>{subtotal.toFixed(2)} €</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>TVA (20%):</Typography>
              <Typography>{tax.toFixed(2)} €</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6">Total:</Typography>
              <Typography variant="h6" color="primary">
                {total.toFixed(2)} €
              </Typography>
            </Box>
          </Box>

          {/* Informations de paiement */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Informations de paiement
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Nom du caissier"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '0.95rem',
                  lineHeight: 1.4,
                  letterSpacing: '0.2px',
                }
              }}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Méthode de paiement</InputLabel>
              <Select
                value={paymentMethod}
                label="Méthode de paiement"
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'sumup')}
              >
                <MenuItem value="card">Carte bancaire</MenuItem>
                <MenuItem value="cash">Espèces</MenuItem>
                <MenuItem value="sumup">SumUp</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleComplete} variant="contained" disabled={!cashierName.trim()}>
          Confirmer l'achat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckoutDialog; 