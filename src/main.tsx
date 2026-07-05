/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

const rawKey = 
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const PUBLISHABLE_KEY = 
  (rawKey && !rawKey.includes('YOUR_PUBLISHABLE_KEY'))
    ? rawKey
    : "pk_test_aGVscGZ1bC13YWhvby05Ny5jbGVyay5hY2NvdW50cy5kZXYk";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ClerkProvider>
  </StrictMode>,
);
