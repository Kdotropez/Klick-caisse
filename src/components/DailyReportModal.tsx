import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { Close, TrendingUp, Euro, Discount } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { CartItem } from '../types/Product';
import { APP_VERSION } from '../version';
import { StorageService } from '../services/StorageService';

interface DailyReportModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
}

interface DailyStats {
  totalSales: number;
  totalItems: number;
  totalTransactions: number;
  averageTransactionValue: number;
  totalDiscounts: number;
  totalOriginalAmount: number;
}

const DailyReportModal: React.FC<DailyReportModalProps> = ({
  open,
  onClose,
  cartItems
}) => {
  const [dailyStats, setDailyStats] = useState<DailyStats>({
    totalSales: 0,
    totalItems: 0,
    totalTransactions: 0,
    averageTransactionValue: 0,
    totalDiscounts: 0,
    totalOriginalAmount: 0
  });

  // Calculer les statistiques quotidiennes
  useEffect(() => {
            // Charger les transactions du jour
        const todayTransactions = StorageService.loadTodayTransactions();
        
        if (todayTransactions.length > 0) {
          let totalSales = 0;
          let totalItems = 0;
          let totalOriginalAmount = 0;
          let totalDiscounts = 0;

          todayTransactions.forEach(transaction => {
            // Montant final de la transaction
            totalSales += transaction.total || 0;
            
            // Calculer le montant original et les remises
            if (transaction.items && Array.isArray(transaction.items)) {
              transaction.items.forEach(item => {
                const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                const originalTotal = originalPrice * item.quantity;
                
                // Calculer le montant final avec remises
                let finalTotal = originalTotal;
                if (transaction.itemDiscounts && transaction.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`]) {
                  const discount = transaction.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`];
                  if (discount.type === 'euro') {
                    finalTotal = Math.max(0, originalTotal - (discount.value * item.quantity));
                  } else if (discount.type === 'percent') {
                    finalTotal = originalTotal * (1 - discount.value / 100);
                  } else if (discount.type === 'price') {
                    finalTotal = discount.value * item.quantity;
                  }
                }
                
                totalOriginalAmount += originalTotal;
                totalItems += item.quantity;
                totalDiscounts += (originalTotal - finalTotal);
              });
            }
          });
      
      const totalTransactions = todayTransactions.length;
      const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      setDailyStats({
        totalSales,
        totalItems,
        totalTransactions,
        averageTransactionValue,
        totalDiscounts,
        totalOriginalAmount
      });
    } else {
      // Si pas de transactions, utiliser le panier actuel
      const totalSales = cartItems.reduce((sum, item) => {
        const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
        return sum + (price * item.quantity);
      }, 0);

      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalTransactions = cartItems.length > 0 ? 1 : 0;
      const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      setDailyStats({
        totalSales,
        totalItems,
        totalTransactions,
        averageTransactionValue,
        totalDiscounts: 0,
        totalOriginalAmount: totalSales
      });
    }
  }, [cartItems]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
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
          minHeight: '60vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: '#2196f3', fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333' }}>
          Rapport Journalier · Klick V{APP_VERSION}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>

        {/* POINT 1: TOTAL DES VENTES */}
        <Card sx={{ 
          mb: 3, 
          border: '2px solid #2196f3',
          backgroundColor: '#f8f9ff'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Euro sx={{ color: '#2196f3', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                Point 1: Total des Ventes
              </Typography>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Montant total */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#e3f2fd',
                borderRadius: 1
              }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Montant Total des Ventes
                </Typography>
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  fontFamily: 'monospace'
                }}>
                  {formatPrice(dailyStats.totalSales)}
                </Typography>
              </Box>

              {/* Détails */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Articles Vendus
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#2196f3',
                      fontFamily: 'monospace'
                    }}>
                      {dailyStats.totalItems}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Transactions
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#ff9800',
                      fontFamily: 'monospace'
                    }}>
                      {dailyStats.totalTransactions}
                    </Typography>
                  </CardContent>
                </Card>

                <Card sx={{ backgroundColor: '#f5f5f5' }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                      Panier Moyen
                    </Typography>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#4caf50',
                      fontFamily: 'monospace'
                    }}>
                      {formatPrice(dailyStats.averageTransactionValue)}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Remises appliquées */}
              {dailyStats.totalDiscounts > 0 && (
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#fff3e0', 
                  borderRadius: 1,
                  border: '1px solid #ff9800'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Discount sx={{ color: '#ff9800', fontSize: 20 }} />
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                      Remises Appliquées
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      Total des remises
                    </Typography>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 'bold', 
                      color: '#f57c00',
                      fontFamily: 'monospace'
                    }}>
                      -{formatPrice(dailyStats.totalDiscounts)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#666', mt: 1 }}>
                    Montant original : {formatPrice(dailyStats.totalOriginalAmount)} → Final : {formatPrice(dailyStats.totalSales)}
                  </Typography>
                </Box>
              )}

              {/* Résumé */}
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#e8f5e8', 
                borderRadius: 1,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  📊 Résumé : {dailyStats.totalItems} articles vendus pour un total de {formatPrice(dailyStats.totalSales)}
                  {dailyStats.totalDiscounts > 0 && ` (remises : -${formatPrice(dailyStats.totalDiscounts)})`}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Placeholder pour les prochains points */}
        <Box sx={{ 
          p: 3, 
          backgroundColor: '#f9f9f9', 
          borderRadius: 2,
          border: '2px dashed #ccc',
          textAlign: 'center'
        }}>
          <Typography variant="h6" color="text.secondary">
            📋 Prochains points à venir...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Point 2: Répartition par catégorie
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Point 3: Méthodes de paiement
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Point 4: Remises appliquées
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          sx={{ 
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' }
          }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DailyReportModal; 