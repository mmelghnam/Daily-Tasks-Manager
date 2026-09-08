import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const legacyHost = 'daybytask.replit.app';

if (window.location.hostname === legacyHost) {
  const destination = new URL(window.location.href);
  destination.hostname = 'daybytask.com';

  if (destination.pathname === '/') {
    destination.pathname = '/app';
  }

  window.location.replace(destination.toString());
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
