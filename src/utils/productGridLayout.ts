/** Grille catalogue tactile : nombre de colonnes/lignes selon l'espace disponible. */

export const PRODUCT_GRID_DEFAULT_ROWS = 5;
export const PRODUCT_GRID_MIN_COLS = 3;
export const PRODUCT_GRID_MAX_COLS = 8;
export const PRODUCT_GRID_MIN_ROWS = 3;
export const PRODUCT_GRID_MAX_ROWS = 7;

/** Largeur/hauteur cible minimale d'une carte tactile. */
const MIN_CARD_WIDTH = 118;
const MIN_CARD_HEIGHT = 102;
const MAX_CARD_HEIGHT = 145;
const GRID_GAP = 2;
const GRID_PADDING = 2;

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

export function getProductGridLayout(containerWidth: number, containerHeight?: number): ProductGridLayout {
  const w = Math.max(320, Math.floor(containerWidth));
  const h = Math.max(260, Math.floor(containerHeight ?? 0));
  let cols = Math.floor((w - GRID_PADDING * 2 + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP));
  cols = Math.max(PRODUCT_GRID_MIN_COLS, Math.min(PRODUCT_GRID_MAX_COLS, cols));

  let rows = containerHeight
    ? Math.floor((h - GRID_PADDING * 2 + GRID_GAP) / (MIN_CARD_HEIGHT + GRID_GAP))
    : PRODUCT_GRID_DEFAULT_ROWS;
  rows = Math.max(PRODUCT_GRID_MIN_ROWS, Math.min(PRODUCT_GRID_MAX_ROWS, rows));

  const gapAndBorderBudget = GRID_PADDING * 2 + GRID_GAP * (cols - 1);
  const availableWidth = Math.max(cols * 80, w - gapAndBorderBudget);
  const cardWidth = Math.floor(availableWidth / cols);
  const heightBudget = GRID_PADDING * 2 + GRID_GAP * (rows - 1);
  const availableHeight = Math.max(rows * MIN_CARD_HEIGHT, h - heightBudget);
  const cardHeight = Math.min(MAX_CARD_HEIGHT, Math.floor(availableHeight / rows));
  const totalCells = cols * rows;
  const prevCellIndex = (rows - 1) * cols;
  const nextCellIndex = totalCells - 1;
  const cardsPerPage = totalCells - 2;

  return {
    cols,
    rows,
    cardWidth,
    cardHeight,
    cardsPerPage,
    prevCellIndex,
    nextCellIndex,
    totalCells,
  };
}
