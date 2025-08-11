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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier ticket</DialogTitle>
      <DialogContent>
        {draft && (
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



