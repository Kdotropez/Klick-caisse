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
  Alert,
} from '@mui/material';
import { CartItem } from '../types/Product';

interface ItemDiscountModalProps {
  open: boolean;
  onClose: () => void;
  item: CartItem;
  onApplyDiscount: (itemId: string, variationId: string | null, discountType: 'euro' | 'percent' | 'price', value: number) => void;
  onUpdateQuantity?: (productId: string, variationId: string | null, quantity: number) => void;
}

const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({
  open,
  onClose,
  item,
  onApplyDiscount,
  onUpdateQuantity,
}) => {
  const [mode, setMode] = useState<'unit' | 'total'>('unit');
  const [discountType, setDiscountType] = useState<'euro' | 'percent' | 'price'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0); // euro ou percent selon type
  const [newUnitPrice, setNewUnitPrice] = useState<number>(0);
  const [newTotal, setNewTotal] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(item.quantity);

  const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
  const originalTotal = originalPrice * item.quantity;

  const calculateDiscountedUnitPrice = () => {
    if (mode === 'unit') {
      switch (discountType) {
        case 'euro':
          return Math.max(0, originalPrice - discountValue);
        case 'percent':
          return originalPrice * (1 - discountValue / 100);
        case 'price':
          return newUnitPrice;
        default:
          return originalPrice;
      }
    }
    // mode total
    switch (discountType) {
      case 'euro': {
        const totalAfter = Math.max(0, originalTotal - discountValue);
        return totalAfter / Math.max(1, item.quantity);
      }
      case 'percent': {
        const totalAfter = originalTotal * (1 - discountValue / 100);
        return totalAfter / Math.max(1, item.quantity);
      }
      case 'price': {
        const totalAfter = Math.max(0, newTotal);
        return totalAfter / Math.max(1, item.quantity);
      }
      default:
        return originalPrice;
    }
  };

  const calculateDiscountedTotal = () => {
    const discountedPrice = calculateDiscountedUnitPrice();
    return discountedPrice * item.quantity;
  };

  const getDiscountAmount = () => {
    return originalTotal - calculateDiscountedTotal();
  };

  const handleApply = () => {
    // Convertit les remises "total" en équivalents par unité pour le stockage
    if (mode === 'total') {
      if (discountType === 'euro') {
        const perUnit = discountValue / Math.max(1, item.quantity);
        onApplyDiscount(item.product.id, item.selectedVariation?.id || null, 'euro', perUnit);
      } else if (discountType === 'percent') {
        onApplyDiscount(item.product.id, item.selectedVariation?.id || null, 'percent', discountValue);
      } else if (discountType === 'price') {
        const perUnitPrice = Math.max(0, newTotal) / Math.max(1, item.quantity);
        onApplyDiscount(item.product.id, item.selectedVariation?.id || null, 'price', perUnitPrice);
      }
      onClose();
      return;
    }
    // mode unité (inchangé)
    if (discountType === 'price') {
      onApplyDiscount(item.product.id, item.selectedVariation?.id || null, 'price', newUnitPrice);
    } else {
      onApplyDiscount(item.product.id, item.selectedVariation?.id || null, discountType, discountValue);
    }
    onClose();
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1); // Remettre à 1 si la quantité est invalide
      return;
    }
    setQuantity(newQuantity);
    if (onUpdateQuantity) {
      onUpdateQuantity(item.product.id, item.selectedVariation?.id || null, newQuantity);
    }
    // Fermer la fenêtre après avoir modifié la quantité
    onClose();
  };

  const handleClose = () => {
    setMode('unit');
    setDiscountType('percent');
    setDiscountValue(0);
    setNewUnitPrice(0);
    setNewTotal(0);
    setQuantity(item.quantity); // Reset quantity to original
    onClose();
  };

  const isApplyDisabled = () => {
    if (mode === 'unit') {
      switch (discountType) {
        case 'euro':
          return discountValue <= 0 || discountValue >= originalPrice;
        case 'percent':
          return discountValue <= 0 || discountValue >= 100;
        case 'price':
          return newUnitPrice <= 0;
        default:
          return true;
      }
    } else {
      switch (discountType) {
        case 'euro':
          return discountValue <= 0 || discountValue >= originalTotal;
        case 'percent':
          return discountValue <= 0 || discountValue >= 100;
        case 'price':
          return newTotal <= 0;
        default:
          return true;
      }
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
        🏷️ Remise article — {item.product.name}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Cette fenêtre sert aux remises. Pour changer le prix réel d’un article, utilisez le crayon à côté du prix dans le panier.
        </Alert>
        {/* Mode d'application */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'center' }}>
          <Button variant={mode==='unit'?'contained':'outlined'} onClick={() => setMode('unit')}>Par unité</Button>
          <Button variant={mode==='total'?'contained':'outlined'} onClick={() => setMode('total')}>Par total</Button>
        </Box>
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

        {/* Modification de la quantité */}
        {onUpdateQuantity && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: '#e3f2fd' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
              📦 Modifier la quantité
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                label="Quantité"
                type="number"
                value={quantity}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  // Permettre de vider le champ ou de saisir 0 temporairement
                  if (inputValue === '' || inputValue === '0') {
                    setQuantity(0);
                  } else {
                    const newQty = parseInt(inputValue);
                    if (!isNaN(newQty) && newQty >= 0) {
                      setQuantity(newQty);
                    }
                  }
                }}
                onBlur={(e) => {
                  // Au focus perdu, s'assurer qu'on a au moins 1
                  if (quantity < 1) {
                    setQuantity(1);
                  }
                }}
                inputProps={{ min: 0, step: 1 }}
                sx={{ width: 120 }}
                size="small"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => handleQuantityChange(quantity)}
                disabled={quantity === item.quantity}
                size="small"
              >
                Appliquer & Fermer
              </Button>
              <Button
                variant="outlined"
                onClick={onClose}
                size="small"
              >
                Fermer
              </Button>
              <Typography variant="body2" color="text.secondary">
                Quantité actuelle: {item.quantity}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Type de remise */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Type de remise</InputLabel>
          <Select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'euro' | 'percent')}
            label="Type de remise"
          >
            <MenuItem value="percent">Remise en pourcentage (%)</MenuItem>
            <MenuItem value="euro">Remise en euros {mode==='unit' ? '(par unité)' : '(sur total)'} </MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          {(discountType === 'percent' ? [5, 10, 15, 20] : [1, 2, 5, 10]).map((value) => (
            <Button key={value} variant="outlined" onClick={() => setDiscountValue(value)}>
              {discountType === 'percent' ? `-${value}%` : `-${value}€`}
            </Button>
          ))}
        </Box>

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
            label={`Montant de la remise (€) ${mode==='unit' ? '(par unité)' : '(sur total)'}`}
            type="number"
            value={discountValue}
            onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, max: mode==='unit' ? originalPrice : originalTotal, step: 0.01 }}
            sx={{ mb: 3 }}
            helperText={`Montant maximum: ${(mode==='unit'?originalPrice:originalTotal).toFixed(2)} €`}
          />
        )}

        {discountType === 'price' && mode==='unit' && (
          <TextField
            fullWidth
            label="Nouveau prix unitaire (€)"
            type="number"
            value={newUnitPrice}
            onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 3 }}
            helperText="Entrez le nouveau prix unitaire"
          />
        )}

        {discountType === 'price' && mode==='total' && (
          <TextField
            fullWidth
            label="Nouveau total (€)"
            type="number"
            value={newTotal}
            onChange={(e) => setNewTotal(parseFloat(e.target.value) || 0)}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 3 }}
            helperText="Entrez le nouveau total pour cette ligne"
          />
        )}

        {/* Résumé de la modification */}
        {discountValue > 0 && (
          <Paper sx={{ p: 2, backgroundColor: '#e8f5e8', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1, textAlign: 'center' }}>
              Résumé de la remise
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
                {calculateDiscountedUnitPrice().toFixed(2)} €
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
          Appliquer la remise
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ItemDiscountModal; 