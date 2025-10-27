import React, { useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemText, Typography, Checkbox } from '@mui/material';
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
  const [selectedZs, setSelectedZs] = useState<Set<number>>(new Set());

  const toggleZ = (z: number) => {
    setSelectedZs(prev => {
      const next = new Set(prev);
      if (next.has(z)) next.delete(z); else next.add(z);
      return next;
    });
  };

  const selectAll = () => {
    const next = new Set<number>();
    for (const c of closures) {
      const z = Number((c as any)?.zNumber) || 0;
      if (z > 0) next.add(z);
    }
    setSelectedZs(next);
  };

  const clearAll = () => setSelectedZs(new Set());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clôtures archivées</DialogTitle>
      <DialogContent>
        {closures.length === 0 ? (
          <Typography>Aucune clôture enregistrée.</Typography>
        ) : (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ width: 260 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Button size="small" variant="outlined" onClick={selectAll}>Tout sélectionner</Button>
                <Button size="small" onClick={clearAll}>Tout désélectionner</Button>
              </Box>
              <List dense>
                {closures.map((c, idx) => {
                  const z = Number((c as any)?.zNumber) || 0;
                  const checked = selectedZs.has(z);
                  return (
                    <ListItem key={idx} selected={selectedIdx===idx} sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedIdx(idx)}
                      secondaryAction={
                        <Checkbox edge="end" checked={checked} onChange={(e)=>{ e.stopPropagation(); toggleZ(z); }} />
                      }
                    >
                      <ListItemText primary={`Clôture Z${c.zNumber || '?' } — ${new Date(c.closedAt).toLocaleDateString('fr-FR')}`} secondary={new Date(c.closedAt).toLocaleTimeString('fr-FR')} />
                    </ListItem>
                  );
                })}
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
          if (selectedZs.size === 0 && selectedIdx === null) return onClose();
          if (selectedZs.size > 0) {
            const list = Array.from(selectedZs).sort((a,b)=>a-b);
            const label = list.map(z=>`Z${z}`).join(', ');
            if (!window.confirm(`Supprimer ${list.length} clôture(s): ${label} ?`)) return;
            for (const z of list) {
              try { StorageService.deleteClosureByZ(Number(z)); } catch {}
            }
            onClose();
            try { alert('Clôtures supprimées. Rouvrez l\'historique pour rafraîchir.'); } catch {}
            return;
          }
          if (selectedIdx !== null) {
            const c = closures[selectedIdx];
            if (!window.confirm(`Supprimer la clôture Z${c.zNumber} du ${new Date(c.closedAt).toLocaleDateString('fr-FR')} ?`)) return;
            StorageService.deleteClosureByZ(Number(c.zNumber));
            onClose();
            try { alert('Clôture supprimée. Rouvrez l\'historique pour rafraîchir.'); } catch {}
          }
        }} color="error">Supprimer sélection</Button>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClosuresModal;


