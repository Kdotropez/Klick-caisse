export interface Store {
  code: string;
  name: string;
  location: string;
  isBackOfficeProfile?: boolean;
}

export const BACK_OFFICE_PROFILE_CODE = 'nicolas';
export const BACK_OFFICE_DEFAULT_STORE_CODE = '3';

export const STORES: Store[] = [
  { code: BACK_OFFICE_PROFILE_CODE, name: 'Nicolas', location: 'Back office central', isBackOfficeProfile: true },
  { code: '1', name: 'Port Grimaud', location: 'Port Grimaud' },
  { code: '2', name: 'Sainte Maxime', location: 'Sainte Maxime' },
  { code: '3', name: 'Saint Tropez', location: 'Saint Tropez' },
  { code: '4', name: 'Marchés', location: 'Marchés' },
  { code: '5', name: 'Cannes', location: 'Cannes' },
  { code: '6', name: 'Cavalaire', location: 'Cavalaire' }
];

export const getStoreByCode = (code: string): Store | undefined => {
  return STORES.find(store => store.code === code);
};

export const getStoreByName = (name: string): Store | undefined => {
  return STORES.find(store => store.name === name);
};

