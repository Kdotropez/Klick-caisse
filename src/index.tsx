import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { UISettingsProvider } from './context/UISettingsContext';
import ErrorBoundary from './components/ErrorBoundary';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
// Protection contre les erreurs React DOM
const renderApp = () => {
  try {
    root.render(
      // StrictMode désactivé temporairement pour éviter le double appel d'effets en dev
      <ErrorBoundary>
        <UISettingsProvider>
          <App />
        </UISettingsProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('❌ Erreur critique React DOM:', error);
    // Afficher un message d'erreur simple
    const errorMessage = error instanceof Error ? error.toString() : String(error);
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif; text-align: center;">
        <h2>⚠️ Erreur de chargement</h2>
        <p>Une erreur s'est produite lors du chargement de l'application.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
          🔄 Recharger la page
        </button>
        <details style="margin-top: 20px; text-align: left;">
          <summary>Détails techniques</summary>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">
${errorMessage}
          </pre>
        </details>
      </div>
    `;
  }
};

renderApp();
