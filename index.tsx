
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: Force removal of splash screen if the native 'load' event is delayed
setTimeout(() => {
  const splash = document.getElementById('splash-screen');
  if (splash && !splash.classList.contains('animate-splash-exit')) {
    splash.classList.add('animate-splash-exit');
  }
}, 5000);
