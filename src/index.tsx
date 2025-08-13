import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { UISettingsProvider } from './context/UISettingsContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // StrictMode désactivé temporairement pour éviter le double appel d'effets en dev
  <UISettingsProvider>
    <App />
  </UISettingsProvider>
);
