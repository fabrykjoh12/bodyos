import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Match the router to Vite's base so routes resolve under /bodyos/ on
// GitHub Pages and under / in local dev. Trailing slash stripped for React Router.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
