import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Typography } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { StorageService } from '../../services/StorageService';

interface GlobalTicketEditorModalProps {
  open: boolean;
  onClose: () => void;
  isToday: boolean;
  draft: any | null;
  setDraft: (updater: (prev: any) => any) => void;
  refreshToday: () => void;
}

const GlobalTicketEditorModal: React.FC<GlobalTicketEditorModalProps> = ({ open, onClose, isToday, draft, setDraft, refreshToday }) => {
  // Debug: afficher les informations du draft
  console.log('GlobalTicketEditorModal - draft:', draft);
  console.log('GlobalTicketEditorModal - paymentMethod:', draft?.paymentMethod);
  
  const recalcAndSave = () => {
    if (!draft) return;
    const total = (draft.items || []).reduce((s:number, it:any) => {
      const up = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
      return s + (up * (it.quantity||0));
    }, 0);
    const updated = { ...draft, total };
    if (isToday) {
      StorageService.updateDailyTransaction(updated);
      refreshToday();
    } else {
      const closures = StorageService.loadClosures();
      const newClosures = closures.map(c => {
        const arr = Array.isArray(c.transactions) ? c.transactions : [];
        const idx = arr.findIndex((t:any) => String(t.id) === String(updated.id));
        if (idx >= 0) {
          const copy = [...arr];
          copy[idx] = updated;
          return { ...c, transactions: copy };
        }
        return c;
      });
      StorageService.saveAllClosures(newClosures);
    }
    onClose();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return '💵 Espèces';
      case 'card': return '💳 Carte';
      case 'check': return '📝 Chèque';
      case 'sumup': return '📱 SumUp';
      default: return method;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier ticket</DialogTitle>
      <DialogContent>
        {draft && (
          <Box>
            {/* Sélection du mode de règlement */}
            <Typography variant="h6" sx={{ mb: 1 }}>Mode de règlement</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
              <Button
                variant={draft.paymentMethod === 'cash' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'cash' ? 'success' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'cash' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                💵 Espèces
              </Button>
              <Button
                variant={draft.paymentMethod === 'card' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'card' ? 'primary' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'card' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                💳 Carte
              </Button>
              <Button
                variant={draft.paymentMethod === 'check' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'check' ? 'warning' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'check' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                📝 Chèque
              </Button>
              <Button
                variant={draft.paymentMethod === 'sumup' ? 'contained' : 'outlined'}
                color={draft.paymentMethod === 'sumup' ? 'secondary' : 'primary'}
                onClick={() => setDraft((prev: any) => ({ ...prev, paymentMethod: 'sumup' }))}
                sx={{ py: 1.5, fontSize: '0.9rem' }}
              >
                📱 SumUp
              </Button>
            </Box>

            {/* Liste des articles */}
            <Typography variant="h6" sx={{ mb: 1 }}>Articles du ticket</Typography>
            <List dense>
              {draft.items.map((it: any, idx: number) => {
                const unitPrice = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
                return (
                  <ListItem key={it.product.id + '-' + idx} sx={{ py: 0.25 }}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => setDraft((prev: any) => {
                          const d = { ...prev, items: prev.items.map((x:any,i:number)=> i===idx ? { ...x, quantity: Math.max(0, (x.quantity||0)-1) } : x) };
                          return d;
                        })}><Remove fontSize="small" /></IconButton>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 20, textAlign: 'center' }}>{it.quantity}</Typography>
                        <IconButton size="small" onClick={() => setDraft((prev: any) => {
                          const d = { ...prev, items: prev.items.map((x:any,i:number)=> i===idx ? { ...x, quantity: (x.quantity||0)+1 } : x) };
                          return d;
                        })}><Add fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDraft((prev:any) => {
                          const d = { ...prev, items: prev.items.filter((_:any,i:number)=> i!==idx) };
                          return d;
                        })}>✕</IconButton>
                      </Box>
                    }
                  >
                    <ListItemText primary={it.product.name} secondary={`${it.quantity} x ${unitPrice.toFixed(2)} € = ${(it.quantity*unitPrice).toFixed(2)} €`} />
                  </ListItem>
                );
              })}
              {draft.items.length===0 && (
                <ListItem><ListItemText primary="Ticket vide" /></ListItem>
              )}
            </List>

            {/* Total du ticket */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="h6" align="right">
                Total: {draft.total?.toFixed(2) || '0.00'} €
              </Typography>
              <Typography variant="body2" align="right" color="text.secondary">
                Mode de règlement: {getPaymentMethodLabel(draft.paymentMethod || 'cash')}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={recalcAndSave}>Enregistrer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalTicketEditorModal;



