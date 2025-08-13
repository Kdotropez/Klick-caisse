import React, { createContext, useContext, useMemo, useState } from 'react';

interface UISettingsContextValue {
  compactMode: boolean;
  setCompactMode: (value: boolean) => void;
  autoFit: boolean;
  setAutoFit: (value: boolean) => void;
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

  const [autoFitState, setAutoFitState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('ui.autofit');
      return stored === '1';
    } catch {
      return true; // utile par défaut sur iPad
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

  const setAutoFit = (value: boolean) => {
    setAutoFitState(value);
    try {
      localStorage.setItem('ui.autofit', value ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  };

  const value = useMemo<UISettingsContextValue>(() => ({
    compactMode: compactModeState,
    setCompactMode,
    autoFit: autoFitState,
    setAutoFit,
  }), [compactModeState, autoFitState]);

  return (
    <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>
  );
};

export const useUISettings = (): UISettingsContextValue => {
  const ctx = useContext(UISettingsContext);
  if (!ctx) throw new Error('useUISettings must be used within a UISettingsProvider');
  return ctx;
};


