
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');

if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Mounting Error:", error);
    container.innerHTML = `<div style="padding: 20px; color: red; font-family: monospace;">
      <h1>Mounting Failure</h1>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>`;
  }
} else {
  console.error("Critical Failure: Root substrate 'root' not detected in DOM.");
}
