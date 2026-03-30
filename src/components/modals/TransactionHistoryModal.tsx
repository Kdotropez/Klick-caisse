import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItem, TextField, Typography } from '@mui/material';
import { Transaction } from '../../types/Product';
import { StorageService } from '../../services/StorageService';
import { List } from 'react-window';

interface TransactionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  transactions: Transaction[];
  filterPayment: 'all' | 'cash' | 'card' | 'sumup';
  setFilterPayment: (v: 'all' | 'cash' | 'card' | 'sumup') => void;
  filterAmountMin: string;
  setFilterAmountMin: (v: string) => void;
  filterAmountMax: string;
  setFilterAmountMax: (v: string) => void;
  filterAmountExact: string;
  setFilterAmountExact: (v: string) => void;
  filterProductText: string;
  setFilterProductText: (v: string) => void;
  daySelectedIds: Set<string>;
  setDaySelectedIds: (updater: (prev: Set<string>) => Set<string>) => void;
  expandedDayTicketIds: Set<string>;
  setExpandedDayTicketIds: (updater: (prev: Set<string>) => Set<string>) => void;
  setTransactions: (txs: Transaction[]) => void;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({
  open,
  onClose,
  transactions,
  filterPayment,
  setFilterPayment,
  filterAmountMin,
  setFilterAmountMin,
  filterAmountMax,
  setFilterAmountMax,
  filterAmountExact,
  setFilterAmountExact,
  filterProductText,
  setFilterProductText,
  daySelectedIds,
  setDaySelectedIds,
  expandedDayTicketIds,
  setExpandedDayTicketIds,
  setTransactions,
}) => {
  const filtered = useMemo(() => {
    const min = parseFloat(filterAmountMin || 'NaN');
    const max = parseFloat(filterAmountMax || 'NaN');
    const exact = parseFloat(filterAmountExact || 'NaN');

    const needle = filterProductText.trim() ? StorageService.normalizeLabel(filterProductText) : '';

    return transactions.filter(t => {
      const m = String((t as any).paymentMethod || '').toLowerCase();
      if (filterPayment === 'cash' && !(m === 'cash' || m.includes('esp'))) return false;
      if (filterPayment === 'card' && !(m === 'card' || m.includes('carte'))) return false;
      if (filterPayment === 'sumup' && m !== 'sumup') return false;

      const amount = t.total || 0;
      if (!Number.isNaN(exact) && Math.abs(amount - exact) > 0.009) return false;
      if (!Number.isNaN(min) && amount < min) return false;
      if (!Number.isNaN(max) && amount > max) return false;

      if (needle) {
        const items = Array.isArray(t.items) ? t.items : [];
        const has = items.some((it: any) => StorageService.normalizeLabel(it.product.name).includes(needle));
        if (!has) return false;
      }
      return true;
    });
  }, [
    transactions,
    filterPayment,
    filterAmountMin,
    filterAmountMax,
    filterAmountExact,
    filterProductText,
  ]);

  const renderedRows = useMemo(() => {
    return filtered.map((t: any) => {
      const items = Array.isArray(t.items) ? t.items : [];
      const qty = items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
      const shortId = String(t.id).slice(-6);
      const dt = new Date(t.timestamp as any);
      const dateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const isExpanded = expandedDayTicketIds.has(String(t.id));
      return { t, items, qty, shortId, dateStr, timeStr, isExpanded };
    });
  }, [filtered, expandedDayTicketIds]);

  const listBoxRef = useRef<HTMLDivElement | null>(null);
  const [listSize, setListSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const el = listBoxRef.current;
    if (!el) return;

    const update = () => {
      const r = el.getBoundingClientRect();
      const width = Math.floor(r.width);
      const height = Math.floor(r.height);
      setListSize(prev => (prev.width === width && prev.height === height ? prev : { width, height }));
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const getRowHeight = useCallback((index: number) => {
    const row = renderedRows[index];
    if (!row) return 44;
    const base = 44; // ligne principale
    if (!row.isExpanded) return base;
    const perItem = 24;
    const details = 10 + row.items.length * perItem;
    return base + details;
  }, [renderedRows]);

  const toggleSelect = (tid: string) => {
    setDaySelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(tid)) next.delete(tid); else next.add(tid);
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tickets de la journée</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1 }}>
          <Button size="small" variant={filterPayment==='all'?'contained':'outlined'} onClick={() => setFilterPayment('all')}>Tous</Button>
          <Button size="small" variant={filterPayment==='cash'?'contained':'outlined'} onClick={() => setFilterPayment('cash')}>Espèces</Button>
          <Button size="small" variant={filterPayment==='card'?'contained':'outlined'} onClick={() => setFilterPayment('card')}>Carte</Button>
          <Button size="small" variant={filterPayment==='sumup'?'contained':'outlined'} onClick={() => setFilterPayment('sumup')}>SumUp</Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mb: 1 }}>
          <TextField size="small" label="Montant min" value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          <TextField size="small" label="Montant max" value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          <TextField size="small" label="Montant exact" value={filterAmountExact} onChange={(e) => setFilterAmountExact(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
        </Box>
        <TextField size="small" fullWidth label="Contient article" value={filterProductText} onChange={(e) => setFilterProductText(e.target.value)} sx={{ mb: 1 }} />

        <Box ref={listBoxRef} sx={{ height: '52vh', minHeight: 320, border: '1px solid #eee', borderRadius: 1, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Aucun ticket pour ces filtres</Box>
          ) : (
            listSize.width > 0 && listSize.height > 0 && (
              <List
                style={{ width: listSize.width, height: listSize.height }}
                rowCount={renderedRows.length}
                rowHeight={(index: number) => getRowHeight(index)}
                overscanCount={8}
                rowProps={{}}
                rowComponent={({ index, style }: any) => {
                  const row = renderedRows[index];
                  if (!row) return <div style={style} />;

                  const { t, items, qty, shortId, dateStr, timeStr, isExpanded } = row;
                  const tid = String(t.id);
                  const toggleExpand = () => setExpandedDayTicketIds(prev => { const next=new Set(prev); const k=tid; if(next.has(k)) next.delete(k); else next.add(k); return next; });

                  return (
                    <div style={style} key={tid}>
                      <ListItem sx={{ py: 0.25, borderBottom: '1px solid #eee', px: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '26px 84px 120px 110px 86px auto auto', alignItems: 'center', gap: 0.5, width: '100%' }}>
                            <input type="checkbox" checked={daySelectedIds.has(tid)} onChange={() => toggleSelect(tid)} />
                            <Typography noWrap variant="caption" onClick={toggleExpand} sx={{ fontFamily: 'monospace', color: '#1976d2', cursor: 'pointer' }}>#{shortId}</Typography>
                            <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>{dateStr} {timeStr}</Typography>
                            <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace' }}>{`${qty} article${qty>1?'s':''}`}</Typography>
                            <Typography noWrap variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{(t.total||0).toFixed(2)} €</Typography>
                            <Button size="small" variant="outlined" sx={{ minWidth: 64, px: 1 }} onClick={() => { /* placeholder */ }}>Modif</Button>
                            <Button size="small" color="error" sx={{ minWidth: 64, px: 1 }} onClick={() => {
                              // eslint-disable-next-line no-alert
                              if (!window.confirm('Inverser les ventes de ce ticket (retour) ?')) return;
                              const inverse = {
                                ...t,
                                id: `${t.id}-R`,
                                total: -Math.abs(t.total||0),
                                items: (Array.isArray(t.items)?t.items:[]).map((it: any) => ({ ...it, quantity: -Math.abs(it.quantity||0) })),
                                timestamp: new Date(),
                              } as any;
                              StorageService.addDailyTransaction(inverse);
                              try { StorageService.addAutoBackup(); } catch {}
                              try { StorageService.downloadFullBackup(); } catch {}
                              setTransactions(StorageService.loadTodayTransactions());
                            }}>Inv</Button>
                          </Box>
                          {isExpanded && (
                            <Box sx={{ mt: 0.5, ml: 1 }}>
                              {items.map((it:any, itemIndex: number) => (
                                <Box key={`${t.id}-${it.product.id}-${it.selectedVariation?.id || 'main'}-${itemIndex}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, pl: 1 }}>
                                  <Typography variant="caption" sx={{ minWidth: 48, textAlign: 'right', fontFamily: 'monospace' }}>{it.quantity}</Typography>
                                  <Typography variant="caption">x</Typography>
                                  <Typography variant="caption" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.product.name}</Typography>
                                  <Typography variant="caption" sx={{ minWidth: 90, textAlign: 'right', fontFamily: 'monospace' }}>{(it.quantity * (it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice)).toFixed(2)} €</Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </ListItem>
                    </div>
                  );
                }}
              />
            )
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { onClose(); setDaySelectedIds(() => new Set()); }}>Fermer</Button>
        <Button color="error" variant="contained" disabled={daySelectedIds.size===0} onClick={() => {
          const now = new Date();
          const expected = `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}`; // jjmm
          // eslint-disable-next-line no-alert
          const code = window.prompt('code ?');
          if (code !== expected) return;
          Array.from(daySelectedIds).forEach((tid) => {
            try { StorageService.deleteDailyTransaction(String(tid)); } catch {}
          });
          // Sauvegarde auto + téléchargement JSON après suppression/annulation
          try { StorageService.addAutoBackup(); } catch {}
          try { StorageService.downloadFullBackup(); } catch {}
          setTransactions(StorageService.loadTodayTransactions());
          setDaySelectedIds(() => new Set());
          // eslint-disable-next-line no-alert
          window.alert('Tickets du jour supprimés.');
        }}>Supprimer sélection</Button>
        <Button color="error" onClick={() => { StorageService.clearTodayTransactions(); setTransactions([]); setDaySelectedIds(() => new Set()); }}>Vider</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransactionHistoryModal;



