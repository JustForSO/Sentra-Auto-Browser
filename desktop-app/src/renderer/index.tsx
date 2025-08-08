import React from 'react';
import { createRoot } from 'react-dom/client';
import WindowsDesktop from './components/WindowsDesktop';
import './styles/windows-desktop.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(<WindowsDesktop />);
