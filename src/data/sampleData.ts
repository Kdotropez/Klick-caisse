import { Product, Category } from '../types';

export const sampleProducts: Product[] = [
  { id: '1', name: 'Pain au chocolat', price: 1.20, category: 'boulangerie', stock: 50 },
  { id: '2', name: 'Croissant', price: 1.10, category: 'boulangerie', stock: 45 },
  { id: '3', name: 'Baguette', price: 0.95, category: 'boulangerie', stock: 30 },
  { id: '4', name: 'Lait 1L', price: 1.15, category: 'produits-laitiers', stock: 25 },
  { id: '5', name: 'Yaourt nature', price: 0.85, category: 'produits-laitiers', stock: 40 },
  { id: '6', name: 'Fromage blanc', price: 1.50, category: 'produits-laitiers', stock: 20 },
  { id: '7', name: 'Pommes Golden', price: 2.50, category: 'fruits-legumes', stock: 15 },
  { id: '8', name: 'Bananes', price: 1.80, category: 'fruits-legumes', stock: 20 },
  { id: '9', name: 'Tomates', price: 2.20, category: 'fruits-legumes', stock: 12 },
  { id: '10', name: 'Eau minérale 1.5L', price: 0.75, category: 'boissons', stock: 35 },
  { id: '11', name: 'Coca-Cola 33cl', price: 1.20, category: 'boissons', stock: 30 },
  { id: '12', name: 'Jus d\'orange 1L', price: 2.10, category: 'boissons', stock: 18 },
];

export const categories: Category[] = [
  { id: 'boulangerie', name: 'Boulangerie', color: '#FFD700' },
  { id: 'produits-laitiers', name: 'Produits Laitiers', color: '#87CEEB' },
  { id: 'fruits-legumes', name: 'Fruits & Légumes', color: '#90EE90' },
  { id: 'boissons', name: 'Boissons', color: '#FFB6C1' },
]; 