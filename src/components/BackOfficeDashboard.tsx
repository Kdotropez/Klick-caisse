import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { BackOfficeStorage, BackOfficeStoreData } from '../services/BackOfficeStorage';
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

const downloadJson = (filename: string, data: unknown): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
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
    <h2>Clôtures / Z</h2>
    <table><thead><tr><th>Z Back office</th><th>Z original</th><th>Date</th><th>Tickets</th><th>CA</th></tr></thead><tbody>${htmlRows(store.closures.map((closure) => {
      const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
      const total = txs.reduce((sum: number, tx: any) => sum + (Number(tx?.total) || 0), 0);
      return [
        `Z${closure?.zNumber || '-'}`,
        Array.isArray(closure?.originalZNumbers)
          ? closure.originalZNumbers.map((z: number) => `Z${z}`).join(', ')
          : closure?.originalZNumber ? `Z${closure.originalZNumber}` : '',
        closure?.closedAt ? new Date(closure.closedAt).toLocaleDateString('fr-FR') : '',
        txs.length,
        formatEuro(total),
      ];
    }))}</tbody></table>
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

const buildPortableHtmlReport = (stores: StoreStats[]): string => `
  ${buildGlobalHtmlReport(stores)}
  ${stores.map((store) => `<div style="break-before: page; page-break-before: always;">${buildStoreHtmlReport(store)}</div>`).join('')}
`;

const exportBackOfficeBackup = (stores: Array<{ code: string; name: string }>, dataByStore: Record<string, BackOfficeStoreData | null>): void => {
  const backup = {
    schemaVersion: 1,
    type: 'klick-back-office-backup',
    exportedAt: new Date().toISOString(),
    stores: stores.map((store) => {
      const storeData = dataByStore[store.code];
      const productionData = StorageService.loadProductionData(store.code);
      const transactionsByDay = storeData?.transactionsByDay || parseMap(localStorage.getItem(StorageService.getStoreKey(store.code, 'transactions_by_day')));
      return {
        code: store.code,
        name: store.name,
        productionData,
        settings: storeData?.settings || (() => {
          try { return JSON.parse(localStorage.getItem(StorageService.getStoreKey(store.code, 'settings')) || '{}'); } catch { return {}; }
        })(),
        subcategories: storeData?.subcategories || (() => {
          try { return JSON.parse(localStorage.getItem(StorageService.getStoreKey(store.code, 'subcategories')) || '[]'); } catch { return []; }
        })(),
        transactionsByDay,
        closures: storeData?.closures || StorageService.loadClosures(store.code),
        zCounter: storeData?.zCounter ?? Number(localStorage.getItem(StorageService.getStoreKey(store.code, 'z_counter')) || '0'),
        cashiers: storeData?.cashiers || StorageService.loadCashiers(store.code),
        customers: storeData?.customers || (() => {
          try { return JSON.parse(localStorage.getItem(StorageService.getStoreKey(store.code, 'customers')) || '[]'); } catch { return []; }
        })(),
        imports: storeData?.imports || [],
      };
    }),
  };
  downloadJson(`klick-back-office-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
};

const parseMap = (raw: string | null): Record<string, any[]> => {
  try {
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const collectStoreTransactions = (storeCode: string, closures: any[], transactionsByDayOverride?: Record<string, any[]>): any[] => {
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

  const map = transactionsByDayOverride || parseMap(localStorage.getItem(StorageService.getStoreKey(storeCode, 'transactions_by_day')));
  Object.values(map).forEach((list) => {
    if (Array.isArray(list)) list.forEach(add);
  });

  return out;
};

const getTxDayKey = (tx: any): string => {
  const date = new Date(tx?.timestamp);
  return Number.isFinite(date.getTime()) ? formatDayKey(date) : 'date-inconnue';
};

const txUniqueKey = (tx: any): string => {
  const id = String(tx?.id || '');
  const ts = new Date(tx?.timestamp || 0).getTime();
  return `${id}@${ts}`;
};

const buildDailyClosuresFromBackup = (data: any): any[] => {
  const byDay = new Map<string, { txs: any[]; txKeys: Set<string>; originalZNumbers: Set<number> }>();
  const addTx = (tx: any, originalZ?: number) => {
    const day = getTxDayKey(tx);
    const current = byDay.get(day) || { txs: [], txKeys: new Set<string>(), originalZNumbers: new Set<number>() };
    const key = txUniqueKey(tx);
    if (!current.txKeys.has(key)) {
      current.txKeys.add(key);
      current.txs.push(tx);
    }
    if (Number.isFinite(Number(originalZ))) current.originalZNumbers.add(Number(originalZ));
    byDay.set(day, current);
  };

  if (Array.isArray(data?.closures)) {
    for (const closure of data.closures) {
      const originalZ = Number(closure?.zNumber);
      const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
      txs.forEach((tx: any) => addTx(tx, originalZ));
    }
  }

  const txMap = data?.transactionsByDay && typeof data.transactionsByDay === 'object' ? data.transactionsByDay : {};
  for (const list of Object.values(txMap)) {
    if (Array.isArray(list)) list.forEach((tx: any) => addTx(tx));
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({
      zNumber: 0,
      originalZNumbers: Array.from(value.originalZNumbers).sort((a, b) => a - b),
      closedAt: `${day}T23:59:59.999Z`,
      transactions: value.txs.sort((a, b) => new Date(a?.timestamp || 0).getTime() - new Date(b?.timestamp || 0).getTime()),
      totalCA: value.txs.reduce((sum, tx) => sum + (Number(tx?.total) || 0), 0),
      reconstructedFromTickets: true,
      sourceExportedAt: data?.exportedAt,
    }));
};

const mergeClosuresByDay = (existing: any[], incoming: any[]): any[] => {
  const byDay = new Map<string, any>();
  const usedZ = new Set<number>();

  for (const closure of existing) {
    const day = String(closure?.closedAt || '').slice(0, 10);
    const z = Number(closure?.zNumber);
    if (Number.isFinite(z)) usedZ.add(z);
    if (day) byDay.set(day, closure);
  }

  let nextZ = usedZ.size > 0 ? Math.max(...Array.from(usedZ)) + 1 : 1;
  for (const closure of incoming) {
    const day = String(closure?.closedAt || '').slice(0, 10);
    if (!day) continue;
    const existingClosure = byDay.get(day);
    if (existingClosure) {
      const existingTxs = Array.isArray(existingClosure.transactions) ? existingClosure.transactions : [];
      const seen = new Set(existingTxs.map(txUniqueKey));
      const incomingTxs = Array.isArray(closure.transactions) ? closure.transactions : [];
      const mergedTxs = [...existingTxs];
      for (const tx of incomingTxs) {
        const key = txUniqueKey(tx);
        if (!seen.has(key)) {
          seen.add(key);
          mergedTxs.push(tx);
        }
      }
      const originalZNumbers = Array.from(new Set([
        ...((Array.isArray(existingClosure.originalZNumbers) ? existingClosure.originalZNumbers : []) as number[]),
        ...((Array.isArray(closure.originalZNumbers) ? closure.originalZNumbers : []) as number[]),
      ])).sort((a, b) => Number(a) - Number(b));
      byDay.set(day, {
        ...existingClosure,
        originalZNumbers,
        transactions: mergedTxs,
        totalCA: mergedTxs.reduce((sum, tx) => sum + (Number(tx?.total) || 0), 0),
        reconstructedFromTickets: true,
      });
      continue;
    }

    while (usedZ.has(nextZ)) nextZ += 1;
    usedZ.add(nextZ);
    byDay.set(day, { ...closure, zNumber: nextZ });
  }

  return Array.from(byDay.values()).sort((a, b) => new Date(a?.closedAt || 0).getTime() - new Date(b?.closedAt || 0).getTime());
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

const transactionsByDayFromClosures = (closures: any[]): Record<string, any[]> => {
  const map: Record<string, any[]> = {};
  for (const closure of closures) {
    const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
    for (const tx of txs) {
      const day = getTxDayKey(tx);
      if (!map[day]) map[day] = [];
      map[day].push(tx);
    }
  }
  return map;
};

const buildStoreStats = (storeCode: string, storeName: string, backOfficeData?: BackOfficeStoreData | null): StoreStats => {
  let closures = backOfficeData?.closures || StorageService.loadClosures(storeCode);
  let transactionsByDay = backOfficeData?.transactionsByDay;
  if (backOfficeData?.imports && backOfficeData.imports.length > 0) {
    closures = [];
    transactionsByDay = {};
    for (const imported of backOfficeData.imports) {
      const dailyClosures = buildDailyClosuresFromBackup(imported);
      closures = mergeClosuresByDay(closures, dailyClosures);
      transactionsByDay = mergeTransactionsByDay(
        transactionsByDay,
        mergeTransactionsByDay(transactionsByDayFromClosures(dailyClosures), imported.transactionsByDay || {})
      );
    }
  }
  const txs = collectStoreTransactions(storeCode, closures, transactionsByDay);
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
  const [backOfficeData, setBackOfficeData] = useState<Record<string, BackOfficeStoreData | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    BackOfficeStorage.loadAll(stores.map((store) => store.code))
      .then((data) => {
        if (!cancelled) setBackOfficeData(data);
      })
      .catch((error) => console.error('Erreur chargement Back office IndexedDB:', error));
    return () => {
      cancelled = true;
    };
  }, [refreshKey, stores]);

  const statsByStore = useMemo(() => {
    void refreshKey;
    return stores.map((store) => buildStoreStats(store.code, store.name, backOfficeData[store.code]));
  }, [backOfficeData, refreshKey, stores]);

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
      if (Array.isArray(data.products) || Array.isArray(data.categories)) {
        // En Back office, les statistiques viennent des tickets/clôtures importés.
        // Ne pas persister le gros catalogue évite de saturer localStorage et laisse la place aux Z.
        StorageService.clearStoreCatalogForRestore(targetStoreCode);
        console.info('Catalogue du backup ignoré en stockage Back office pour préserver le quota. Les articles vendus restent disponibles via les tickets.');
      }
      if (data.settings) StorageService.saveSettings(data.settings, targetStoreCode);
      if (Array.isArray(data.subcategories)) StorageService.saveSubcategories(data.subcategories, targetStoreCode);
      let mergedClosures: any[] | null = null;
      const importedDailyClosures = buildDailyClosuresFromBackup(data);
      const existingBackOffice = await BackOfficeStorage.loadStore(targetStoreCode);
      const backupId = [
        file.name,
        data.exportedAt || '',
        targetStoreCode,
        String(data.zCounter || ''),
        String(Array.isArray(data.closures) ? data.closures.length : 0),
      ].join('|');
      const existingImports = existingBackOffice?.imports || [];
      if (existingImports.some((item) => item.id === backupId)) {
        window.alert('Ce fichier a déjà été importé pour cette boutique. Aucun doublon ajouté.');
        return;
      }
      if (importedDailyClosures.length > 0) {
        const existingClosures = existingBackOffice?.closures || [];
        mergedClosures = mergeClosuresByDay(existingClosures, importedDailyClosures);
      }
      const txFromClosures = importedDailyClosures.length > 0 ? transactionsByDayFromClosures(importedDailyClosures) : {};
      const incomingTransactionsByDay = mergeTransactionsByDay(txFromClosures, data.transactionsByDay || {});
      const mergedTransactionsByDay = mergeTransactionsByDay(existingBackOffice?.transactionsByDay || {}, incomingTransactionsByDay);
      const maxZ = (mergedClosures || existingBackOffice?.closures || [])
        .reduce((max, closure) => Math.max(max, Number(closure?.zNumber) || 0), 0);
      await BackOfficeStorage.saveStore({
        storeCode: targetStoreCode,
        storeName: targetStore.name,
        updatedAt: new Date().toISOString(),
        closures: mergedClosures || existingBackOffice?.closures || [],
        transactionsByDay: mergedTransactionsByDay,
        zCounter: Math.max(Number(data.zCounter) || 0, maxZ, existingBackOffice?.zCounter || 0),
        settings: data.settings || existingBackOffice?.settings,
        subcategories: Array.isArray(data.subcategories) ? data.subcategories : existingBackOffice?.subcategories,
        cashiers: Array.isArray(data.cashiers) ? data.cashiers : existingBackOffice?.cashiers,
        customers: Array.isArray(data.customers) ? data.customers : existingBackOffice?.customers,
        imports: [
          ...existingImports,
          {
            id: backupId,
            fileName: file.name,
            exportedAt: data.exportedAt,
            storeCode: targetStoreCode,
            storeName: targetStore.name,
            closures: Array.isArray(data.closures) ? data.closures : [],
            transactionsByDay: data.transactionsByDay || {},
            zCounter: Number(data.zCounter) || undefined,
          },
        ],
      });
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
        <Button
          variant="outlined"
          size="large"
          onClick={() => downloadHtml('rapport-back-office-complet.html', 'Rapport Back office complet', buildPortableHtmlReport(statsByStore))}
        >
          HTML portable complet
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => exportBackOfficeBackup(stores, backOfficeData)}
        >
          Sauvegarde Back office
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
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      const ok = window.confirm(
                        `Remettre à zéro les imports de ${selected.name} ?\n\n` +
                        `Une archive de sécurité sera téléchargée avant suppression.\n` +
                        `Cette action supprime les données importées de cette boutique dans le Back office.`
                      );
                      if (!ok) return;
                      StorageService.prepareActiveStoreForFullRestore(selected.code);
                      BackOfficeStorage.clearStore(selected.code)
                        .then(() => {
                          setRefreshKey((value) => value + 1);
                          window.alert(`Imports remis à zéro pour ${selected.name}.`);
                        })
                        .catch((error) => window.alert(`Erreur remise à zéro: ${(error as Error).message}`));
                    }}
                  >
                    RAZ imports boutique
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
                  <Typography variant="h6" fontWeight={900} sx={{ flex: 1 }}>Clôtures / Z</Typography>
                  <Button size="small" variant="outlined" onClick={() => downloadCsv(
                    `${selected.name}-clotures-z.csv`,
                    ['Z Back office', 'Z original', 'Date', 'Tickets', 'CA'],
                    selected.closures.map((closure) => {
                      const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
                      const total = txs.reduce((sum: number, tx: any) => sum + (Number(tx?.total) || 0), 0);
                      return [
                        `Z${closure?.zNumber || '-'}`,
                        Array.isArray(closure?.originalZNumbers)
                          ? closure.originalZNumbers.map((z: number) => `Z${z}`).join(', ')
                          : closure?.originalZNumber ? `Z${closure.originalZNumber}` : '',
                        closure?.closedAt ? new Date(closure.closedAt).toLocaleDateString('fr-FR') : '',
                        txs.length,
                        total.toFixed(2),
                      ];
                    })
                  )}>CSV</Button>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr', gap: 1, fontWeight: 900, borderBottom: '1px solid #ddd', pb: 0.5 }}>
                  <Typography>Z Back office</Typography><Typography>Z original</Typography><Typography>Date</Typography><Typography>Tickets</Typography><Typography>CA</Typography>
                </Box>
                {selected.closures.map((closure) => {
                  const txs = Array.isArray(closure?.transactions) ? closure.transactions : [];
                  const total = txs.reduce((sum: number, tx: any) => sum + (Number(tx?.total) || 0), 0);
                  return (
                    <Box key={`${closure?.zNumber}-${closure?.closedAt}`} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr 1fr 1fr', gap: 1, py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                      <Typography fontWeight={800}>Z{closure?.zNumber || '-'}</Typography>
                      <Typography>
                        {Array.isArray(closure?.originalZNumbers)
                          ? closure.originalZNumbers.map((z: number) => `Z${z}`).join(', ')
                          : closure?.originalZNumber ? `Z${closure.originalZNumber}` : '-'}
                      </Typography>
                      <Typography>{closure?.closedAt ? new Date(closure.closedAt).toLocaleDateString('fr-FR') : '-'}</Typography>
                      <Typography>{txs.length}</Typography>
                      <Typography fontFamily="monospace">{formatEuro(total)}</Typography>
                    </Box>
                  );
                })}
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
