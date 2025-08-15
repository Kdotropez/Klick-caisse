import { Store } from '../types/Store';

export const STORES: Store[] = [
  { code: '1', name: 'Port Grimaud', location: 'Port Grimaud' },
  { code: '2', name: 'Sainte Maxime', location: 'Sainte Maxime' },
  { code: '3', name: 'Saint Tropez', location: 'Saint Tropez' },
  { code: '4', name: 'Marchés', location: 'Marchés' },
  { code: '5', name: 'Cannes', location: 'Cannes' }
];

export const getStoreByCode = (code: string): Store | undefined => {
  return STORES.find(store => store.code === code);
};

export const getStoreByName = (name: string): Store | undefined => {
  return STORES.find(store => store.name === name);
};

