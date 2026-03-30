/** Grille catalogue tactile : nombre de colonnes selon la largeur du volet produits. */

export const PRODUCT_GRID_ROWS = 5;
export const PRODUCT_GRID_MIN_COLS = 3;
export const PRODUCT_GRID_MAX_COLS = 5;
/** Largeur cible minimale d’une carte (px + réservation pour gaps). */
const MIN_SLOT_APPROX = 128;

export interface ProductGridLayout {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  cardsPerPage: number;
  prevCellIndex: number;
  nextCellIndex: number;
  totalCells: number;
}

export function getProductGridLayout(containerWidth: number): ProductGridLayout {
  const w = Math.max(320, Math.floor(containerWidth));
  let cols = Math.floor((w - 2) / MIN_SLOT_APPROX);
  cols = Math.max(PRODUCT_GRID_MIN_COLS, Math.min(PRODUCT_GRID_MAX_COLS, cols));
  const gapAndBorderBudget = 2 * cols + 1;
  const availableWidth = Math.max(cols * 80, w - gapAndBorderBudget);
  const cardWidth = Math.floor(availableWidth / cols);
  const cardHeight = 91;
  const totalCells = cols * PRODUCT_GRID_ROWS;
  const prevCellIndex = (PRODUCT_GRID_ROWS - 1) * cols;
  const nextCellIndex = totalCells - 1;
  const cardsPerPage = totalCells - 2;

  return {
    cols,
    rows: PRODUCT_GRID_ROWS,
    cardWidth,
    cardHeight,
    cardsPerPage,
    prevCellIndex,
    nextCellIndex,
    totalCells,
  };
}
