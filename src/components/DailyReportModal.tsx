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
import { Close, TrendingUp, Euro } from '@mui/icons-material';
import { IconButton } from '@mui/material';
import { CartItem } from '../types/Product';

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
    averageTransactionValue: 0
  });

  // Calculer les statistiques quotidiennes
  useEffect(() => {
    if (cartItems.length > 0) {
      const totalSales = cartItems.reduce((sum, item) => {
        const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
        return sum + (price * item.quantity);
      }, 0);

      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Pour l'instant, on considère que chaque panier = 1 transaction
      // Plus tard, on pourra améliorer avec un vrai système de transactions
      const totalTransactions = 1;
      const averageTransactionValue = totalSales / totalTransactions;

      setDailyStats({
        totalSales,
        totalItems,
        totalTransactions,
        averageTransactionValue
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
            Rapport Journalier · Klick V2.1
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
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
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

              {/* Résumé */}
              <Box sx={{ 
                p: 2, 
                backgroundColor: '#e8f5e8', 
                borderRadius: 1,
                border: '1px solid #4caf50'
              }}>
                <Typography variant="body1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                  📊 Résumé : {dailyStats.totalItems} articles vendus pour un total de {formatPrice(dailyStats.totalSales)}
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