import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { STORES } from '../types/Store';
import { StorageService } from '../services/StorageService';
import { formatEuro } from '../utils/currency';
import {
  allocateGlobalDiscountByLineKey,
  computePaymentTotalsFromTransactionList,
  getLinePayableAmount,
  loadDiscountExclusionSettings,
} from '../utils/ticketTotal';
import { APP_VERSION } from '../version';

type StoreStats = {
  code: string;
  name: string;
  txs: any[];
  closures: any[];
  totalCA: number;
  ticketCount: number;
  zCount: number;
  lastZ: number;
  firstDate?: Date;
  lastDate?: Date;
  paymentTotals: Record<string, number>;
  topProducts: Array<{ name: string; qty: number; amount: number }>;
  anomalies: string[];
};

const parseMap = (raw: string | null): Record<string, any[]> => {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const collectStoreTransactions = (storeCode: string, closures: any[]): any[] => {
  const seen = new Set<string>();
  const out: any[] = [];
  const add = (tx: any) => {
    const id = String(tx?.id || '');
    const ts = new Date(tx?.timestamp || 0).getTime();
    const key = `${id}@${ts}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(tx);
  };

  for (const closure of closures) {
    const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
    txs.forEach(add);
  }

  const map = parseMap(localStorage.getItem(StorageService.getStoreKey(storeCode, 'transactions_by_day')));
  Object.values(map).forEach((list) => {
    if (Array.isArray(list)) list.forEach(add);
  });

  return out;
};

const mergeClosuresByZ = (existing: any[], incoming: any[]): any[] => {
  const byZ = new Map<number, any>();
  for (const closure of existing) {
    const z = Number(closure?.zNumber);
    if (Number.isFinite(z)) byZ.set(z, closure);
  }
  for (const closure of incoming) {
    const z = Number(closure?.zNumber);
    if (!Number.isFinite(z)) continue;
    if (!byZ.has(z)) byZ.set(z, closure);
  }
  return Array.from(byZ.values()).sort((a, b) => (Number(a?.zNumber) || 0) - (Number(b?.zNumber) || 0));
};

const mergeTransactionsByDay = (
  existing: Record<string, any[]>,
  incoming: Record<string, any[]>
): Record<string, any[]> => {
  const result: Record<string, any[]> = {};
  const add = (day: string, tx: any) => {
    if (!result[day]) result[day] = [];
    const id = String(tx?.id || '');
    const ts = new Date(tx?.timestamp || 0).getTime();
    const key = `${id}@${ts}`;
    const already = result[day].some((item) => {
      const itemId = String(item?.id || '');
      const itemTs = new Date(item?.timestamp || 0).getTime();
      return `${itemId}@${itemTs}` === key;
    });
    if (!already) result[day].push(tx);
  };

  for (const [day, list] of Object.entries(existing || {})) {
    if (Array.isArray(list)) list.forEach((tx) => add(day, tx));
  }
  for (const [day, list] of Object.entries(incoming || {})) {
    if (Array.isArray(list)) list.forEach((tx) => add(day, tx));
  }
  return result;
};

const buildStoreStats = (storeCode: string, storeName: string): StoreStats => {
  const closures = StorageService.loadClosures(storeCode);
  const txs = collectStoreTransactions(storeCode, closures);
  const totalCA = txs.reduce((sum, tx) => sum + (Number(tx?.total) || 0), 0);
  const dates = txs
    .map((tx) => new Date(tx?.timestamp))
    .filter((d) => Number.isFinite(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const paymentTotals = computePaymentTotalsFromTransactionList(txs);
  const productMap = new Map<string, { name: string; qty: number; amount: number }>();
  const settings = loadDiscountExclusionSettings();

  for (const tx of txs) {
    const items = Array.isArray(tx?.items) ? tx.items : [];
    const discounts = tx?.itemDiscounts || {};
    const globalShare = allocateGlobalDiscountByLineKey(items, discounts, tx?.globalDiscount ?? null, settings);
    for (const item of items) {
      const product = item?.product || {};
      const key = `${String(product.id || product.name || 'inconnu')}__${String(item?.selectedVariation?.id || 'main')}`;
      const name = item?.selectedVariation?.attributes
        ? `${product.name || 'Article'} (${item.selectedVariation.attributes})`
        : product.name || 'Article';
      const current = productMap.get(key) || { name, qty: 0, amount: 0 };
      current.qty += Number(item?.quantity) || 0;
      current.amount += getLinePayableAmount(item, discounts, globalShare);
      productMap.set(key, current);
    }
  }

  const zNumbers = closures.map((c) => Number(c?.zNumber)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const anomalies: string[] = [];
  if (zNumbers.length > 0) {
    for (let i = 1; i < zNumbers.length; i++) {
      if (zNumbers[i] === zNumbers[i - 1]) anomalies.push(`Z${zNumbers[i]} en doublon`);
      if (zNumbers[i] > zNumbers[i - 1] + 1) anomalies.push(`Z manquant entre Z${zNumbers[i - 1]} et Z${zNumbers[i]}`);
    }
  }
  if (txs.some((tx) => !Array.isArray(tx?.items) || tx.items.length === 0)) {
    anomalies.push('Tickets sans articles détectés');
  }

  return {
    code: storeCode,
    name: storeName,
    txs,
    closures,
    totalCA,
    ticketCount: txs.length,
    zCount: closures.length,
    lastZ: zNumbers[zNumbers.length - 1] || 0,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    paymentTotals,
    topProducts: Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 12),
    anomalies,
  };
};

const BackOfficeDashboard: React.FC = () => {
  const stores = useMemo(() => STORES.filter((store) => !store.isBackOfficeProfile), []);
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>('3');
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const statsByStore = useMemo(() => {
    void refreshKey;
    return stores.map((store) => buildStoreStats(store.code, store.name));
  }, [refreshKey, stores]);

  const selected = statsByStore.find((store) => store.code === selectedStoreCode) || statsByStore[0];
  const globalCA = statsByStore.reduce((sum, store) => sum + store.totalCA, 0);
  const globalTickets = statsByStore.reduce((sum, store) => sum + store.ticketCount, 0);
  const globalZ = statsByStore.reduce((sum, store) => sum + store.zCount, 0);

  const restoreBackup = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    const targetStoreCode = String(data.storeCode || '');
    const targetStore = stores.find((store) => store.code === targetStoreCode);
    if (!targetStore) {
      window.alert(`Boutique inconnue dans le fichier: ${data.storeName || targetStoreCode || 'non renseignée'}`);
      return;
    }

    const ok = window.confirm(
      `Restaurer cette sauvegarde dans ${targetStore.name} ?\n\n` +
      `Fichier: ${file.name}\n` +
      `Z: ${data.zCounter || '-'}\n` +
      `Clôtures: ${Array.isArray(data.closures) ? data.closures.length : 0}\n` +
      `Tickets archivés: ${data.transactionsByDay ? Object.values(data.transactionsByDay).flat().length : 0}`
    );
    if (!ok) return;

    try {
      if (Array.isArray(data.products) && Array.isArray(data.categories)) {
        try {
          StorageService.saveProductionData(data.products, data.categories, targetStoreCode, { skipAutoBackup: true });
        } catch {
          StorageService.prepareActiveStoreForFullRestore(targetStoreCode);
          try {
            StorageService.saveProductionData(data.products, data.categories, targetStoreCode, { skipAutoBackup: true });
          } catch (quotaError) {
            console.warn('Catalogue non persisté faute de quota, restauration des ventes maintenue.', quotaError);
          }
        }
      }
      if (data.settings) StorageService.saveSettings(data.settings, targetStoreCode);
      if (Array.isArray(data.subcategories)) StorageService.saveSubcategories(data.subcategories, targetStoreCode);
      if (Array.isArray(data.closures)) {
        const existingClosures = StorageService.loadClosures(targetStoreCode);
        StorageService.saveAllClosures(mergeClosuresByZ(existingClosures, data.closures), targetStoreCode);
      }
      if (data.transactionsByDay) {
        const existingMap = parseMap(localStorage.getItem(StorageService.getStoreKey(targetStoreCode, 'transactions_by_day')));
        StorageService.saveTransactionsByDayMap(mergeTransactionsByDay(existingMap, data.transactionsByDay), targetStoreCode);
      }
      if (Number.isFinite(Number(data.zCounter))) StorageService.setZCounterValue(Number(data.zCounter), targetStoreCode);
      if (Array.isArray(data.cashiers)) StorageService.saveCashiers(data.cashiers, targetStoreCode);
      if (Array.isArray(data.customers)) StorageService.saveCustomers(data.customers, targetStoreCode);
      setSelectedStoreCode(targetStoreCode);
      setRefreshKey((value) => value + 1);
      window.alert(`Sauvegarde restaurée dans ${targetStore.name}.`);
    } catch (error) {
      console.error(error);
      window.alert(`Erreur restauration: ${(error as Error).message}`);
    }
  };

  return (
    <Box sx={{ height: '100%', width: '100%', overflow: 'auto', backgroundColor: '#f4f6f8', p: 2, boxSizing: 'border-box' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void restoreBackup(file);
        }}
      />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0d47a1' }}>
            Back office central
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Version {APP_VERSION} - Import, contrôle et statistiques multi-boutiques
          </Typography>
        </Box>
        <Button variant="contained" size="large" onClick={() => fileInputRef.current?.click()}>
          Importer sauvegarde boutique
        </Button>
        <Button variant="outlined" size="large" onClick={() => setRefreshKey((value) => value + 1)}>
          Rafraîchir
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
        <Card><CardContent><Typography variant="caption">CA total</Typography><Typography variant="h5" fontWeight={900}>{formatEuro(globalCA)}</Typography></CardContent></Card>
        <Card><CardContent><Typography variant="caption">Tickets</Typography><Typography variant="h5" fontWeight={900}>{globalTickets}</Typography></CardContent></Card>
        <Card><CardContent><Typography variant="caption">Clôtures Z</Typography><Typography variant="h5" fontWeight={900}>{globalZ}</Typography></CardContent></Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {statsByStore.map((store) => (
            <Card
              key={store.code}
              onClick={() => setSelectedStoreCode(store.code)}
              sx={{
                cursor: 'pointer',
                border: selectedStoreCode === store.code ? '3px solid #1976d2' : '1px solid #ddd',
                backgroundColor: selectedStoreCode === store.code ? '#e3f2fd' : '#fff',
              }}
            >
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h6" fontWeight={900}>{store.name}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip size="small" label={`CA ${formatEuro(store.totalCA)}`} />
                  <Chip size="small" label={`${store.ticketCount} tickets`} />
                  <Chip size="small" label={`Z${store.lastZ || '-'}`} color={store.anomalies.length ? 'warning' : 'default'} />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {selected && (
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Card sx={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <Typography variant="h5" fontWeight={900}>{selected.name}</Typography>
                <Typography color="text.secondary">
                  Période: {selected.firstDate ? selected.firstDate.toLocaleDateString('fr-FR') : '-'} - {selected.lastDate ? selected.lastDate.toLocaleDateString('fr-FR') : '-'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                  <Box><Typography variant="caption">CA</Typography><Typography variant="h6" fontWeight={900}>{formatEuro(selected.totalCA)}</Typography></Box>
                  <Box><Typography variant="caption">Tickets</Typography><Typography variant="h6" fontWeight={900}>{selected.ticketCount}</Typography></Box>
                  <Box><Typography variant="caption">Panier moyen</Typography><Typography variant="h6" fontWeight={900}>{formatEuro(selected.ticketCount ? selected.totalCA / selected.ticketCount : 0)}</Typography></Box>
                  <Box><Typography variant="caption">Dernier Z</Typography><Typography variant="h6" fontWeight={900}>Z{selected.lastZ || '-'}</Typography></Box>
                </Box>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={900}>Paiements</Typography>
                <List dense>
                  {Object.entries(selected.paymentTotals).map(([label, amount]) => (
                    <ListItem key={label} sx={{ py: 0.25 }}>
                      <ListItemText primary={label} />
                      <Typography fontFamily="monospace" fontWeight={800}>{formatEuro(Number(amount) || 0)}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight={900}>Contrôles</Typography>
                {selected.anomalies.length === 0 ? (
                  <Chip label="Aucune anomalie détectée" color="success" />
                ) : (
                  <List dense>
                    {selected.anomalies.map((item) => <ListItem key={item}><ListItemText primary={item} /></ListItem>)}
                  </List>
                )}
              </CardContent>
            </Card>

            <Card sx={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={900}>Top articles par CA</Typography>
                <List dense>
                  {selected.topProducts.map((product, index) => (
                    <ListItem key={`${product.name}-${index}`} sx={{ py: 0.25 }}>
                      <Typography sx={{ width: 36, fontWeight: 900 }}>{index + 1}</Typography>
                      <ListItemText primary={product.name} secondary={`${product.qty} unité(s)`} />
                      <Typography fontFamily="monospace" fontWeight={900}>{formatEuro(product.amount)}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default BackOfficeDashboard;
