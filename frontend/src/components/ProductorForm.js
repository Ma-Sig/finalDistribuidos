import React, { useState } from 'react';
import { TextField, Button, Snackbar, Alert } from '@mui/material';

function ProductorForm({ onAgregar }) {
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!id || !nombre) {
      setMensaje('ID y Nombre son requeridos');
      setError(true);
      setOpen(true);
      return;
    }

    const res = await fetch('/api/productores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre }),
    });

    const data = await res.json();
    if (res.ok) {
      onAgregar({ id, nombre });
      setId('');
      setNombre('');
      setMensaje('Productor creado');
      setError(false);
    } else {
      setMensaje(data.error || 'Error al crear');
      setError(true);
    }
    setOpen(true);
  };

  return (
    <div>
      <TextField label="ID" value={id} onChange={(e) => setId(e.target.value)} sx={{ mr: 2 }} />
      <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mr: 2 }} />
      <Button variant="contained" onClick={handleSubmit}>
        Agregar Productor
      </Button>

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert severity={error ? 'error' : 'success'}>{mensaje}</Alert>
      </Snackbar>
    </div>
  );
}

export default ProductorForm;
