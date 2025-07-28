import React, { useState } from 'react';
import { TextField, Button, Select, MenuItem, InputLabel, FormControl, Snackbar, Alert, Box } from '@mui/material';

const token = localStorage.getItem('token');

function PedidoForm({ productores }) {
  const [nombre, setNombre] = useState('');
  const [productorId, setProductorId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!nombre || !productorId) {
      setMensaje('Nombre y productor son requeridos');
      setError(true);
      setOpen(true);
      return;
    }

    const res = await fetch('http://localhost:80/pedidos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ nombre, productor_id: productorId }),
    });

    const data = await res.json();
    if (res.ok) {
      setNombre('');
      setProductorId('');
      setMensaje('Pedido creado');
      setError(false);
    } else {
      setMensaje(data.error || 'Error al crear pedido');
      setError(true);
    }
    setOpen(true);
  };

  return (
    <Box mb={3}>
      <TextField label="Nombre Pedido" value={nombre} onChange={(e) => setNombre(e.target.value)} sx={{ mr: 2 }} />
      <FormControl sx={{ mr: 2, minWidth: 180 }}>
        <InputLabel>Productor</InputLabel>
        <Select value={productorId} onChange={(e) => setProductorId(e.target.value)} label="Productor">
          <MenuItem value=""><em>Selecciona</em></MenuItem>
          {productores.map((p) => (
            <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="contained" onClick={handleSubmit}>Crear Pedido</Button>

      <Snackbar open={open} autoHideDuration={3000} onClose={() => setOpen(false)}>
        <Alert severity={error ? 'error' : 'success'}>{mensaje}</Alert>
      </Snackbar>
    </Box>
  );
}

export default PedidoForm;
