import React, { useEffect, useState } from 'react';
import { Container, Typography, Divider } from '@mui/material';
import io from 'socket.io-client';

import ProductorForm from './components/ProductorForm';
import PedidoForm from './components/PedidoForm';
import ProductoresList from './components/ProductoresList';
import PedidosList from './components/PedidosList';

const socket = io('/api');

function App() {
  const [productores, setProductores] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    fetch('/api/productores')
      .then((res) => res.json())
      .then(setProductores);

    fetch('/api/pedidos')
      .then((res) => res.json())
      .then(setPedidos);
  }, []);

  useEffect(() => {
    socket.on('nuevo_pedido', (pedido) => {
      setPedidos((prev) => [...prev, pedido]);
    });
    return () => socket.off('nuevo_pedido');
  }, []);

  const agregarProductor = (nuevo) => {
    setProductores((prev) => [...prev, nuevo]);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Sistema de Pedidos
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <ProductorForm onAgregar={agregarProductor} />
      <ProductoresList productores={productores} />

      <Divider sx={{ my: 3 }} />

      <PedidoForm productores={productores} />
      <PedidosList pedidos={pedidos} />
    </Container>
  );
}

export default App;
