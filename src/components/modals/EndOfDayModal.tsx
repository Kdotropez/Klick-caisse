import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItem, ListItemText, TextField, Typography } from '@mui/material';
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
  const getLocalDateKey = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const availableDays = useMemo(() => {
    const map = StorageService.getTransactionsByDayMap();
    return Object.keys(map)
      .filter((day) => Array.isArray(map[day]) && map[day].length > 0)
      .sort((a, b) => b.localeCompare(a));
  }, [open]);

  const todayKey = getLocalDateKey();
  const [selectedDate, setSelectedDate] = useState(() => availableDays[0] || todayKey);

  useEffect(() => {
    if (open) {
      setSelectedDate(availableDays[0] || todayKey);
    }
  }, [availableDays, open, todayKey]);

  const txs = useMemo(() => {
    const fromSelectedDay = StorageService.loadTransactionsForDay(selectedDate);
    if (fromSelectedDay.length > 0) return fromSelectedDay;
    return selectedDate === todayKey ? transactions : [];
  }, [selectedDate, todayKey, transactions]);

  const totalCA = txs.reduce((s, t) => s + (t.total || 0), 0);
  const byMethod = txs.reduce((acc: Record<string, number>, t: any) => {
    const m = String((t as any).paymentMethod || '').toLowerCase();
    const key =
      m.includes('esp') || m === 'cash'
        ? 'Espèces'
        : m.includes('carte') || m === 'card'
          ? 'Carte'
          : m.includes('chèq') || m.includes('cheq') || m === 'check'
            ? 'Chèque'
            : m === 'sumup'
              ? 'SumUp'
              : 'Autres';
    acc[key] = (acc[key] || 0) + (t.total || 0);
    return acc;
  }, {} as Record<string, number>);
  const rows = computeDailyProductSales(txs).slice(0, 10);

  const handleCloseDay = () => {
    if (txs.length === 0) {
      // eslint-disable-next-line no-alert
      window.alert(`Aucune vente à clôturer pour le ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR')}.`);
      return;
    }

    // eslint-disable-next-line no-alert
    if (!window.confirm(`Valider la clôture du ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR')} ? Cette action archivera et remettra cette journée à zéro.`)) return;

    const existingClosures = StorageService.loadClosures();
    const emptyClosureIndex = existingClosures.findIndex((closure: any) => {
      const closureTxs = Array.isArray(closure?.transactions) ? closure.transactions : [];
      const closureTotal = Number(closure?.totalCA) || closureTxs.reduce((sum: number, tx: any) => sum + (Number(tx?.total) || 0), 0);
      return closureTxs.length === 0 && Math.abs(closureTotal) < 0.01;
    });
    const reuseEmptyClosure = emptyClosureIndex >= 0 && window.confirm(
      `Une clôture vide existe déjà (Z${existingClosures[emptyClosureIndex]?.zNumber || '?'}). La remplacer par cette clôture ?`
    );

    const z = reuseEmptyClosure
      ? Number(existingClosures[emptyClosureIndex]?.zNumber) || StorageService.getMaxZNumber()
      : StorageService.incrementZNumber();
    const payload = {
      zNumber: z,
      closedAt: selectedDate === todayKey ? new Date().toISOString() : `${selectedDate}T23:59:59.000`,
      actualClosedAt: new Date().toISOString(),
      businessDate: selectedDate,
      transactions: txs,
      totalCA,
      totalTransactions: txs.length,
    };

    if (reuseEmptyClosure) {
      const nextClosures = [...existingClosures];
      nextClosures[emptyClosureIndex] = payload;
      StorageService.saveAllClosures(nextClosures);
    } else {
      StorageService.saveClosure(payload);
    }

    StorageService.clearTransactionsForDay(selectedDate);
    // Sauvegarde automatique locale, téléchargement limité pour éviter d'empiler les popups navigateur.
    try { StorageService.addAutoBackup(); } catch {}
    refreshToday();
    onClose();
    // eslint-disable-next-line no-alert
    window.alert(`Clôture du ${new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR')} effectuée. Z${z} enregistré.`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Clôture de la journée</DialogTitle>
      <DialogContent>
        <TextField
          label="Journée à clôturer"
          type="date"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          sx={{ mb: 2, mt: 1 }}
          helperText={availableDays.length > 0 ? 'La dernière journée avec tickets est sélectionnée automatiquement.' : 'Aucune journée non clôturée détectée.'}
        />
        {txs.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Aucune vente trouvée pour cette journée. Le Z ne peut pas être validé vide.
          </Alert>
        )}
        <Typography variant="body2" sx={{ mb: 1 }}>Heure de clôture: {new Date().toLocaleString('fr-FR')}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6">Total CA</Typography>
          <Typography variant="h6">{totalCA.toFixed(2)} €</Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Totaux par mode de règlement</Typography>
        <List dense>
          {['Espèces','Carte','SumUp','Chèque','Autres'].map(k => (
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
        <Button color="error" onClick={handleCloseDay} disabled={txs.length === 0}>Valider la clôture</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EndOfDayModal;



