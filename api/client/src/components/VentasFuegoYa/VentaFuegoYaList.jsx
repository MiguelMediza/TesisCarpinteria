import React, { useEffect, useState, useCallback } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import VentaFuegoyaCard from "./VentaFuegoYaCard";  // <- tu card de fuegoya
import DeleteConfirm from "../Modals/DeleteConfirm";

const PAGO_ESTADOS = ["", "credito", "pago"]; // "" = todos

const VentaFuegoyaList = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError] = useState("");

  // Filtros
  const [clienteQ, setClienteQ] = useState(""); // texto libre (nombre/empresa)
  const [estadopago, setEstadopago] = useState(""); // "", "credito", "pago"
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // UI eliminar
  const [toDelete, setToDelete] = useState(null);

  const navigate = useNavigate();

  const fetchVentas = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (clienteQ.trim()) params.append("cliente", clienteQ.trim());
      if (estadopago) params.append("estadopago", estadopago);
      if (desde) params.append("desde", desde);
      if (hasta) params.append("hasta", hasta);

      const url = `/ventafuegoya/listar${
        params.toString() ? `?${params.toString()}` : ""
      }`;
      const { data } = await api.get(url);
      setVentas(data || []);
      setError("");
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las ventas.");
    }
  }, [clienteQ, estadopago, desde, hasta]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleEdit = (id) => {
    navigate(`/ventafuegoya/${id}`);
  };

  const handleDeleteClick = (venta) => setToDelete(venta);
  const cancelDelete = () => setToDelete(null);

  const confirmDelete = async () => {
    try {
      await api.delete(
        `/ventafuegoya/${toDelete.id_ventaFuegoya}`
      );
      setVentas((prev) =>
        prev.filter((v) => v.id_ventaFuegoya !== toDelete.id_ventaFuegoya)
      );
    } catch (err) {
      console.error(err);
      setError("Error al eliminar la venta.");
    } finally {
      setToDelete(null);
    }
  };

  // Cuando el Card cambie el estado de pago, refrescamos
  const handlePagoChanged = () => fetchVentas();

  const resetFiltros = () => {
    setClienteQ("");
    setEstadopago("");
    setDesde("");
    setHasta("");
  };

  return (
    <section className="p-4 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ventas FuegoYa</h1>
        <Link
          to="/ventafuegoya"
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          + Nueva Venta
        </Link>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <input
          type="text"
          value={clienteQ}
          onChange={(e) => setClienteQ(e.target.value)}
          className="md:col-span-4 p-2 border border-gray-300 rounded"
          placeholder="Buscar por cliente (nombre/empresa)"
        />

        <select
          value={estadopago}
          onChange={(e) => setEstadopago(e.target.value)}
          className="md:col-span-3 p-2 border border-gray-300 rounded"
        >
          {PAGO_ESTADOS.map((opt) => (
            <option key={opt || "all"} value={opt}>
              {opt === ""
                ? "Estado de pago (todos)"
                : opt === "pago"
                ? "Pagado"
                : "Crédito / sin pagar"}
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
            onClick={() => fetchVentas()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Aplicar filtros
          </button>
          <button
            onClick={() => {
              resetFiltros();
              setTimeout(fetchVentas, 0);
            }}
            className="px-4 py-2 bg-neutral-200 text-neutral-800 rounded hover:bg-neutral-300 transition"
          >
            Limpiar
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-red-500">{error}</p>}

      {/* Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {ventas.map((v) => (
          <VentaFuegoyaCard
            key={v.id_ventaFuegoya}
            venta={v}
            onEdit={handleEdit}
            onDelete={() => handleDeleteClick(v)}
            onPagoChanged={handlePagoChanged} // refresca al cambiar pago
          />
        ))}
        {ventas.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            No se encontraron ventas.
          </p>
        )}
      </div>

      <DeleteConfirm
        isOpen={!!toDelete}
        title={`Venta #${toDelete?.id_ventaFuegoya}`}
        imageSrc={null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default VentaFuegoyaList;
