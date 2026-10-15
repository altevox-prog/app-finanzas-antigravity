import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { PrivacyProvider } from './context/PrivacyContext';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ui/ErrorBoundary';
import './index.css';
import { initPWA } from './pwaHelper';

// Inicializar PWA (Service Worker y Persistencia)
initPWA();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PrivacyProvider>
          <App />
        </PrivacyProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);

