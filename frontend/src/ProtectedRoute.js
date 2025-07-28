// src/ProtectedRoute.js
import React from 'react';
import { isAuthenticated } from './auth';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return null; // o podrías retornar un <Redirect /> si usas React Router
  }

  return children;
}

export default ProtectedRoute;
