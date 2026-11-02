import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AuthProvider } from './auth';
import { App } from './App';

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
