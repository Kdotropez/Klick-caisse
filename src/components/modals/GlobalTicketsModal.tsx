import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, ListItem, TextField, Typography } from '@mui/material';
import CustomersListModal from './CustomersListModal';
import { StorageService } from '../../services/StorageService';
import { List } from 'react-window';

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
  showDiscountDetails: boolean;
  setShowDiscountDetails: (v: boolean) => void;
  onOpenEditor: (txId: string) => void;
  refreshTodayTransactions: () => void;
  filterCustomerId?: string | null;
  setFilterCustomerId?: (id: string | null) => void;
  onRequestOpenProReceipt?: () => void;
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
  showDiscountDetails,
  setShowDiscountDetails,
  onOpenEditor,
  refreshTodayTransactions,
  filterCustomerId = null,
  setFilterCustomerId,
  onRequestOpenProReceipt,
}) => {
  const [showCustomerPicker, setShowCustomerPicker] = React.useState(false);

  // Construire la base unique des transactions une fois quand le modal s'ouvre.
  // (Sinon, chaque frappe sur un filtre recharge localStorage et reconstruit tout.)
  const allTx = useMemo(() => {
    if (!open) return [];

    const allClosures = StorageService.loadClosures();
    const txs: any[] = [];
    const seenIds = new Set<string>();

    // Clôtures
    for (const c of allClosures) {
      const list = Array.isArray(c.transactions) ? c.transactions : [];
      for (const t of list) {
        const txId = String(t.id);
        if (!seenIds.has(txId)) {
          seenIds.add(txId);
          txs.push(t);
        }
      }
    }

    // Aujourd'hui
    const todayTxs = StorageService.loadTodayTransactions();
    for (const t of todayTxs) {
      const txId = String(t.id);
      if (!seenIds.has(txId)) {
        seenIds.add(txId);
        txs.push(t);
      }
    }

    // Archivées par jour
    try {
      const map = StorageService.getTransactionsByDayMap();
      const todayStr = new Date().toISOString().slice(0, 10);
      Object.keys(map).forEach((day) => {
        const list = Array.isArray((map as any)[day]) ? (map as any)[day] : [];
        if (day !== todayStr) {
          list.forEach((t: any) => {
            const txId = String(t.id);
            if (!seenIds.has(txId)) {
              seenIds.add(txId);
              txs.push(t);
            }
          });
        }
      });
    } catch {}

    return txs;
  }, [open]);

  const allTxOnlyToday = useMemo(() => {
    if (!onlyToday) return allTx;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    return allTx.filter((t: any) => {
      const ts = new Date(t.timestamp);
      return ts >= todayStart && ts <= todayEnd;
    });
  }, [allTx, onlyToday]);

  const customers = useMemo(() => {
    if (!open) return [];
    try {
      return StorageService.loadCustomers();
    } catch {
      return [];
    }
  }, [open]);

  const customerName = useMemo(() => {
    if (!filterCustomerId) return 'Tous';
    try {
      const found = (customers as any[]).find((c: any) => String(c.id) === String(filterCustomerId));
      return found ? `${found.lastName} ${found.firstName}` : '(inconnu)';
    } catch {
      return '(inconnu)';
    }
  }, [customers, filterCustomerId]);

  const filtered = useMemo(() => {
    const min = parseFloat(amountMin || 'NaN');
    const max = parseFloat(amountMax || 'NaN');
    const exact = parseFloat(amountExact || 'NaN');

    return allTxOnlyToday.filter((t: any) => {
      // Filtre par méthode de paiement
      const m = String(t.paymentMethod || '').toLowerCase();
      if (filterPayment === 'cash' && !(m === 'cash' || m.includes('esp'))) return false;
      if (filterPayment === 'card' && !(m === 'card' || m.includes('carte'))) return false;
      if (filterPayment === 'sumup' && m !== 'sumup') return false;

      // Filtre par client si demandé
      if (filterCustomerId && String(t.customerId || '') !== String(filterCustomerId)) return false;

      // Filtre par montant
      const amount = t.total || 0;
      if (!Number.isNaN(exact) && Math.abs(amount - exact) > 0.009) return false;
      if (!Number.isNaN(min) && amount < min) return false;
      if (!Number.isNaN(max) && amount > max) return false;

      // Filtre par date
      if (dateFrom) {
        const dfrom = new Date(dateFrom + 'T00:00:00');
        if (new Date(t.timestamp) < dfrom) return false;
      }
      if (dateTo) {
        const dto = new Date(dateTo + 'T23:59:59');
        if (new Date(t.timestamp) > dto) return false;
      }

      // Filtre par heure
      if (timeFrom) {
        const [h, mm] = timeFrom.split(':').map(Number);
        const ts = new Date(t.timestamp);
        const tf = new Date(ts);
        tf.setHours(h || 0, mm || 0, 0, 0);
        if (ts < tf) return false;
      }
      if (timeTo) {
        const [h, mm] = timeTo.split(':').map(Number);
        const ts = new Date(t.timestamp);
        const tt = new Date(ts);
        tt.setHours(h || 23, mm || 59, 59, 999);
        if (ts > tt) return false;
      }

      return true;
    });
  }, [
    allTxOnlyToday,
    filterPayment,
    filterCustomerId,
    amountMin,
    amountMax,
    amountExact,
    dateFrom,
    dateTo,
    timeFrom,
    timeTo,
  ]);

  const renderedRows = useMemo(() => {
    return filtered.map((t: any) => {
      const items = Array.isArray(t.items) ? t.items : [];
      const qty = items.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
      const isExpanded = expandedIds.has(String(t.id));
      const dt = new Date(t.timestamp);
      const dateStr = dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const timeStr = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const shortId = String(t.id).slice(-6);
      return { t, items, qty, isExpanded, dateStr, timeStr, shortId };
    });
  }, [filtered, expandedIds]);

  const listBoxRef = useRef<HTMLDivElement | null>(null);
  const [listSize, setListSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useLayoutEffect(() => {
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
  }, []);

  const getItemSize = useCallback((index: number) => {
    const row = renderedRows[index];
    if (!row) return 56;

    // Hauteur de base (ligne principale + paddings)
    const base = 56;
    if (!row.isExpanded) return base;

    // Détails: on approxime une ligne par item + marges.
    // (On préfère une estimation un peu “large” pour éviter le chevauchement.)
    const perItem = 26;
    const detailsHeader = showDiscountDetails ? 52 : 20;
    const details = detailsHeader + row.items.length * perItem + 24;
    return base + details;
  }, [renderedRows, showDiscountDetails]);

  const summary = useMemo(() => {
    let totalSales = 0;
    let totalOriginalAmount = 0;
    let totalDiscounts = 0;

    for (const t of filtered as any[]) {
      totalSales += t.total || 0;

      const items = Array.isArray(t.items) ? t.items : [];
      for (const item of items) {
        const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
        const originalTotal = originalPrice * item.quantity;
        totalOriginalAmount += originalTotal;

        const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
        const discount = t.itemDiscounts?.[discountKey];
        if (!discount) continue;

        let finalTotal = originalTotal;
        if (discount.type === 'euro') finalTotal = Math.max(0, originalTotal - (discount.value * item.quantity));
        else if (discount.type === 'percent') finalTotal = originalTotal * (1 - discount.value / 100);
        else if (discount.type === 'price') finalTotal = discount.value * item.quantity;

        totalDiscounts += (originalTotal - finalTotal);
      }
    }

    return { totalSales, totalOriginalAmount, totalDiscounts };
  }, [filtered]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Tickets globaux</DialogTitle>
      <DialogContent>
        {/* Boutons de filtres */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1, mb: 2 }}>
          <Button 
            size="small" 
            variant={filterPayment==='all'?'contained':'outlined'} 
            onClick={() => setFilterPayment('all')}
          >
            Tous
          </Button>
          <Button 
            size="small" 
            variant={filterPayment==='cash'?'contained':'outlined'} 
            onClick={() => setFilterPayment('cash')}
          >
            Espèces
          </Button>
          <Button 
            size="small" 
            variant={filterPayment==='card'?'contained':'outlined'} 
            onClick={() => setFilterPayment('card')}
          >
            Carte
          </Button>
          <Button 
            size="small" 
            variant={filterPayment==='sumup'?'contained':'outlined'} 
            onClick={() => setFilterPayment('sumup')}
          >
            SumUp
          </Button>
          <Button 
            size="small" 
            variant={onlyToday?'contained':'outlined'} 
            onClick={() => setOnlyToday(!onlyToday)}
          >
            Aujourd'hui
          </Button>
                     <Button 
             size="small" 
             variant={showDiscountDetails?'contained':'outlined'} 
             onClick={() => setShowDiscountDetails(!showDiscountDetails)}
           >
             Détails remises ({showDiscountDetails ? 'ON' : 'OFF'})
           </Button>
        </Box>

        {/* Filtre client */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Client:</Typography>
          <Typography variant="body2" sx={{ color: filterCustomerId ? 'primary.main' : 'text.secondary' }}>
            {customerName}
          </Typography>
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={()=> setShowCustomerPicker(true)}>Choisir</Button>
            {filterCustomerId && (
              <Button size="small" color="error" onClick={()=> setFilterCustomerId && setFilterCustomerId(null)}>Effacer</Button>
            )}
          </Box>
        </Box>

        {/* Champs de filtres */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
          <TextField 
            size="small" 
            label="Montant min" 
            value={amountMin} 
            onChange={(e) => setAmountMin(e.target.value)} 
            inputProps={{ inputMode: 'decimal' }} 
          />
          <TextField 
            size="small" 
            label="Montant max" 
            value={amountMax} 
            onChange={(e) => setAmountMax(e.target.value)} 
            inputProps={{ inputMode: 'decimal' }} 
          />
          <TextField 
            size="small" 
            label="Montant exact" 
            value={amountExact} 
            onChange={(e) => setAmountExact(e.target.value)} 
            inputProps={{ inputMode: 'decimal' }} 
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
          <TextField 
            size="small" 
            type="date" 
            label="Date de" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            size="small" 
            type="date" 
            label="Date à" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            size="small" 
            type="time" 
            label="Heure de" 
            value={timeFrom} 
            onChange={(e) => setTimeFrom(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
          />
          <TextField 
            size="small" 
            type="time" 
            label="Heure à" 
            value={timeTo} 
            onChange={(e) => setTimeTo(e.target.value)} 
            InputLabelProps={{ shrink: true }} 
          />
        </Box>

        {/* Boutons d'action */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 2 }}>
          <Button 
            size="small" 
            variant="outlined" 
            onClick={() => {
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
            }}
          >
            Réinitialiser filtres
          </Button>

          <Button 
            size="small" 
            variant="contained" 
            onClick={() => {
            try {
              const map = StorageService.getTransactionsByDayMap();
                if (Object.keys(map).length === 0) {
                  alert('Aucune sauvegarde de tickets trouvée.');
                  return;
                }
              const days = Object.keys(map)
                .filter(d => Array.isArray(map[d]) && map[d].length > 0)
                .sort();
                if (days.length === 0) { 
                  alert('Aucune date avec tickets trouvée.'); 
                  return; 
                }
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
            }}
          >
            Charger dates
          </Button>
        </Box>

        {/* Liste des transactions */}
        <Box ref={listBoxRef} sx={{ height: '52vh', minHeight: 320, border: '1px solid #eee', borderRadius: 1, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              Aucun ticket trouvé pour ces filtres
            </Box>
          ) : (
            listSize.width > 0 && listSize.height > 0 && (
              <List
                style={{ height: listSize.height, width: listSize.width }}
                rowCount={renderedRows.length}
                rowHeight={(index: number) => getItemSize(index)}
                overscanCount={8}
                rowProps={{}}
                rowComponent={({ index, style }: any) => {
                  const row = renderedRows[index];
                  if (!row) return <div style={style} />;

                  const { t, items, qty, isExpanded, dateStr, timeStr, shortId } = row;
                  const tid = String(t.id);

                  return (
                    <div style={style} key={`${t.id}-${t.timestamp}`}>
                      <ListItem sx={{ py: 0.5, borderBottom: '1px solid #eee', px: 1, alignItems: 'flex-start' }}>
                        <Box sx={{ width: '100%' }}>
                            {/* Ligne principale */}
                            <Box sx={{
                              display: 'grid',
                              gridTemplateColumns: '30px 100px 80px 80px 120px 100px',
                              alignItems: 'center',
                              gap: 1,
                              width: '100%',
                            }}>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(tid)}
                                onChange={() => setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(tid)) next.delete(tid);
                                  else next.add(tid);
                                  return next;
                                })}
                              />
                              <Typography
                                noWrap
                                variant="caption"
                                onClick={() => setExpandedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(tid)) next.delete(tid);
                                  else next.add(tid);
                                  return next;
                                })}
                                sx={{
                                  fontFamily: 'monospace',
                                  color: '#1976d2',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                }}
                              >
                                #{shortId}
                              </Typography>
                              <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>
                                {dateStr}
                              </Typography>
                              <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace', color: '#666' }}>
                                {timeStr}
                              </Typography>
                              <Typography noWrap variant="caption" sx={{ fontFamily: 'monospace' }}>
                                {`${qty} article${qty > 1 ? 's' : ''}`}
                              </Typography>
                              <Typography noWrap variant="caption" sx={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {(t.total || 0).toFixed(2)} €
                              </Typography>
                            </Box>

                            {/* Détails de la transaction */}
                            {isExpanded && (
                              <Box sx={{ mt: 1, ml: 2, width: '100%' }}>
                                {/* Total des remises pour cette transaction */}
                                {showDiscountDetails && (() => {
                                  let totalDiscountForTx = 0;
                                  if (items.length) {
                                    items.forEach((item: any) => {
                                      const originalPrice = item.selectedVariation ? item.selectedVariation.finalPrice : item.product.finalPrice;
                                      const originalTotal = originalPrice * item.quantity;
                                      const discountKey = `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
                                      if (t.itemDiscounts && t.itemDiscounts[discountKey]) {
                                        const discount = t.itemDiscounts[discountKey];
                                        let finalTotal = originalTotal;
                                        if (discount.type === 'euro') finalTotal = Math.max(0, originalTotal - (discount.value * item.quantity));
                                        else if (discount.type === 'percent') finalTotal = originalTotal * (1 - discount.value / 100);
                                        else if (discount.type === 'price') finalTotal = discount.value * item.quantity;
                                        totalDiscountForTx += (originalTotal - finalTotal);
                                      }
                                    });
                                  }

                                  if (totalDiscountForTx > 0) {
                                    return (
                                      <Box sx={{
                                        backgroundColor: '#fff3e0',
                                        p: 1,
                                        borderRadius: 1,
                                        mb: 1,
                                        border: '1px solid #ff9800',
                                      }}>
                                        <Typography variant="caption" sx={{
                                          fontFamily: 'monospace',
                                          fontWeight: 'bold',
                                          color: '#f44336',
                                          fontSize: '14px',
                                        }}>
                                          TOTAL REMISE: {totalDiscountForTx.toFixed(2)} €
                                        </Typography>
                                      </Box>
                                    );
                                  }
                                  return null;
                                })()}

                                {/* Détails des articles */}
                                {items.map((it: any) => {
                                  const originalPrice = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
                                  const originalTotal = originalPrice * it.quantity;

                                  // Calculer le prix final avec remises
                                  let finalPrice = originalPrice;
                                  let finalTotal = originalTotal;
                                  let discountAmount = 0;

                                  const discountKey = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
                                  if (t.itemDiscounts && t.itemDiscounts[discountKey]) {
                                    const discount = t.itemDiscounts[discountKey];
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

                                  return (
                                    <Box key={it.product.id} sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: 0.5,
                                      py: 0.5,
                                      borderBottom: '1px solid #f0f0f0',
                                    }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="caption" sx={{
                                          fontFamily: 'monospace',
                                          fontSize: '13px',
                                          minWidth: 200,
                                        }}>
                                          {it.quantity}x {it.product.name}
                                        </Typography>

                                        {showDiscountDetails && (
                                          <>
                                            {Math.abs(discountAmount) > 0.01 ? (
                                              <Box sx={{
                                                backgroundColor: '#ffebee',
                                                p: 0.5,
                                                borderRadius: 0.5,
                                                border: '1px solid #f44336',
                                                display: 'inline-block',
                                              }}>
                                                <Typography variant="caption" sx={{
                                                  color: '#000000',
                                                  fontFamily: 'monospace',
                                                  fontWeight: 'bold',
                                                  fontSize: '12px',
                                                }}>
                                                  -{discountAmount.toFixed(2)}€ ({((discountAmount / originalTotal) * 100).toFixed(1)}%) / ({originalTotal.toFixed(2)}€)
                                                </Typography>
                                              </Box>
                                            ) : (
                                              <Typography variant="caption" sx={{
                                                color: '#666',
                                                fontFamily: 'monospace',
                                                fontSize: '12px',
                                                fontStyle: 'italic',
                                              }}>
                                                Pas de remise
                                              </Typography>
                                            )}
                                          </>
                                        )}

                                        <Typography variant="caption" sx={{
                                          fontFamily: 'monospace',
                                          fontWeight: 'bold',
                                          fontSize: '13px',
                                          marginLeft: 'auto',
                                        }}>
                                          {finalTotal.toFixed(2)} €
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })}
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

        {/* Résumé des transactions */}
        {filtered.length > 0 && (
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 1,
            border: '1px solid #ddd'
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
              Résumé des {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>CA Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                  {summary.totalSales.toFixed(2)} €
                </Typography>
              </Box>

              {summary.totalDiscounts > 0 && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Remises Total</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                    -{summary.totalDiscounts.toFixed(2)} €
                  </Typography>
                </Box>
              )}

              {summary.totalDiscounts > 0 && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>Montant Original</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#666' }}>
                    {summary.totalOriginalAmount.toFixed(2)} €
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>
      {/* Sélecteur client */}
      <CustomersListModal
        open={showCustomerPicker}
        onClose={()=> setShowCustomerPicker(false)}
        customers={customers}
        onPick={(c:any)=>{ setFilterCustomerId && setFilterCustomerId(c.id); setShowCustomerPicker(false); }}
        onEdit={undefined}
        onViewSales={undefined}
      />
      
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button 
          disabled={selectedIds.size !== 1} 
          onClick={() => {
          const [tid] = Array.from(selectedIds);
          onOpenEditor(tid);
          }}
        >
          Modifier
        </Button>
        <Button
          variant="outlined"
          disabled={selectedIds.size !== 1}
          onClick={() => {
            try {
              const [tid] = Array.from(selectedIds);
              const tx = (function(){
                const id = String(tid);
                const f = filtered.find((x:any)=> String(x.id)===id);
                if (f) return f;
                return allTx.find((x:any)=> String(x.id)===id);
              })();
              if (!tx) { alert('Ticket introuvable.'); return; }
              // Construire les items avec prix final par ligne (incluant remises si possible)
              const builtItems = (Array.isArray(tx.items)?tx.items:[]).map((it:any)=>{
                const originalPrice = it.selectedVariation ? it.selectedVariation.finalPrice : it.product.finalPrice;
                let finalPrice = originalPrice;
                const discountKey = `${it.product.id}-${it.selectedVariation?.id || 'main'}`;
                if (tx.itemDiscounts && tx.itemDiscounts[discountKey]) {
                  const discount = tx.itemDiscounts[discountKey];
                  if (discount.type === 'euro') finalPrice = Math.max(0, originalPrice - discount.value);
                  else if (discount.type === 'percent') finalPrice = originalPrice * (1 - discount.value / 100);
                  else if (discount.type === 'price') finalPrice = discount.value;
                }
                const desc = it.product?.name + (it.selectedVariation?.name ? ` (${it.selectedVariation.name})` : '');
                return { description: desc || 'Article', quantity: it.quantity||0, unitPrice: Number(finalPrice)||0, originalUnitPrice: Number(originalPrice)||0, taxRate: 20 };
              });
              const s = StorageService.loadSettings() || {};
              const d = (s.professionalReceiptDefaults || {});
              const ts = new Date(tx.timestamp);
              const professionalReceiptDefaults = {
                ...d,
                date: ts.toISOString().slice(0,10),
                time: ts.toTimeString().slice(0,5),
                // conserver autres champs existants (header/footer/recipient/theme)
              };
              // Stocker aussi un snapshot des lignes dans un espace temporaire pour préremplir
              // On met à jour taxRateDefault et on laisse ldusager ajuster.
              professionalReceiptDefaults.taxRateDefault = d.taxRateDefault ?? 20;
              const professionalReceiptGlobalDiscount = tx.globalDiscount ? { ...tx.globalDiscount } : null;
              StorageService.saveSettings({ ...s, professionalReceiptDefaults, professionalReceiptPrefillItems: builtItems, professionalReceiptGlobalDiscount });
              if (typeof onRequestOpenProReceipt === 'function') {
                onRequestOpenProReceipt();
              } else {
                alert('✅ Ticket préparé pour le Ticket pro. Ouvrez « Ticket pro (composer/imprimer) » dans Paramètres.');
              }
            } catch (e) {
              alert('❌ Impossible de préparer le ticket pro.');
            }
          }}
        >
          Créer ticket pro
        </Button>
        <Button 
          color="error" 
          variant="contained" 
          disabled={selectedIds.size === 0} 
          onClick={() => {
          const closures = StorageService.loadClosures();
          const selected = new Set(selectedIds);
          const updated = closures.map(c => {
            const txs = Array.isArray(c.transactions) ? c.transactions : [];
            const keep = txs.filter((t: any) => !selected.has(String(t.id)));
            return { ...c, transactions: keep };
          });
          StorageService.saveAllClosures(updated);
            Array.from(selected).forEach((tid) => { 
              try { 
                StorageService.deleteDailyTransaction(String(tid)); 
                StorageService.deleteTransactionFromAllDays(String(tid));
              } catch {} 
            });
          refreshTodayTransactions();
          setSelectedIds(() => new Set());
          }}
        >
          Supprimer sélection
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GlobalTicketsModal;
