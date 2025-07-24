import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

const socket = io('/api'); 

function App() {
  const [productores, setProductores] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [nuevoPedido, setNuevoPedido] = useState({ nombre: '', productor_id: '' });
  const [nuevoProductor, setNuevoProductor] = useState({ id: '', nombre: '' });

  // Cargar productores y pedidos al iniciar
  useEffect(() => {
    fetch('/api/productores')
      .then((res) => res.json())
      .then(setProductores);
    fetch('/api/pedidos')
      .then((res) => res.json())
      .then(setPedidos);
  }, []);

  // Escuchar nuevos pedidos via websocket
  useEffect(() => {
    socket.on('nuevo_pedido', (pedido) => {
      setPedidos((prev) => [...prev, pedido]);
    });
    return () => socket.off('nuevo_pedido');
  }, []);

  const crearProductor = async () => {
    const res = await fetch('/api/productores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoProductor),
    });
    if (res.ok) {
      setProductores([...productores, nuevoProductor]);
      setNuevoProductor({ id: '', nombre: '' });
    }
  };

  const crearPedido = async () => {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoPedido),
    });
    if (res.ok) {
      setNuevoPedido({ nombre: '', productor_id: '' });
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Productores</h2>
      <input
        placeholder="ID productor"
        value={nuevoProductor.id}
        onChange={(e) => setNuevoProductor({ ...nuevoProductor, id: e.target.value })}
      />
      <input
        placeholder="Nombre productor"
        value={nuevoProductor.nombre}
        onChange={(e) => setNuevoProductor({ ...nuevoProductor, nombre: e.target.value })}
      />
      <button onClick={crearProductor}>Agregar Productor</button>

      <ul>
        {productores.map((p) => (
          <li key={p.id}>{p.id}: {p.nombre}</li>
        ))}
      </ul>

      <h2>Pedidos</h2>
      <input
        placeholder="Nombre pedido"
        value={nuevoPedido.nombre}
        onChange={(e) => setNuevoPedido({ ...nuevoPedido, nombre: e.target.value })}
      />
      <select
        value={nuevoPedido.productor_id}
        onChange={(e) => setNuevoPedido({ ...nuevoPedido, productor_id: e.target.value })}
      >
        <option value="">Selecciona productor</option>
        {productores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <button onClick={crearPedido}>Crear Pedido</button>

      <ul>
        {pedidos.map((pedido) => (
          <li key={pedido.id}>
            {pedido.id}: {pedido.nombre} (Productor: {pedido.productor_id})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
