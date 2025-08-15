import { Product, Category } from '../types';

const toProduct = (id: string, name: string, price: number, category: string, position: number): Product => ({
  id,
  name,
  ean13: '',
  reference: '',
  category,
  wholesalePrice: Math.max(0, Number((price * 0.8).toFixed(2))),
  finalPrice: price,
  crossedPrice: price,
  salesCount: 0,
  position,
  remisable: true,
  variations: [],
});

export const sampleProducts: Product[] = [
  toProduct('1', 'Pain au chocolat', 1.20, 'boulangerie', 1),
  toProduct('2', 'Croissant', 1.10, 'boulangerie', 2),
  toProduct('3', 'Baguette', 0.95, 'boulangerie', 3),
  toProduct('4', 'Lait 1L', 1.15, 'produits-laitiers', 4),
  toProduct('5', 'Yaourt nature', 0.85, 'produits-laitiers', 5),
  toProduct('6', 'Fromage blanc', 1.50, 'produits-laitiers', 6),
  toProduct('7', 'Pommes Golden', 2.50, 'fruits-legumes', 7),
  toProduct('8', 'Bananes', 1.80, 'fruits-legumes', 8),
  toProduct('9', 'Tomates', 2.20, 'fruits-legumes', 9),
  toProduct('10', 'Eau minérale 1.5L', 0.75, 'boissons', 10),
  toProduct('11', 'Coca-Cola 33cl', 1.20, 'boissons', 11),
  toProduct('12', "Jus d'orange 1L", 2.10, 'boissons', 12),
];

export const categories: Category[] = [
  { id: 'boulangerie', name: 'Boulangerie', color: '#FFD700' },
  { id: 'produits-laitiers', name: 'Produits Laitiers', color: '#87CEEB' },
  { id: 'fruits-legumes', name: 'Fruits & Légumes', color: '#90EE90' },
  { id: 'boissons', name: 'Boissons', color: '#FFB6C1' },
];