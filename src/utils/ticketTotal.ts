import { CartItem } from '../types/Product';
import { StorageService } from '../services/StorageService';

export type ItemDiscount = { type: 'euro' | 'percent' | 'price'; value: number };
export type GlobalDiscount = { type: 'euro' | 'percent'; value: number } | null;

export interface DiscountExclusionSettings {
  excludedDiscountCategories?: string[];
  excludedDiscountSubcategories?: string[];
  excludedDiscountProductIds?: string[];
}

/** Ligne ticket / panier (supporte customPrice après édition). */
export type TicketLineItem = CartItem & {
  customPrice?: number;
  originalPrice?: number;
};

export function getLineDiscountKey(item: TicketLineItem): string {
  return `${item.product.id}-${item.selectedVariation?.id || 'main'}`;
}

export function getLineOriginalUnitPrice(item: TicketLineItem): number {
  if (item.customPrice !== undefined && item.originalPrice !== undefined) {
    return coerceUnit(item.originalPrice);
  }
  if (item.selectedVariation) return coerceUnit(item.selectedVariation.finalPrice);
  return coerceUnit(item.product.finalPrice);
}

function coerceUnit(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function getLineBaseUnitPrice(item: TicketLineItem): number {
  if (item.customPrice !== undefined) return coerceUnit(item.customPrice);
  return getLineOriginalUnitPrice(item);
}

export function getLineFinalUnitPrice(
  item: TicketLineItem,
  itemDiscounts: Record<string, ItemDiscount> = {}
): number {
  const originalPrice = getLineOriginalUnitPrice(item);
  if (item.customPrice !== undefined) {
    return coerceUnit(item.customPrice);
  }
  const discount = itemDiscounts[getLineDiscountKey(item)];
  if (!discount) return originalPrice;

  switch (discount.type) {
    case 'euro':
      return Math.max(0, originalPrice - discount.value);
    case 'percent':
      return originalPrice * (1 - discount.value / 100);
    case 'price':
      return Math.max(0, discount.value);
    default:
      return originalPrice;
  }
}

export function isLineExcludedFromGlobalDiscount(
  item: TicketLineItem,
  settings: DiscountExclusionSettings = {}
): boolean {
  const excludedProd: string[] = Array.isArray(settings.excludedDiscountProductIds)
    ? settings.excludedDiscountProductIds
    : [];
  if (excludedProd.includes(item.product.id)) return true;

  const norm = (s: string) => StorageService.normalizeLabel(String(s || ''));
  const excludedCats = new Set(
    (Array.isArray(settings.excludedDiscountCategories) ? settings.excludedDiscountCategories : []).map(norm)
  );
  const excludedSub = new Set(
    (Array.isArray(settings.excludedDiscountSubcategories) ? settings.excludedDiscountSubcategories : []).map(norm)
  );

  const cat = item.product?.category || '';
  if (excludedCats.has(norm(cat))) return true;

  const subs: string[] = Array.isArray(item.product.associatedCategories) ? item.product.associatedCategories : [];
  return subs.some((s) => excludedSub.has(norm(s)));
}

export interface TicketTotalBreakdown {
  subtotal: number;
  individualDiscounts: number;
  globalDiscountAmount: number;
  totalDiscounts: number;
  total: number;
}

/**
 * Calcul canonique du total ticket (panier ou transaction).
 * Remise globale appliquée sur les lignes sans remise individuelle et non exclues.
 */
export function computeTicketTotalBreakdown(
  items: TicketLineItem[],
  itemDiscounts: Record<string, ItemDiscount> = {},
  globalDiscount: GlobalDiscount = null,
  settings: DiscountExclusionSettings = {}
): TicketTotalBreakdown {
  const list = Array.isArray(items) ? items : [];

  const subtotal = list.reduce((sum, item) => {
    const originalPrice = getLineBaseUnitPrice(item);
    const qty = Number(item.quantity) || 0;
    return sum + originalPrice * qty;
  }, 0);

  const individualDiscounts = list.reduce((sum, item) => {
    if (item.customPrice !== undefined) return sum;
    const originalPrice = getLineOriginalUnitPrice(item);
    const qty = Number(item.quantity) || 0;
    const originalTotal = originalPrice * qty;
    const finalPrice = getLineFinalUnitPrice(item, itemDiscounts);
    const finalTotal = finalPrice * qty;
    return sum + Math.max(0, originalTotal - finalTotal);
  }, 0);

  let globalDiscountAmount = 0;
  if (globalDiscount) {
    const totalWithoutIndividualDiscount = list.reduce((sum, item) => {
      const discountKey = getLineDiscountKey(item);
      const hasIndividualDiscount = itemDiscounts[discountKey];
      if (!hasIndividualDiscount && !isLineExcludedFromGlobalDiscount(item, settings)) {
        const originalPrice = getLineBaseUnitPrice(item);
        const qty = Number(item.quantity) || 0;
        return sum + originalPrice * qty;
      }
      return sum;
    }, 0);

    if (globalDiscount.type === 'euro') {
      globalDiscountAmount = Math.min(totalWithoutIndividualDiscount, globalDiscount.value);
    } else {
      globalDiscountAmount = totalWithoutIndividualDiscount * (globalDiscount.value / 100);
    }
  }

  const totalDiscounts = individualDiscounts + globalDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscounts);

  return {
    subtotal,
    individualDiscounts,
    globalDiscountAmount,
    totalDiscounts,
    total: Number.isFinite(total) ? total : 0,
  };
}

export function computeTicketTotal(
  items: TicketLineItem[],
  itemDiscounts: Record<string, ItemDiscount> = {},
  globalDiscount: GlobalDiscount = null,
  settings: DiscountExclusionSettings = {}
): number {
  return computeTicketTotalBreakdown(items, itemDiscounts, globalDiscount, settings).total;
}

export function loadDiscountExclusionSettings(): DiscountExclusionSettings {
  try {
    const settings = StorageService.loadSettings() || {};
    return {
      excludedDiscountCategories: Array.isArray(settings.excludedDiscountCategories)
        ? settings.excludedDiscountCategories
        : [],
      excludedDiscountSubcategories: Array.isArray((settings as any).excludedDiscountSubcategories)
        ? (settings as any).excludedDiscountSubcategories
        : [],
      excludedDiscountProductIds: Array.isArray((settings as any).excludedDiscountProductIds)
        ? (settings as any).excludedDiscountProductIds
        : [],
    };
  } catch {
    return {};
  }
}

/** Cumul des encaissements par mode (inclut chèques et variantes de libellés). */
export function computePaymentTotalsFromTransactionList(
  transactions: Array<{ paymentMethod?: string; total?: number }>
): Record<'Espèces' | 'SumUp' | 'Carte' | 'Chèque' | 'Autres', number> {
  let cash = 0;
  let card = 0;
  let sumup = 0;
  let check = 0;
  let other = 0;

  for (const tx of transactions) {
    const method = String(tx.paymentMethod || '').toLowerCase();
    const total = Number(tx.total) || 0;
    if (!Number.isFinite(total)) continue;

    if (method === 'cash' || method.includes('esp')) cash += total;
    else if (method === 'card' || method.includes('carte')) card += total;
    else if (method === 'sumup') sumup += total;
    else if (method === 'check' || method.includes('chèq') || method.includes('cheq')) check += total;
    else other += total;
  }

  return { Espèces: cash, SumUp: sumup, Carte: card, Chèque: check, Autres: other };
}

export function allocateGlobalDiscountByLineKey(
  items: TicketLineItem[],
  itemDiscounts: Record<string, ItemDiscount> = {},
  globalDiscount: GlobalDiscount = null,
  settings: DiscountExclusionSettings = {}
): Record<string, number> {
  const breakdown = computeTicketTotalBreakdown(items, itemDiscounts, globalDiscount, settings);
  const globalDiscountAmount = breakdown.globalDiscountAmount;
  if (globalDiscountAmount <= 0) return {};

  const eligible: Array<{ key: string; weight: number }> = [];
  for (const item of items) {
    const key = getLineDiscountKey(item);
    if (itemDiscounts[key] || isLineExcludedFromGlobalDiscount(item, settings)) continue;
    const weight = getLineBaseUnitPrice(item) * (Number(item.quantity) || 0);
    if (weight > 0) eligible.push({ key, weight });
  }

  const weightSum = eligible.reduce((s, e) => s + e.weight, 0);
  if (weightSum <= 0) return {};

  const out: Record<string, number> = {};
  for (const e of eligible) {
    out[e.key] = (e.weight / weightSum) * globalDiscountAmount;
  }
  return out;
}

export function getLinePayableAmount(
  item: TicketLineItem,
  itemDiscounts: Record<string, ItemDiscount> = {},
  globalShareByKey: Record<string, number> = {}
): number {
  const key = getLineDiscountKey(item);
  const unit = getLineFinalUnitPrice(item, itemDiscounts);
  const qty = Number(item.quantity) || 0;
  const beforeGlobal = unit * qty;
  const globalShare = globalShareByKey[key] || 0;
  return Math.max(0, beforeGlobal - globalShare);
}
