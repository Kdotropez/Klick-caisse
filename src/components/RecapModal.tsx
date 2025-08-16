import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Paper,
} from '@mui/material';
import {
  Receipt,
  Close,
  Print,
  Download,
} from '@mui/icons-material';
import { CartItem } from '../types/Product';

type ItemDiscount = { type: 'euro' | 'percent' | 'price'; value: number };
type GlobalDiscount = { type: 'euro' | 'percent'; value: number } | null;

interface RecapModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  itemDiscounts?: Record<string, ItemDiscount>;
  globalDiscount?: GlobalDiscount;
  getItemFinalPrice?: (item: CartItem) => number;
}

const RecapModal: React.FC<RecapModalProps> = ({ open, onClose, cartItems, itemDiscounts = {}, globalDiscount = null, getItemFinalPrice }) => {
  const subtotalOriginal = cartItems.reduce((sum, item) => {
    const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    return sum + (price * item.quantity);
  }, 0);

  const individualDiscounts = cartItems.reduce((sum, item) => {
    const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    const originalTotal = originalPrice * item.quantity;
    const finalPrice = getItemFinalPrice ? getItemFinalPrice(item) : originalPrice;
    const finalTotal = finalPrice * item.quantity;
    return sum + Math.max(0, (originalTotal - finalTotal));
  }, 0);

  let globalDiscountAmount = 0;
  if (globalDiscount) {
    const totalWithoutIndividualDiscount = cartItems.reduce((sum, item) => {
      const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
      const hasIndividualDiscount = (itemDiscounts as any)[discountKey];
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

  const grandTotal = subtotalOriginal - (individualDiscounts + globalDiscountAmount);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // TODO: Implémenter l'export PDF
    console.log('Export PDF à implémenter');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }
      }}
    >
      <DialogTitle sx={{ 
        backgroundColor: '#1976d2', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Receipt sx={{ fontSize: 24 }} />
        Récapitulatif du Ticket
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={onClose}
          sx={{ color: 'white', minWidth: 'auto' }}
        >
          <Close />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* En-tête du ticket */}
        <Paper elevation={2} sx={{ p: 2, mb: 2, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h5" align="center" sx={{ fontWeight: 'bold', mb: 1 }}>
            TICKET DE CAISSE
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            {formatDate()}
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Ticket #{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
          </Typography>
        </Paper>

        {/* Résumé des achats (avec remises) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
            Détail des Articles
          </Typography>
          
          <List sx={{ backgroundColor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
            {cartItems.map((item, index) => {
              const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
              const finalPrice = getItemFinalPrice ? getItemFinalPrice(item) : originalPrice;
              const originalTotal = originalPrice * item.quantity;
              const finalTotal = finalPrice * item.quantity;
              const discountAmount = Math.max(0, originalTotal - finalTotal);
              const discountPercent = originalPrice > 0 ? ((originalPrice - finalPrice) / originalPrice) * 100 : 0;
              
              return (
                <React.Fragment key={`${item.product.id}-${item.selectedVariation?.id || 'main'}`}>
                  <ListItem sx={{ py: 1 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                            {item.product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            × {item.quantity}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {discountAmount > 0 && (
                              <Typography variant="body2" sx={{ color: '#f44336', textDecoration: 'line-through' }}>
                                {originalTotal.toFixed(2)} €
                              </Typography>
                            )}
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#1976d2', whiteSpace: 'nowrap' }}>
                              {finalTotal.toFixed(2)} €
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          {item.selectedVariation && (
                            <Chip 
                              label={item.selectedVariation.attributes} 
                              size="small" 
                              color="primary" 
                              variant="outlined"
                              sx={{ mr: 1, mb: 1 }}
                            />
                          )}
                          {discountAmount > 0 && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Chip label={`Remise: -${discountAmount.toFixed(2)}€`} size="small" color="warning" />
                              <Chip label={`(-${discountPercent.toFixed(1)}%)`} size="small" />
                              <Chip label={`PU: ${originalPrice.toFixed(2)}€ → ${finalPrice.toFixed(2)}€`} size="small" variant="outlined" />
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < cartItems.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        </Box>

        {/* Résumé financier (avec remises) */}
        <Paper elevation={2} sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
            Résumé Financier
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Nombre d'articles:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {totalItems}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body1">Nombre de produits différents:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {cartItems.length}
            </Typography>
          </Box>
          
          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body1">Sous-total (avant remises):</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {subtotalOriginal.toFixed(2)} €
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body1">Remises lignes:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#f44336' }}>
              -{individualDiscounts.toFixed(2)} €
            </Typography>
          </Box>

          {globalDiscount && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body1">Remise globale ({globalDiscount.type === 'euro' ? '€' : '%'}):</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                -{globalDiscountAmount.toFixed(2)} €
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              TOTAL:
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {grandTotal.toFixed(2)} €
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={handleDownload}
          sx={{ 
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
              borderColor: '#1565c0',
              backgroundColor: 'rgba(25, 118, 210, 0.1)'
            }
          }}
        >
          Exporter PDF
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={handlePrint}
          sx={{ 
            borderColor: '#4caf50',
            color: '#4caf50',
            '&:hover': {
              borderColor: '#388e3c',
              backgroundColor: 'rgba(76, 175, 80, 0.1)'
            }
          }}
        >
          Imprimer
        </Button>
        
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ 
            backgroundColor: '#1976d2',
            '&:hover': { backgroundColor: '#1565c0' }
          }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecapModal; 