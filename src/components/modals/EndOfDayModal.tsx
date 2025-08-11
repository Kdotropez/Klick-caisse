import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { StorageService } from '../../services/StorageService';
import { Transaction } from '../../types/Product';

interface EndOfDayModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  computeDailyProductSales: (txs: Transaction[]) => { product: any; totalQty: number; totalAmount: number }[];
  refreshToday: () => void;
}

const EndOfDayModal: React.FC<EndOfDayModalProps> = ({ open, onClose, transactions, computeDailyProductSales, refreshToday }) => {
  const txs = transactions;
  const totalCA = txs.reduce((s, t) => s + (t.total || 0), 0);
  const byMethod = txs.reduce((acc: Record<string, number>, t: any) => {
    const m = String((t as any).paymentMethod || '').toLowerCase();
    const key = m.includes('esp') || m==='cash' ? 'Espèces' : m.includes('carte') || m==='card' ? 'Carte' : 'SumUp';
    acc[key] = (acc[key] || 0) + (t.total || 0);
    return acc;
  }, {} as Record<string, number>);
  const rows = computeDailyProductSales(txs).slice(0, 10);

  const handleCloseDay = () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Valider la clôture de la journée ? Cette action archivera et remettra à zéro.')) return;
    const z = StorageService.incrementZNumber();
    const payload = { zNumber: z, closedAt: new Date().toISOString(), transactions: txs };
    StorageService.saveClosure(payload);
    StorageService.clearTodayTransactions();
    refreshToday();
    onClose();
    // eslint-disable-next-line no-alert
    window.alert(`Clôture effectuée. Z${z} enregistré.`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clôture de la journée</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Heure de clôture: {new Date().toLocaleString('fr-FR')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Total CA</Typography>
          <Typography variant="h6">{totalCA.toFixed(2)} €</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Totaux par mode de règlement</Typography>
        <List dense>
          {['Espèces','Carte','SumUp'].map(k => (
            <ListItem key={k} sx={{ py: 0.25 }}>
              <ListItemText primary={k} />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{(byMethod[k]||0).toFixed(2)} €</Typography>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Top 10 articles</Typography>
        <List dense>
          {rows.map(({ product, totalQty, totalAmount }) => (
            <ListItem key={product.id} sx={{ py: 0.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product.name}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{`Qté: ${totalQty} • CA: ${totalAmount.toFixed(2)} €`}</Typography>
              </Box>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button color="error" onClick={handleCloseDay}>Valider la clôture</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EndOfDayModal;



