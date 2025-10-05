import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import { StorageService } from '../../services/StorageService';
import { Transaction } from '../../types/Product';

interface ClosuresModalProps {
  open: boolean;
  onClose: () => void;
  closures: any[];
  selectedIdx: number | null;
  setSelectedIdx: (idx: number | null) => void;
  computeDailyProductSales: (txs: Transaction[]) => { product: any; totalQty: number; totalAmount: number }[];
}

const ClosuresModal: React.FC<ClosuresModalProps> = ({ open, onClose, closures, selectedIdx, setSelectedIdx, computeDailyProductSales }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clôtures archivées</DialogTitle>
      <DialogContent>
        {closures.length === 0 ? (
          <Typography>Aucune clôture enregistrée.</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: 260 }}>
              <List dense>
                {closures.map((c, idx) => (
                  <ListItem key={idx} button selected={selectedIdx===idx} onClick={() => setSelectedIdx(idx)}>
                    <ListItemText primary={`Clôture Z${c.zNumber || '?' } — ${new Date(c.closedAt).toLocaleDateString('fr-FR')}`} secondary={new Date(c.closedAt).toLocaleTimeString('fr-FR')} />
                  </ListItem>
                ))}
              </List>
            </Box>
            <Box sx={{ flex: 1 }}>
              {selectedIdx === null ? (
                <Typography variant="body2">Sélectionnez une clôture pour la visualiser.</Typography>
              ) : (() => {
                const c = closures[selectedIdx];
                const txs = c.transactions || [];
                const totalCA = txs.reduce((s: number, t: any) => s + (t.total || 0), 0);
                const byMethod = txs.reduce((acc: Record<string, number>, t: any) => {
                  const m = String(t.paymentMethod || '').toLowerCase();
                  const key = m.includes('esp') || m==='cash' ? 'Espèces' : m.includes('carte') || m==='card' ? 'Carte' : 'SumUp';
                  acc[key] = (acc[key] || 0) + (t.total || 0);
                  return acc;
                }, {} as Record<string, number>);
                const rows = computeDailyProductSales(txs);
                return (
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>Clôture Z{c.zNumber}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>Clôturée le {new Date(c.closedAt).toLocaleString('fr-FR')}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1">Total CA</Typography>
                      <Typography variant="subtitle1">{totalCA.toFixed(2)} €</Typography>
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
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Top articles</Typography>
                    <List dense>
                      {rows.map(({ product, totalQty, totalAmount }) => (
                        <ListItem key={product.id} sx={{ py: 0.25 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
                            <Typography variant="body2" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</Typography>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{`Qté: ${totalQty} • CA: ${totalAmount.toFixed(2)} €`}</Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                );
              })()} 
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          if (selectedIdx === null) return onClose();
          const c = closures[selectedIdx];
          // eslint-disable-next-line no-alert
          if (!window.confirm(`Supprimer la clôture Z${c.zNumber} du ${new Date(c.closedAt).toLocaleDateString('fr-FR')} ?`)) return;
          StorageService.deleteClosureByZ(Number(c.zNumber));
          // Mise à jour UI: retirer la clôture supprimée
          const next = closures.filter((_:any, idx:number)=> idx!==selectedIdx);
          // Astuce: onClose, l'appelant rechargera les closures
          onClose();
          // Optionnel: alerter
          try { alert('Clôture supprimée. Rouvrez l\'historique pour rafraîchir.'); } catch {}
        }} color="error">Supprimer Z</Button>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClosuresModal;


