import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { ExpandMore, ExpandLess, Receipt } from '@mui/icons-material';
import { Transaction } from '../types/Product';

interface TransactionHistoryProps {
  transactions: Transaction[];
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions }) => {
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleExpand = (transactionId: string) => {
    setExpandedTransaction(expandedTransaction === transactionId ? null : transactionId);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'card': return 'Carte bancaire';
      case 'cash': return 'Espèces';
      case 'sumup': return 'SumUp';
      default: return method;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'card': return 'primary';
      case 'cash': return 'success';
      case 'sumup': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Historique des transactions
      </Typography>
      
      {transactions.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Aucune transaction enregistrée
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          {transactions.map((transaction) => (
            <Card key={transaction.id} sx={{ mb: 2 }}>
              <ListItem>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="h6">
                        Transaction #{transaction.id.slice(-6)}
                      </Typography>
                      <Chip
                        label={getPaymentMethodLabel(transaction.paymentMethod)}
                        color={getPaymentMethodColor(transaction.paymentMethod) as any}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2">
                        {formatDate(transaction.timestamp)}
                      </Typography>
                      <Typography variant="body2">
                        Caissier: {transaction.cashierName}
                      </Typography>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        Total: {transaction.total.toFixed(2)} €
                      </Typography>
                    </Box>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<Receipt />}
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    Reçu
                  </Button>
                  <IconButton onClick={() => handleExpand(transaction.id)}>
                    {expandedTransaction === transaction.id ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </ListItem>
              
              <Collapse in={expandedTransaction === transaction.id}>
                <Box sx={{ p: 2, pt: 0 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Détails de la commande:
                  </Typography>
                  <List dense>
                    {transaction.items.map((item) => (
                      <ListItem key={item.product.id} sx={{ py: 0.5 }}>
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
                  <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">Sous-total:</Typography>
                      <Typography variant="body2">{transaction.total.toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">TVA (20%):</Typography>
                      <Typography variant="body2">{(transaction.total * 0.20).toFixed(2)} €</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" fontWeight="bold">Total:</Typography>
                                              <Typography variant="body1" fontWeight="bold" color="primary">
                          {transaction.total.toFixed(2)} €
                        </Typography>
                    </Box>
                  </Box>
                </Box>
              </Collapse>
            </Card>
          ))}
        </List>
      )}

      {/* Dialog pour afficher le reçu */}
      <Dialog
        open={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        maxWidth="sm"
        fullWidth
      >
        {selectedTransaction && (
          <>
            <DialogTitle>
              Reçu - Transaction #{selectedTransaction.id.slice(-6)}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" gutterBottom>
                  KLICK CAISSE
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(selectedTransaction.timestamp)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Caissier: {selectedTransaction.cashierName}
                </Typography>
              </Box>
              
              <Box sx={{ borderTop: 1, borderBottom: 1, borderColor: 'divider', py: 2, mb: 2 }}>
                {selectedTransaction.items.map((item) => (
                  <Box key={item.product.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="body1">{item.product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} x {item.product.finalPrice.toFixed(2)} €
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {(item.quantity * item.product.finalPrice).toFixed(2)} €
                    </Typography>
                  </Box>
                ))}
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>Sous-total:</Typography>
                  <Typography>{selectedTransaction.total.toFixed(2)} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography>TVA (20%):</Typography>
                  <Typography>{(selectedTransaction.total * 0.20).toFixed(2)} €</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6">{selectedTransaction.total.toFixed(2)} €</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Paiement: {getPaymentMethodLabel(selectedTransaction.paymentMethod)}
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center', mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  Merci de votre visite !
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTransaction(null)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default TransactionHistory; 