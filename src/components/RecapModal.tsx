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

interface RecapModalProps {
  open: boolean;
  onClose: () => void;
  cartItems: CartItem[];
}

const RecapModal: React.FC<RecapModalProps> = ({ open, onClose, cartItems }) => {
  const totalAmount = cartItems.reduce((sum, item) => {
    const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
    return sum + (price * item.quantity);
  }, 0);

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

             <DialogContent sx={{ p: 2 }}>
         {/* En-tête du ticket */}
         <Paper elevation={1} sx={{ p: 1.5, mb: 1.5, backgroundColor: '#f8f9fa' }}>
           <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', mb: 0.5 }}>
             TICKET DE CAISSE
           </Typography>
           <Typography variant="caption" align="center" display="block" color="text.secondary">
             {formatDate()} - Ticket #{Math.floor(Math.random() * 10000).toString().padStart(4, '0')}
           </Typography>
         </Paper>

         {/* Liste compacte des articles */}
         <Box sx={{ mb: 2 }}>
           <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}>
             Récapitulatif des Articles
           </Typography>
           
           <Paper elevation={1} sx={{ backgroundColor: 'white', border: '1px solid #e0e0e0' }}>
             {cartItems.map((item, index) => {
               const price = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
               const totalPrice = price * item.quantity;
               
               return (
                 <Box key={`${item.product.id}-${item.selectedVariation?.id || 'main'}`}>
                   <Box sx={{ 
                     display: 'flex', 
                     justifyContent: 'space-between', 
                     alignItems: 'center',
                     p: 1,
                     py: 0.75,
                     borderBottom: index < cartItems.length - 1 ? '1px solid #f0f0f0' : 'none'
                   }}>
                     {/* Quantité */}
                     <Box sx={{ 
                       minWidth: '40px',
                       textAlign: 'center',
                       backgroundColor: '#e3f2fd',
                       borderRadius: '4px',
                       px: 1,
                       py: 0.25
                     }}>
                       <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                         {item.quantity}
                       </Typography>
                     </Box>
                     
                     {/* Nom du produit */}
                     <Box sx={{ flex: 1, mx: 1 }}>
                       <Typography variant="body2" sx={{ fontWeight: '600', lineHeight: 1.2 }}>
                         {item.product.name}
                       </Typography>
                       {item.selectedVariation && (
                         <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                           {item.selectedVariation.attributes}
                         </Typography>
                       )}
                     </Box>
                     
                     {/* Prix total */}
                     <Box sx={{ 
                       minWidth: '60px',
                       textAlign: 'right'
                     }}>
                       <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                         {totalPrice.toFixed(2)} €
                       </Typography>
                     </Box>
                   </Box>
                 </Box>
               );
             })}
           </Paper>
         </Box>

         {/* Total compact */}
         <Paper elevation={1} sx={{ p: 1.5, backgroundColor: '#e3f2fd' }}>
           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <Box>
               <Typography variant="body2" color="text.secondary">
                 {totalItems} articles • {cartItems.length} produits
               </Typography>
             </Box>
             <Box sx={{ textAlign: 'right' }}>
               <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                 TOTAL: {totalAmount.toFixed(2)} €
               </Typography>
             </Box>
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