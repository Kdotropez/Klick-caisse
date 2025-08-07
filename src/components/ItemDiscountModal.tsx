import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import { CartItem } from '../types/Product';

interface ItemDiscountModalProps {
  open: boolean;
  onClose: () => void;
  item: CartItem;
  onApplyDiscount: (itemId: string, variationId: string | null, discountType: 'euro' | 'percent' | 'price', value: number) => void;
}

const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({
  open,
  onClose,
  item,
  onApplyDiscount,
}) => {
  const [discountType, setDiscountType] = useState<'euro' | 'percent' | 'price'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [newPrice, setNewPrice] = useState<number>(0);

  const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
  const originalTotal = originalPrice * item.quantity;

  const calculateDiscountedPrice = () => {
    switch (discountType) {
      case 'euro':
        return Math.max(0, originalPrice - discountValue);
      case 'percent':
        return originalPrice * (1 - discountValue / 100);
      case 'price':
        return newPrice;
      default:
        return originalPrice;
    }
  };

  const calculateDiscountedTotal = () => {
    const discountedPrice = calculateDiscountedPrice();
    return discountedPrice * item.quantity;
  };

  const getDiscountAmount = () => {
    return originalTotal - calculateDiscountedTotal();
  };

  const handleApply = () => {
    let finalValue = 0;
    
    switch (discountType) {
      case 'euro':
        finalValue = discountValue;
        break;
      case 'percent':
        finalValue = discountValue;
        break;
      case 'price':
        finalValue = newPrice;
        break;
    }

    onApplyDiscount(item.product.id, item.selectedVariation?.id || null, discountType, finalValue);
    onClose();
  };

  const handleClose = () => {
    setDiscountType('percent');
    setDiscountValue(0);
    setNewPrice(0);
    onClose();
  };

  const isApplyDisabled = () => {
    switch (discountType) {
      case 'euro':
        return discountValue <= 0 || discountValue >= originalPrice;
      case 'percent':
        return discountValue <= 0 || discountValue >= 100;
      case 'price':
        return newPrice <= 0;
      default:
        return true;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{
        backgroundColor: '#ff9800',
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        💰 Remise sur {item.product.name}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Informations de l'article */}
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
            {item.product.name}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Quantité: {item.quantity}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Prix unitaire actuel: {originalPrice.toFixed(2)} €
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Total actuel: {originalTotal.toFixed(2)} €
          </Typography>
        </Paper>

        {/* Type de remise */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Type de modification</InputLabel>
          <Select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'euro' | 'percent' | 'price')}
            label="Type de modification"
          >
            <MenuItem value="percent">Remise en pourcentage (%)</MenuItem>
            <MenuItem value="euro">Remise en euros (€)</MenuItem>
            <MenuItem value="price">Modifier le prix unitaire</MenuItem>
          </Select>
        </FormControl>

        {/* Valeur de la remise */}
        {discountType === 'percent' && (
          <TextField
            fullWidth
            label="Pourcentage de remise"
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            sx={{ mb: 3 }}
            helperText="Entrez un pourcentage entre 0 et 100"
          />
        )}

        {discountType === 'euro' && (
          <TextField
            fullWidth
            label="Montant de la remise (€)"
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, max: originalPrice, step: 0.01 }}
            sx={{ mb: 3 }}
            helperText={`Montant maximum: ${originalPrice.toFixed(2)} €`}
          />
        )}

        {discountType === 'price' && (
          <TextField
            fullWidth
            label="Nouveau prix unitaire (€)"
            type="number"
            value={newPrice}
            onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 3 }}
            helperText="Entrez le nouveau prix unitaire"
          />
        )}

        {/* Résumé de la modification */}
        {(discountValue > 0 || (discountType === 'price' && newPrice > 0)) && (
          <Paper sx={{ p: 2, backgroundColor: '#e8f5e8', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}>
              Résumé de la modification
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Prix unitaire original :</Typography>
              <Typography sx={{ textDecoration: 'line-through' }}>
                {originalPrice.toFixed(2)} €
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Nouveau prix unitaire :</Typography>
              <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                {calculateDiscountedPrice().toFixed(2)} €
              </Typography>
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Total original :</Typography>
              <Typography sx={{ textDecoration: 'line-through' }}>
                {originalTotal.toFixed(2)} €
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Remise :</Typography>
              <Typography sx={{ color: '#f44336', fontWeight: 'bold' }}>
                -{getDiscountAmount().toFixed(2)} €
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 'bold' }}>Nouveau total :</Typography>
              <Typography sx={{ fontWeight: 'bold', color: '#2e7d32' }}>
                {calculateDiscountedTotal().toFixed(2)} €
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ mr: 2 }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          disabled={isApplyDisabled()}
          sx={{
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' }
          }}
        >
          Appliquer la modification
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemDiscountModal; 