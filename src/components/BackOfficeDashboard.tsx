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
  dailyRows: Array<{ key: string; ca: number; tickets: number; qty: number }>;
  monthlyRows: Array<{ key: string; ca: number; tickets: number; qty: number }>;
  marginAmount: number;
  paymentTotal: number;
  closureTotal: number;
  anomalies: string[];
};

const formatDayKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatMonthKey = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
};

const toCsvValue = (value: unknown): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<string | number>>): void => {
  const content = [headers, ...rows]
    .map((row) => row.map(toCsvValue).join(';'))
    .join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const htmlEscape = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const htmlRows = (rows: Array<Array<string | number>>): string =>
  rows.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`).join('');

const downloadHtml = (filename: string, title: string, body: string): void => {
  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${htmlEscape(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2933; margin: 32px; background: #f7f9fc; }
    .page { background: white; border: 1px solid #d9e2ec; border-radius: 12px; padding: 28px; max-width: 1280px; min-width: 980px; margin: 0 auto; }
    h1 { margin: 0 0 4px; color: #0d47a1; font-size: 28px; }
    h2 { margin: 28px 0 10px; color: #123c69; border-bottom: 2px solid #d9e2ec; padding-bottom: 6px; }
    .meta { color: #52606d; margin-bottom: 20px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }
    .kpi { border: 1px solid #d9e2ec; border-radius: 10px; padding: 14px; background: #f8fbff; }
    .label { color: #627d98; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
    .value { font-size: 22px; font-weight: 800; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0d47a1; color: white; text-align: left; padding: 9px; font-size: 13px; }
    td { border-bottom: 1px solid #e6edf5; padding: 8px; font-size: 13px; }
    tr:nth-child(even) td { background: #fafcff; }
    .ok { color: #1b5e20; font-weight: 700; }
    .warn { color: #b26a00; font-weight: 700; }
    .footer { margin-top: 28px; color: #829ab1; font-size: 12px; }
    @media print { body { background: white; margin: 0; } .page { border: none; min-width: auto; } }
    @media screen and (max-width: 900px) { body { margin: 8px; } .page { transform-origin: top left; } }
  </style>
</head>
<body><div class="page">${body}<div class="footer">Rapport généré par Klick Caisse Back office - ${new Date().toLocaleString('fr-FR')}</div></div></body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const buildStoreHtmlReport = (store: StoreStats): string => {
  const paymentRows = Object.entries(store.paymentTotals).map(([label, amount]) => [label, formatEuro(Number(amount) || 0)]);
  return `
    <h1>Rapport boutique - ${htmlEscape(store.name)}</h1>
    <div class="meta">Période: ${store.firstDate ? store.firstDate.toLocaleDateString('fr-FR') : '-'} - ${store.lastDate ? store.lastDate.toLocaleDateString('fr-FR') : '-'}</div>
    <div class="kpis">
      <div class="kpi"><div class="label">Chiffre d'affaires</div><div class="value">${formatEuro(store.totalCA)}</div></div>
      <div class="kpi"><div class="label">Tickets</div><div class="value">${store.ticketCount}</div></div>
      <div class="kpi"><div class="label">Panier moyen</div><div class="value">${formatEuro(store.ticketCount ? store.totalCA / store.ticketCount : 0)}</div></div>
      <div class="kpi"><div class="label">Marge estimée</div><div class="value">${formatEuro(store.marginAmount)}</div></div>
    </div>
    <h2>Rapprochement</h2>
    <table><thead><tr><th>Contrôle</th><th>Montant</th></tr></thead><tbody>${htmlRows([
      ['CA tickets', formatEuro(store.totalCA)],
      ['Total paiements', formatEuro(store.paymentTotal)],
      ['Total clôtures', formatEuro(store.closureTotal || store.totalCA)],
      ['Dernier Z', `Z${store.lastZ || '-'}`],
    ])}</tbody></table>
    <p class="${store.anomalies.length ? 'warn' : 'ok'}">${store.anomalies.length ? store.anomalies.map(htmlEscape).join('<br/>') : 'Aucune anomalie détectée'}</p>
    <h2>Paiements</h2>
    <table><thead><tr><th>Mode</th><th>Total</th></tr></thead><tbody>${htmlRows(paymentRows)}</tbody></table>
    <h2>Ventes par jour</h2>
    <table><thead><tr><th>Jour</th><th>CA</th><th>Tickets</th><th>Articles</th></tr></thead><tbody>${htmlRows(store.dailyRows.map((row) => [row.key, formatEuro(row.ca), row.tickets, row.qty]))}</tbody></table>
    <h2>Ventes par mois</h2>
    <table><thead><tr><th>Mois</th><th>CA</th><th>Tickets</th><th>Articles</th></tr></thead><tbody>${htmlRows(store.monthlyRows.map((row) => [row.key, formatEuro(row.ca), row.tickets, row.qty]))}</tbody></table>
    <h2>Top articles par CA</h2>
    <table><thead><tr><th>#</th><th>Article</th><th>Quantité</th><th>CA</th></tr></thead><tbody>${htmlRows(store.topProducts.map((product, index) => [index + 1, product.name, product.qty, formatEuro(product.amount)]))}</tbody></table>
  `;
};

const buildGlobalHtmlReport = (stores: StoreStats[]): string => `
  <h1>Rapport global multi-boutiques</h1>
  <div class="meta">Comparaison des boutiques importées dans le Back office central.</div>
  <table>
    <thead><tr><th>Boutique</th><th>CA</th><th>Tickets</th><th>Panier moyen</th><th>Z</th><th>Marge estimée</th><th>Alertes</th></tr></thead>
    <tbody>${htmlRows(stores.map((store) => [
      store.name,
      formatEuro(store.totalCA),
      store.ticketCount,
      formatEuro(store.ticketCount ? store.totalCA / store.ticketCount : 0),
      store.zCount,
      formatEuro(store.marginAmount),
      store.anomalies.length ? store.anomalies.join(' | ') : 'OK',
    ]))}</tbody>
  </table>
`;

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
  const paymentTotal = Object.values(paymentTotals).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const productMap = new Map<string, { name: string; qty: number; amount: number }>();
  const dailyMap = new Map<string, { key: string; ca: number; tickets: number; qty: number }>();
  const monthlyMap = new Map<string, { key: string; ca: number; tickets: number; qty: number }>();
  const settings = loadDiscountExclusionSettings();
  let marginAmount = 0;

  for (const tx of txs) {
    const items = Array.isArray(tx?.items) ? tx.items : [];
    const discounts = tx?.itemDiscounts || {};
    const globalShare = allocateGlobalDiscountByLineKey(items, discounts, tx?.globalDiscount ?? null, settings);
    const txDate = new Date(tx?.timestamp);
    const dayKey = Number.isFinite(txDate.getTime()) ? formatDayKey(txDate) : 'Date inconnue';
    const monthKey = Number.isFinite(txDate.getTime()) ? formatMonthKey(txDate) : 'Mois inconnu';
    const txQty = items.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
    const txTotal = Number(tx?.total) || 0;
    const day = dailyMap.get(dayKey) || { key: dayKey, ca: 0, tickets: 0, qty: 0 };
    day.ca += txTotal;
    day.tickets += 1;
    day.qty += txQty;
    dailyMap.set(dayKey, day);
    const month = monthlyMap.get(monthKey) || { key: monthKey, ca: 0, tickets: 0, qty: 0 };
    month.ca += txTotal;
    month.tickets += 1;
    month.qty += txQty;
    monthlyMap.set(monthKey, month);

    for (const item of items) {
      const product = item?.product || {};
      const key = `${String(product.id || product.name || 'inconnu')}__${String(item?.selectedVariation?.id || 'main')}`;
      const name = item?.selectedVariation?.attributes
        ? `${product.name || 'Article'} (${item.selectedVariation.attributes})`
        : product.name || 'Article';
      const current = productMap.get(key) || { name, qty: 0, amount: 0 };
      current.qty += Number(item?.quantity) || 0;
      const lineAmount = getLinePayableAmount(item, discounts, globalShare);
      current.amount += lineAmount;
      const cost = Number(product.wholesalePrice) || 0;
      if (cost > 0) marginAmount += lineAmount - cost * (Number(item?.quantity) || 0);
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
  if (Math.abs(paymentTotal - totalCA) > 0.01) {
    anomalies.push(`Écart paiements / CA: ${formatEuro(paymentTotal)} vs ${formatEuro(totalCA)}`);
  }
  const closureTotal = closures.reduce((sum, closure) => sum + (Number(closure?.totalCA) || 0), 0);
  if (closureTotal > 0 && Math.abs(closureTotal - totalCA) > 0.01) {
    anomalies.push(`Écart clôtures / tickets: ${formatEuro(closureTotal)} vs ${formatEuro(totalCA)}`);
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
    paymentTotal,
    closureTotal,
    topProducts: Array.from(productMap.values()).sort((a, b) => b.amount - a.amount).slice(0, 12),
    dailyRows: Array.from(dailyMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
    monthlyRows: Array.from(monthlyMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
    marginAmount,
    anomalies,
  };
};

const buildFilteredStats = (base: StoreStats, filteredTxs: any[], filteredClosures: any[]): StoreStats => {
  const originalStore = STORES.find((store) => store.code === base.code);
  const stats = buildStoreStats(base.code, originalStore?.name || base.name);
  return buildStoreStatsFromTransactions({ ...stats, txs: filteredTxs, closures: filteredClosures });
};

const buildStoreStatsFromTransactions = (base: StoreStats): StoreStats => {
  const txs = base.txs;
  const closures = base.closures;
  const totalCA = txs.reduce((sum, tx) => sum + (Number(tx?.total) || 0), 0);
  const dates = txs
    .map((tx) => new Date(tx?.timestamp))
    .filter((d) => Number.isFinite(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const paymentTotals = computePaymentTotalsFromTransactionList(txs);
  const paymentTotal = Object.values(paymentTotals).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
  const productMap = new Map<string, { name: string; qty: number; amount: number }>();
  const dailyMap = new Map<string, { key: string; ca: number; tickets: number; qty: number }>();
  const monthlyMap = new Map<string, { key: string; ca: number; tickets: number; qty: number }>();
  const settings = loadDiscountExclusionSettings();
  let marginAmount = 0;

  for (const tx of txs) {
    const items = Array.isArray(tx?.items) ? tx.items : [];
    const discounts = tx?.itemDiscounts || {};
    const globalShare = allocateGlobalDiscountByLineKey(items, discounts, tx?.globalDiscount ?? null, settings);
    const txDate = new Date(tx?.timestamp);
    const dayKey = Number.isFinite(txDate.getTime()) ? formatDayKey(txDate) : 'Date inconnue';
    const monthKey = Number.isFinite(txDate.getTime()) ? formatMonthKey(txDate) : 'Mois inconnu';
    const txQty = items.reduce((sum: number, item: any) => sum + (Number(item?.quantity) || 0), 0);
    const txTotal = Number(tx?.total) || 0;
    const day = dailyMap.get(dayKey) || { key: dayKey, ca: 0, tickets: 0, qty: 0 };
    day.ca += txTotal; day.tickets += 1; day.qty += txQty; dailyMap.set(dayKey, day);
    const month = monthlyMap.get(monthKey) || { key: monthKey, ca: 0, tickets: 0, qty: 0 };
    month.ca += txTotal; month.tickets += 1; month.qty += txQty; monthlyMap.set(monthKey, month);

    for (const item of items) {
      const product = item?.product || {};
      const key = `${String(product.id || product.name || 'inconnu')}__${String(item?.selectedVariation?.id || 'main')}`;
      const name = item?.selectedVariation?.attributes ? `${product.name || 'Article'} (${item.selectedVariation.attributes})` : product.name || 'Article';
      const current = productMap.get(key) || { name, qty: 0, amount: 0 };
      const lineAmount = getLinePayableAmount(item, discounts, globalShare);
      current.qty += Number(item?.quantity) || 0;
      current.amount += lineAmount;
      const cost = Number(product.wholesalePrice) || 0;
      if (cost > 0) marginAmount += lineAmount - cost * (Number(item?.quantity) || 0);
      productMap.set(key, current);
    }
  }

  const zNumbers = closures.map((c) => Number(c?.zNumber)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  const anomalies: string[] = [];
  for (let i = 1; i < zNumbers.length; i++) {
    if (zNumbers[i] === zNumbers[i - 1]) anomalies.push(`Z${zNumbers[i]} en doublon`);
    if (zNumbers[i] > zNumbers[i - 1] + 1) anomalies.push(`Z manquant entre Z${zNumbers[i - 1]} et Z${zNumbers[i]}`);
  }
  if (txs.some((tx) => !Array.isArray(tx?.items) || tx.items.length === 0)) anomalies.push('Tickets sans articles détectés');
  if (Math.abs(paymentTotal - totalCA) > 0.01) anomalies.push(`Écart paiements / CA: ${formatEuro(paymentTotal)} vs ${formatEuro(totalCA)}`);
  const closureTotal = closures.reduce((sum, closure) => sum + (Number(closure?.totalCA) || 0), 0);
  if (closureTotal > 0 && Math.abs(closureTotal - totalCA) > 0.01) anomalies.push(`Écart clôtures / tickets: ${formatEuro(closureTotal)} vs ${formatEuro(totalCA)}`);

  return {
    ...base,
    txs,
    closures,
    totalCA,
    ticketCount: txs.length,
    zCount: closures.length,
    lastZ: zNumbers[zNumbers.length - 1] || 0,
    firstDate: dates[0],
    lastDate: dates[dates.length - 1],
    paymentTotals,
    paymentTotal,
    closureTotal,
    topProducts: Array.from(productMap.values()).sort((a, b) => b.amount - a.amount),
    dailyRows: Array.from(dailyMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
    monthlyRows: Array.from(monthlyMap.values()).sort((a, b) => b.key.localeCompare(a.key)),
    marginAmount,
    anomalies,
  };
};

const BackOfficeDashboard: React.FC = () => {
  const stores = useMemo(() => STORES.filter((store) => !store.isBackOfficeProfile), []);
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>('3');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [articleSort, setArticleSort] = useState<'amount' | 'qty' | 'name'>('amount');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const statsByStore = useMemo(() => {
    void refreshKey;
    return stores.map((store) => buildStoreStats(store.code, store.name));
  }, [refreshKey, stores]);

  const selectedBase = statsByStore.find((store) => store.code === selectedStoreCode) || statsByStore[0];
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    selectedBase?.txs.forEach((tx) => {
      const date = new Date(tx?.timestamp);
      if (Number.isFinite(date.getTime())) months.add(formatMonthKey(date));
    });
    return Array.from(months).sort().reverse();
  }, [selectedBase]);
  const availableDays = useMemo(() => {
    const days = new Set<string>();
    selectedBase?.txs.forEach((tx) => {
      const date = new Date(tx?.timestamp);
      if (!Number.isFinite(date.getTime())) return;
      const month = formatMonthKey(date);
      if (selectedMonth !== 'all' && month !== selectedMonth) return;
      days.add(formatDayKey(date));
    });
    return Array.from(days).sort().reverse();
  }, [selectedBase, selectedMonth]);
  const selected = useMemo(() => {
    if (!selectedBase) return selectedBase;
    if (selectedMonth === 'all' && selectedDay === 'all') return selectedBase;
    const txs = selectedBase.txs.filter((tx) => {
      const date = new Date(tx?.timestamp);
      if (!Number.isFinite(date.getTime())) return false;
      if (selectedMonth !== 'all' && formatMonthKey(date) !== selectedMonth) return false;
      if (selectedDay !== 'all' && formatDayKey(date) !== selectedDay) return false;
      return true;
    });
    const closures = selectedBase.closures.filter((closure) => {
      const date = new Date(closure?.closedAt);
      if (!Number.isFinite(date.getTime())) return false;
      if (selectedMonth !== 'all' && formatMonthKey(date) !== selectedMonth) return false;
      if (selectedDay !== 'all' && formatDayKey(date) !== selectedDay) return false;
      return true;
    });
    return buildFilteredStats(selectedBase, txs, closures);
  }, [selectedBase, selectedDay, selectedMonth]);
  const sortedTopProducts = useMemo(() => {
    const list = selected?.topProducts ? [...selected.topProducts] : [];
    if (articleSort === 'qty') return list.sort((a, b) => b.qty - a.qty);
    if (articleSort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
    return list.sort((a, b) => b.amount - a.amount);
  }, [articleSort, selected]);
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
        <Button
          variant="outlined"
          size="large"
          onClick={() => downloadHtml('rapport-global-boutiques.html', 'Rapport global multi-boutiques', buildGlobalHtmlReport(statsByStore))}
        >
          Export HTML global
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
        <Card><CardContent><Typography variant="caption">CA total</Typography><Typography variant="h5" fontWeight={900}>{formatEuro(globalCA)}</Typography></CardContent></Card>
        <Card><CardContent><Typography variant="caption">Tickets</Typography><Typography variant="h5" fontWeight={900}>{globalTickets}</Typography></CardContent></Card>
        <Card><CardContent><Typography variant="caption">Clôtures Z</Typography><Typography variant="h5" fontWeight={900}>{globalZ}</Typography></CardContent></Card>
      </Box>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Comparaison boutiques</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => downloadCsv(
                'comparaison-boutiques.csv',
                ['Boutique', 'CA', 'Tickets', 'Panier moyen', 'Z', 'Marge estimee'],
                statsByStore.map((store) => [
                  store.name,
                  store.totalCA.toFixed(2),
                  store.ticketCount,
                  (store.ticketCount ? store.totalCA / store.ticketCount : 0).toFixed(2),
                  store.zCount,
                  store.marginAmount.toFixed(2),
                ])
              )}
            >
              Export CSV
            </Button>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 1, fontWeight: 900, borderBottom: '1px solid #ddd', pb: 0.5 }}>
            <Typography>Boutique</Typography><Typography>CA</Typography><Typography>Tickets</Typography><Typography>Panier</Typography><Typography>Z</Typography><Typography>Marge</Typography>
          </Box>
          {statsByStore.map((store) => (
            <Box key={store.code} sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 1, py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
              <Typography>{store.name}</Typography>
              <Typography fontFamily="monospace">{formatEuro(store.totalCA)}</Typography>
              <Typography>{store.ticketCount}</Typography>
              <Typography fontFamily="monospace">{formatEuro(store.ticketCount ? store.totalCA / store.ticketCount : 0)}</Typography>
              <Typography>{store.zCount}</Typography>
              <Typography fontFamily="monospace">{formatEuro(store.marginAmount)}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>

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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h5" fontWeight={900} sx={{ flex: 1 }}>{selected.name}</Typography>
                  <Button
                    variant="contained"
                    onClick={() => downloadHtml(
                      `rapport-${selected.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`,
                      `Rapport boutique - ${selected.name}`,
                      buildStoreHtmlReport({ ...selected, topProducts: sortedTopProducts })
                    )}
                  >
                    Export HTML boutique
                  </Button>
                </Box>
                <Typography color="text.secondary">
                  Période: {selected.firstDate ? selected.firstDate.toLocaleDateString('fr-FR') : '-'} - {selected.lastDate ? selected.lastDate.toLocaleDateString('fr-FR') : '-'}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mt: 2 }}>
                  <Box>
                    <Typography variant="caption" fontWeight={800}>Mois</Typography>
                    <select
                      value={selectedMonth}
                      onChange={(event) => {
                        setSelectedMonth(event.target.value);
                        setSelectedDay('all');
                      }}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="all">Tous les mois</option>
                      {availableMonths.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={800}>Jour</Typography>
                    <select
                      value={selectedDay}
                      onChange={(event) => setSelectedDay(event.target.value)}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="all">Tous les jours</option>
                      {availableDays.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                  </Box>
                  <Box>
                    <Typography variant="caption" fontWeight={800}>Tri articles</Typography>
                    <select
                      value={articleSort}
                      onChange={(event) => setArticleSort(event.target.value as 'amount' | 'qty' | 'name')}
                      style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #cbd5e1' }}
                    >
                      <option value="amount">CA décroissant</option>
                      <option value="qty">Quantité décroissante</option>
                      <option value="name">Nom A-Z</option>
                    </select>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
                  <Box><Typography variant="caption">CA</Typography><Typography variant="h6" fontWeight={900}>{formatEuro(selected.totalCA)}</Typography></Box>
                  <Box><Typography variant="caption">Tickets</Typography><Typography variant="h6" fontWeight={900}>{selected.ticketCount}</Typography></Box>
                  <Box><Typography variant="caption">Panier moyen</Typography><Typography variant="h6" fontWeight={900}>{formatEuro(selected.ticketCount ? selected.totalCA / selected.ticketCount : 0)}</Typography></Box>
                  <Box><Typography variant="caption">Dernier Z</Typography><Typography variant="h6" fontWeight={900}>Z{selected.lastZ || '-'}</Typography></Box>
                  <Box><Typography variant="caption">Marge estimée</Typography><Typography variant="h6" fontWeight={900}>{formatEuro(selected.marginAmount)}</Typography></Box>
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
                <Typography variant="h6" fontWeight={900}>Rapprochement</Typography>
                <List dense>
                  <ListItem sx={{ py: 0.25 }}><ListItemText primary="CA tickets" /><Typography fontFamily="monospace">{formatEuro(selected.totalCA)}</Typography></ListItem>
                  <ListItem sx={{ py: 0.25 }}><ListItemText primary="Total paiements" /><Typography fontFamily="monospace">{formatEuro(selected.paymentTotal)}</Typography></ListItem>
                  <ListItem sx={{ py: 0.25 }}><ListItemText primary="Total clôtures" /><Typography fontFamily="monospace">{formatEuro(selected.closureTotal || selected.totalCA)}</Typography></ListItem>
                </List>
                {selected.anomalies.length === 0 ? (
                  <Chip label="Aucune anomalie détectée" color="success" />
                ) : (
                  <List dense>
                    {selected.anomalies.map((item) => <ListItem key={item}><ListItemText primary={item} /></ListItem>)}
                  </List>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Ventes par jour</Typography>
                  <Button size="small" variant="outlined" onClick={() => downloadCsv(
                    `${selected.name}-ventes-jour.csv`,
                    ['Jour', 'CA', 'Tickets', 'Articles'],
                    selected.dailyRows.map((row) => [row.key, row.ca.toFixed(2), row.tickets, row.qty])
                  )}>CSV</Button>
                </Box>
                <List dense>
                  {selected.dailyRows.slice(0, 10).map((row) => (
                    <ListItem key={row.key} sx={{ py: 0.25 }}>
                      <ListItemText primary={row.key} secondary={`${row.tickets} ticket(s) - ${row.qty} article(s)`} />
                      <Typography fontFamily="monospace" fontWeight={900}>{formatEuro(row.ca)}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Ventes par mois</Typography>
                  <Button size="small" variant="outlined" onClick={() => downloadCsv(
                    `${selected.name}-ventes-mois.csv`,
                    ['Mois', 'CA', 'Tickets', 'Articles'],
                    selected.monthlyRows.map((row) => [row.key, row.ca.toFixed(2), row.tickets, row.qty])
                  )}>CSV</Button>
                </Box>
                <List dense>
                  {selected.monthlyRows.map((row) => (
                    <ListItem key={row.key} sx={{ py: 0.25 }}>
                      <ListItemText primary={row.key} secondary={`${row.tickets} ticket(s) - ${row.qty} article(s)`} />
                      <Typography fontFamily="monospace" fontWeight={900}>{formatEuro(row.ca)}</Typography>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card sx={{ gridColumn: '1 / -1' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Top articles par CA</Typography>
                  <Button size="small" variant="outlined" onClick={() => downloadCsv(
                    `${selected.name}-top-articles.csv`,
                    ['Rang', 'Article', 'Quantite', 'CA'],
                    sortedTopProducts.map((product, index) => [index + 1, product.name, product.qty, product.amount.toFixed(2)])
                  )}>CSV</Button>
                </Box>
                <List dense>
                  {sortedTopProducts.map((product, index) => (
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
