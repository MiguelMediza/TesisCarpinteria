import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import PedidosCard from "./PedidosCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const ESTADOS = ["pendiente","en_produccion","listo","entregado","cancelado"];

const PedidosList = () => {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [idCliente, setIdCliente] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const [toDelete, setToDelete] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/clientes/listar");
        setClientes(data || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const fetchPedidos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (q) params.append("q", q);
      if (estado) params.append("estado", estado);
      if (idCliente) params.append("id_cliente", idCliente);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const url = `/pedidos/listarfull${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await api.get(url);
      setPedidos(res.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los pedidos.");
    }
  }, [q, estado, idCliente, desde, hasta]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleEdit = (id) => {
    navigate(`/pedidos/${id}`);
  };

  const handleDeleteClick = (pedido) => setToDelete(pedido);
  const cancelDelete = () => setToDelete(null);

  const confirmDelete = async () => {
    try {
      await api.delete(`/pedidos/${toDelete.id_pedido}`);
      setPedidos(prev => prev.filter(p => p.id_pedido !== toDelete.id_pedido));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el pedido.");
    } finally {
      setToDelete(null);
    }
  };


  const handleChangeStatus = async (id_pedido, newStatus) => {
    try {
      setPedidos(curr => curr.map(p => p.id_pedido === id_pedido ? { ...p, estado: newStatus } : p));
      await api.put(`/pedidos/${id_pedido}/estado`, { estado: newStatus });
    } catch (e) {
      console.error(e);
      setError("No se pudo cambiar el estado del pedido.");
      fetchPedidos();
    }
  };

  const resetFiltros = () => {
    setQ("");
    setEstado("");
    setIdCliente("");
    setDesde("");
    setHasta("");
  };

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <Link
          to="/pedidos"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nuevo Pedido
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">

        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="md:col-span-2 p-2 border border-gray-300 rounded"
        >
          <option value="">Estado (todos)</option>
          {ESTADOS.map(es => <option key={es} value={es}>{es.replace("_"," ")}</option>)}
        </select>

        <select
          value={idCliente}
          onChange={(e) => setIdCliente(e.target.value)}
          className="md:col-span-3 p-2 border border-gray-300 rounded"
        >
          <option value="">Cliente (todos)</option>
          {clientes.map(c => (
            <option key={c.id_cliente} value={c.id_cliente}>
              {c.es_empresa ? c.nombre_empresa : `${c.nombre} ${c.apellido || ""}`}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="md:col-span-2 p-2 border border-gray-300 rounded"
          placeholder="Desde"
        />
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="md:col-span-2 p-2 border border-gray-300 rounded"
          placeholder="Hasta"
        />

        <div className="md:col-span-12 flex gap-2">

          <button
            onClick={() => { resetFiltros(); setTimeout(fetchPedidos, 0); }}
            className="px-4 py-2 bg-neutral-200 text-neutral-800 rounded hover:bg-neutral-300 transition"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {pedidos.map((p) => (
          <PedidosCard
            key={p.id_pedido}
            pedido={p}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(p)}
            onChangeStatus={handleChangeStatus}
          />
        ))}
        {pedidos.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron pedidos.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={`Pedido #${toDelete?.id_pedido}`}
        imageSrc={null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PedidosList;
