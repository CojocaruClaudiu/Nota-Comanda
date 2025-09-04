import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/ro';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ro">
      <App />
    </LocalizationProvider>
  </React.StrictMode>
);
