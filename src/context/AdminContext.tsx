import React, { createContext, useContext, useMemo, useState } from 'react';

type AdminContextValue = {
  isAdmin: boolean;
  unlockWithCode: (code: string) => boolean;
  lock: () => void;
};

const STORAGE_KEY = 'ui.admin';
const ADMIN_CODE = '2111';

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminState, setIsAdminState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const unlockWithCode = (code: string) => {
    if (String(code || '').trim() !== ADMIN_CODE) return false;
    setIsAdminState(true);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    return true;
  };

  const lock = () => {
    setIsAdminState(false);
    try {
      localStorage.setItem(STORAGE_KEY, '0');
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo<AdminContextValue>(() => ({
    isAdmin: isAdminState,
    unlockWithCode,
    lock,
  }), [isAdminState]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = (): AdminContextValue => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider');
  return ctx;
};

