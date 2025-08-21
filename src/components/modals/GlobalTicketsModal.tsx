import React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, TextField, Typography } from '@mui/material';
import { StorageService } from '../../services/StorageService';

interface GlobalTicketsModalProps {
  open: boolean;
  onClose: () => void;
  onlyToday: boolean;
  setOnlyToday: (v: boolean) => void;
  filterPayment: 'all' | 'cash' | 'card' | 'sumup';
  setFilterPayment: (v: 'all' | 'cash' | 'card' | 'sumup') => void;
  amountMin: string;
  setAmountMin: (v: string) => void;
  amountMax: string;
  setAmountMax: (v: string) => void;
  amountExact: string;
  setAmountExact: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  timeFrom: string;
  setTimeFrom: (v: string) => void;
  timeTo: string;
  setTimeTo: (v: string) => void;
  selectedIds: Set<string>;
  setSelectedIds: (updater: (prev: Set<string>) => Set<string>) => void;
  expandedIds: Set<string>;
  setExpandedIds: (updater: (prev: Set<string>) => Set<string>) => void;
  onOpenEditor: (txId: string) => void;
  refreshTodayTransactions: () => void;
}

const GlobalTicketsModal: React.FC<GlobalTicketsModalProps> = ({
  open,
  onClose,
  onlyToday,
  setOnlyToday,
  filterPayment,
  setFilterPayment,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  amountExact,
  setAmountExact,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  timeFrom,
  setTimeFrom,
  timeTo,
  setTimeTo,
  selectedIds,
  setSelectedIds,
  expandedIds,
  setExpandedIds,
  onOpenEditor,
  refreshTodayTransactions,
}) => {
  const allClosures = StorageService.loadClosures();
  const allTx: any[] = [];
  for (const c of allClosures) {
    const txs = Array.isArray(c.transactions) ? c.transactions : [];
    for (const t of txs) allTx.push(t);
  }
  const todayTxs = StorageService.loadTodayTransactions();
  for (const t of todayTxs) allTx.push(t);
  // Ajouter toutes les transactions archivées par jour (y compris les jours précédents)
  try {
    const raw = localStorage.getItem('klick_caisse_transactions_by_day');
    if (raw) {
      const map = JSON.parse(raw) as Record<string, any[]>;
      const todayStr = new Date().toISOString().slice(0,10);
      Object.keys(map).forEach((day) => {
        const list = Array.isArray(map[day]) ? map[day] : [];
        // Éviter le doublon de la journée en cours (déjà ajoutée via loadTodayTransactions)
        if (day === todayStr) {
          return;
        }
        list.forEach((t: any) => allTx.push(t));
      });
    }
  } catch {}
  if (onlyToday) {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    const only = allTx.filter((t: any) => {
      const ts = new Date(t.timestamp);
      return ts >= todayStart && ts <= todayEnd;
    });
    allTx.length = 0; only.forEach(x => allTx.push(x));
  }
  const filtered = allTx.filter((t: any) => {
    const m = String(t.paymentMethod || '').toLowerCase();
    if (filterPayment === 'cash' && !(m==='cash' || m.includes('esp'))) return false;
    if (filterPayment === 'card' && !(m==='card' || m.includes('carte'))) return false;
    if (filterPayment === 'sumup' && m!=='sumup') return false;
    const amount = t.total || 0;
    const min = parseFloat(amountMin || 'NaN');
    const max = parseFloat(amountMax || 'NaN');
    const exact = parseFloat(amountExact || 'NaN');
    if (!Number.isNaN(exact) && Math.abs(amount - exact) > 0.009) return false;
    if (!Number.isNaN(min) && amount < min) return false;
    if (!Number.isNaN(max) && amount > max) return false;
    if (dateFrom) {
      const dfrom = new Date(dateFrom + 'T00:00:00');
      if (new Date(t.timestamp) < dfrom) return false;
    }
    if (dateTo) {
      const dto = new Date(dateTo + 'T23:59:59');
      if (new Date(t.timestamp) > dto) return false;
    }
    if (timeFrom) {
      const [h,m] = timeFrom.split(':').map(Number);
      const ts = new Date(t.timestamp); const tf = new Date(ts); tf.setHours(h||0, m||0, 0, 0);
      if (ts < tf) return false;
    }
    if (timeTo) {
      const [h,m] = timeTo.split(':').map(Number);
      const ts = new Date(t.timestamp); const tt = new Date(ts); tt.setHours(h||23, m||59, 59, 999);
      if (ts > tt) return false;
    }
    return true;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tickets globaux</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.5, mb: 1 }}>
          <Button size="small" variant={filterPayment==='all'?'contained':'outlined'} onClick={() => setFilterPayment('all')}>Tous</Button>
          <Button size="small" variant={filterPayment==='cash'?'contained':'outlined'} onClick={() => setFilterPayment('cash')}>Espèces</Button>
          <Button size="small" variant={filterPayment==='card'?'contained':'outlined'} onClick={() => setFilterPayment('card')}>Carte</Button>
          <Button size="small" variant={filterPayment==='sumup'?'contained':'outlined'} onClick={() => setFilterPayment('sumup')}>SumUp</Button>
          <Button size="small" variant={onlyToday?'contained':'outlined'} onClick={() => setOnlyToday(!onlyToday)}>Aujourd'hui</Button>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mb: 1 }}>
          <TextField size="small" label="Montant min" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          <TextField size="small" label="Montant max" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
          <TextField size="small" label="Montant exact" value={amountExact} onChange={(e) => setAmountExact(e.target.value)} inputProps={{ inputMode: 'decimal' }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.5, mb: 1 }}>
          <TextField size="small" type="date" label="Date de" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Date à" value={dateTo} onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="time" label="Heure de" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="time" label="Heure à" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, mb: 1 }}>
          <Button size="small" variant="outlined" onClick={() => {
            setFilterPayment('all');
            setOnlyToday(false);
            setAmountMin('');
            setAmountMax('');
            setAmountExact('');
            setDateFrom('');
            setDateTo('');
            setTimeFrom('');
            setTimeTo('');
            setSelectedIds(() => new Set());
            setExpandedIds(() => new Set());
          }}>Réinitialiser filtres</Button>

          <Button size="small" variant="contained" onClick={() => {
            try {
              const raw = localStorage.getItem('klick_caisse_transactions_by_day');
              if (!raw) { alert('Aucune sauvegarde de tickets trouvée.'); return; }
              const map = JSON.parse(raw) as Record<string, any[]>;
              const days = Object.keys(map)
                .filter(d => Array.isArray(map[d]) && map[d].length > 0)
                .sort();
              if (days.length === 0) { alert('Aucune date avec tickets trouvée.'); return; }
              setOnlyToday(false);
              setFilterPayment('all');
              setAmountMin('');
              setAmountMax('');
              setAmountExact('');
              setTimeFrom('');
              setTimeTo('');
              setDateFrom(days[0]);
              setDateTo(days[days.length - 1]);
            } catch {
              alert('Erreur lors de la lecture des dates disponibles.');
            }
          }}>Charger dates</Button>
        </Box>

        <List dense>
          {filtered.map((t: any) => {
            const qty = Array.isArray(t.items) ? t.items.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
            const isEx = expandedIds.has(String(t.id));
            return (
              <ListItem key={`${t.id}-${t.timestamp}`} sx={{ py: 0.25, borderBottom: '1px solid #eee', px: 1 }}>
                                 <Box sx={{ display: 'grid', gridTemplateColumns: '26px 84px 120px 110px 120px 86px', alignItems: 'center', gap: 0.5, width: '100%' }}>
                   <input type="checkbox" checked={selectedIds.has(String(t.id))} onChange={() => setSelectedIds(prev => { const next=new Set(prev); const k=String(t.id); if(next.has(k)) next.delete(k); else next.add(k); return next; })} />
                   <Typography noWrap variant="caption" onClick={() => setExpandedIds(prev=>{const next=new Set(prev); const k=String(t.id); if(next.has(k)) next.delete(k); else next.add(k); return next;})} sx={{ fontFamily: 'monospace', color: '#1976d2', cursor: 'pointer' }}>#{String(t.id).slice(-6)}</Typography>
                   <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>{new Date(t.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</Typography>
                   <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>{new Date(t.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                   <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace' }}>{`${qty} article${qty>1?'s':''}`}</Typography>
                   <Typography noWrap variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>{(t.total||0).toFixed(2)} €</Typography>
                 </Box>
                                 {isEx && (
                   <Box sx={{ mt: 0.5, ml: 1 }}>
                     {/* Calculer le total des remises pour cette transaction */}
                     {(() => {
                       let totalDiscountForTx = 0;
                       if (t.items && Array.isArray(t.items)) {
                         t.items.forEach((item: any) => {
                           const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                           const originalTotal = originalPrice * item.quantity;
                           if (t.itemDiscounts && t.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`]) {
                             const discount = t.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`];
                             let finalTotal = originalTotal;
                             if (discount.type === 'euro') {
                               finalTotal = Math.max(0, originalTotal - (discount.value * item.quantity));
                             } else if (discount.type === 'percent') {
                               finalTotal = originalTotal * (1 - discount.value / 100);
                             } else if (discount.type === 'price') {
                               finalTotal = discount.value * item.quantity;
                             }
                             totalDiscountForTx += (originalTotal - finalTotal);
                           }
                         });
                       }
                       return (
                         <Box sx={{ 
                           display: 'grid', 
                           gridTemplateColumns: '26px 84px 120px 110px 120px 86px', 
                           alignItems: 'center', 
                           gap: 0.5, 
                           width: '100%',
                           mb: 1,
                           backgroundColor: '#fff3e0',
                           p: 0.5,
                           borderRadius: 0.5
                         }}>
                           <Box></Box>
                           <Box></Box>
                           <Box></Box>
                           <Box></Box>
                           <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#f44336' }}>
                             {totalDiscountForTx > 0 ? `TOTAL REMISE ${totalDiscountForTx.toFixed(0)} €` : ''}
                           </Typography>
                           <Box></Box>
                         </Box>
                       );
                     })()}
                     
                     {(Array.isArray(t.items)?t.items:[]).map((it:any) => {
                      const originalPrice = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
                      const originalTotal = originalPrice * it.quantity;
                      
                      // Calculer le prix final avec remises
                      let finalPrice = originalPrice;
                      let finalTotal = originalTotal;
                      let discountAmount = 0;
                      
                                             // Vérifier s'il y a des remises sur cet article
                       const discountKey = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
                       console.log('Checking discount for:', discountKey, 'ItemDiscounts:', t.itemDiscounts);
                       if (t.itemDiscounts && t.itemDiscounts[discountKey]) {
                         const discount = t.itemDiscounts[discountKey];
                         console.log('Found discount:', discount);
                         if (discount.type === 'euro') {
                           finalPrice = Math.max(0, originalPrice - discount.value);
                           finalTotal = finalPrice * it.quantity;
                           discountAmount = originalTotal - finalTotal;
                         } else if (discount.type === 'percent') {
                           finalPrice = originalPrice * (1 - discount.value / 100);
                           finalTotal = finalPrice * it.quantity;
                           discountAmount = originalTotal - finalTotal;
                         } else if (discount.type === 'price') {
                           finalPrice = discount.value;
                           finalTotal = finalPrice * it.quantity;
                           discountAmount = originalTotal - finalTotal;
                         }
                                                }
                       
                         console.log('Final total for', it.product.name, ':', finalTotal, 'Original:', originalTotal, 'Discount:', discountAmount, 'Will show discount:', discountAmount > 0);
                       
                         return (
                         <Box key={it.product.id} sx={{ 
                           display: 'flex', 
                           flexDirection: 'column', 
                           gap: 0.5, 
                           pl: 1,
                           py: 0.25
                         }}>
                           <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 200 }}>
                               {it.quantity}x {it.product.name}
                             </Typography>
                             <Typography variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                               {finalTotal.toFixed(2)} €
                             </Typography>
                           </Box>
                                                       {discountAmount > 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" sx={{ color: '#f44336', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                  -{discountAmount.toFixed(2)}€ / ({originalTotal.toFixed(2)}€) / {finalTotal.toFixed(2)}€
                                </Typography>
                              </Box>
                            )}
                            {discountAmount === 0 && (
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', pl: 1 }}>
                                <Typography variant="caption" sx={{ color: '#666', fontFamily: 'monospace' }}>
                                  Pas de remise
                                </Typography>
                              </Box>
                            )}
                         </Box>
                       );
                    })}
                  </Box>
                )}
              </ListItem>
            );
          })}
          {filtered.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>Aucun ticket pour ces filtres</Box>
          )}
        </List>

        {/* Résumé avec total des remises */}
        {filtered.length > 0 && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: '#fff3e0', 
            borderRadius: 1,
            border: '1px solid #ff9800'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                Résumé des {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
              </Typography>
            </Box>
            
            {(() => {
              let totalSales = 0;
              let totalOriginalAmount = 0;
              let totalDiscounts = 0;

              filtered.forEach((t: any) => {
                totalSales += t.total || 0;
                
                if (t.items && Array.isArray(t.items)) {
                  t.items.forEach((item: any) => {
                    const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                    const originalTotal = originalPrice * item.quantity;
                    totalOriginalAmount += originalTotal;
                    
                    // Calculer les remises
                    if (t.itemDiscounts && t.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`]) {
                      const discount = t.itemDiscounts[`${item.product.id}-${item.selectedVariation?.id || 'main'}`];
                      let finalTotal = originalTotal;
                      
                      if (discount.type === 'euro') {
                        finalTotal = Math.max(0, originalTotal - (discount.value * item.quantity));
                      } else if (discount.type === 'percent') {
                        finalTotal = originalTotal * (1 - discount.value / 100);
                      } else if (discount.type === 'price') {
                        finalTotal = discount.value * item.quantity;
                      }
                      
                      totalDiscounts += (originalTotal - finalTotal);
                    }
                  });
                }
              });

              return (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#666' }}>CA Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                      {totalSales.toFixed(2)} €
                    </Typography>
                  </Box>
                  
                  {totalDiscounts > 0 && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>Remises Total</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                        -{totalDiscounts.toFixed(2)} €
                      </Typography>
                    </Box>
                  )}
                  
                  {totalDiscounts > 0 && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" sx={{ color: '#666' }}>Montant Original</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                        {totalOriginalAmount.toFixed(2)} €
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button disabled={selectedIds.size!==1} onClick={() => {
          const [tid] = Array.from(selectedIds);
          onOpenEditor(tid);
        }}>Modifier</Button>
        <Button color="error" variant="contained" disabled={selectedIds.size===0} onClick={() => {
          const closures = StorageService.loadClosures();
          const selected = new Set(selectedIds);
          const updated = closures.map(c => {
            const txs = Array.isArray(c.transactions) ? c.transactions : [];
            const keep = txs.filter((t: any) => !selected.has(String(t.id)));
            return { ...c, transactions: keep };
          });
          StorageService.saveAllClosures(updated);
          Array.from(selected).forEach((tid) => { try { StorageService.deleteDailyTransaction(String(tid)); } catch {} });
          refreshTodayTransactions();
          setSelectedIds(() => new Set());
        }}>Supprimer sélection</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalTicketsModal;



