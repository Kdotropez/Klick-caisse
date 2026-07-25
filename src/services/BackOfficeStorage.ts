type BackOfficeStoreData = {
  storeCode: string;
  storeName?: string;
  updatedAt: string;
  closures: any[];
  transactionsByDay: Record<string, any[]>;
  zCounter?: number;
  settings?: any;
  subcategories?: string[];
  cashiers?: any[];
  customers?: any[];
};

const DB_NAME = 'klick_back_office';
const DB_VERSION = 1;
const STORE_NAME = 'storeData';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'storeCode' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async <T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const req = run(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export class BackOfficeStorage {
  static async loadStore(storeCode: string): Promise<BackOfficeStoreData | null> {
    return tx<BackOfficeStoreData | undefined>('readonly', (store) => store.get(storeCode)).then((value) => value || null);
  }

  static async saveStore(data: BackOfficeStoreData): Promise<void> {
    await tx<IDBValidKey>('readwrite', (store) => store.put({ ...data, updatedAt: new Date().toISOString() }));
  }

  static async clearStore(storeCode: string): Promise<void> {
    await tx<undefined>('readwrite', (store) => store.delete(storeCode));
  }

  static async loadAll(storeCodes: string[]): Promise<Record<string, BackOfficeStoreData | null>> {
    const entries = await Promise.all(storeCodes.map(async (code) => [code, await this.loadStore(code)] as const));
    return Object.fromEntries(entries);
  }
}

export type { BackOfficeStoreData };
