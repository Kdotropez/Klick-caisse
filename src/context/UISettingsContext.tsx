import React, { createContext, useContext, useMemo, useState } from 'react';

interface UISettingsContextValue {
  compactMode: boolean;
  setCompactMode: (value: boolean) => void;
}

const UISettingsContext = createContext<UISettingsContextValue | undefined>(undefined);

export const UISettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compactModeState, setCompactModeState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('ui.compact');
      return stored === '1';
    } catch {
      return false;
    }
  });

  const setCompactMode = (value: boolean) => {
    setCompactModeState(value);
    try {
      localStorage.setItem('ui.compact', value ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo<UISettingsContextValue>(() => ({
    compactMode: compactModeState,
    setCompactMode,
  }), [compactModeState]);

  return (
    <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>
  );
};

export const useUISettings = (): UISettingsContextValue => {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error('useUISettings must be used within a UISettingsProvider');
  return ctx;
};


