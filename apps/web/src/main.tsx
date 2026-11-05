import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { AuthProvider } from './auth';
import { App } from './App';
import { SandboxBanner } from './SandboxBanner';

const container = document.getElementById('root');
if (!container) throw new Error('root element not found');

createRoot(container).render(
  <StrictMode>
    <SandboxBanner enabled={import.meta.env.VITE_SANDBOX_BANNER} />
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
