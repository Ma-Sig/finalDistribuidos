// src/index.js
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Login from './Login';
import { isAuthenticated } from './auth';

function Root() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  return authenticated ? (
    <App />
  ) : (
    <Login onLoginSuccess={() => setAuthenticated(true)} />
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
