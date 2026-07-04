/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY. Add it to your .env file and restart the dev server.'
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>,
);
