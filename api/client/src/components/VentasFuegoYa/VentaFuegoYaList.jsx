import React, { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import VentaFuegoyaCard from "./VentaFuegoYaCard";
import DeleteConfirm from "../Modals/DeleteConfirm";

const PAGO_ESTADOS = ["", "credito", "pago"]; 

const monthNames = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

const yyyymmFirst = (y, m) => `${y}-${String(m).padStart(2,"0")}-01`;
const yyyymmLast  = (y, m) => {
  const last = new Date(Number(y), Number(m), 0); 
  const yyyy = last.getFullYear();
  const mm   = String(last.getMonth()+1).padStart(2,"0");
  const dd   = String(last.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
};

const VentaFuegoYaList = () => {
  const [ventas, setVentas] = useState([]);
  const [error, setError]   = useState("");

  const [clienteQ, setClienteQ]     = useState(""); 
  const [estadopago, setEstadopago] = useState(""); 

  const now = useMemo(() => new Date(), []);
  const [anio, setAnio]   = useState(String(now.getFullYear()));
  const [mes, setMes]     = useState(String(now.getMonth() + 1)); 

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    const arr = [];
    for (let i = y - 5; i <= y + 1; i++) arr.push(i);
    return arr;
  }, [now]);

  const [toDelete, setToDelete] = useState(null);

  const navigate = useNavigate();

  const fetchVentas = useCallback(async () => {
    try {
      const params = new URLSearchParams();

      if (clienteQ.trim()) params.append("cliente", clienteQ.trim());
      if (estadopago)      params.append("estadopago", estadopago);

      if (anio && mes) {
        const desde = yyyymmFirst(anio, mes);
        const hasta = yyyymmLast(anio, mes);
        params.append("desde", desde);
        params.append("hasta", hasta);
      }

      const url = `/ventafuegoya/listar${params.toString() ? `?${params.toString()}` : ""}`;
      const { data } = await api.get(url);
      setVentas(data || []);
      setError("");
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las ventas.");
    }
  }, [clienteQ, estadopago, anio, mes]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleEdit = (id) => navigate(`/ventafuegoya/${id}`);
  const handleDeleteClick = (venta) => setToDelete(venta);
  const cancelDelete = () => setToDelete(null);

  const confirmDelete = async () => {
    try {
      await api.delete(`/ventafuegoya/${toDelete.id_ventaFuegoya}`);
      setVentas(prev => prev.filter(v => v.id_ventaFuegoya !== toDelete.id_ventaFuegoya));
    } catch (err) {
      console.error(err);
      setError("Error al eliminar la venta.");
    } finally {
      setToDelete(null);
    }
  };

  const handlePagoChanged = () => fetchVentas();

  const resetFiltros = () => {
    setClienteQ("");
    setEstadopago("");
    setAnio(String(now.getFullYear()));
    setMes(String(now.getMonth() + 1));
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
        {/* Cliente */}
        <input
          type="text"
          value={clienteQ}
          onChange={(e) => setClienteQ(e.target.value)}
          className="md:col-span-4 p-2 border border-gray-300 rounded"
          placeholder="Buscar por cliente (nombre)"
        />

        {/* Estado de pago */}
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

        {/* Mes */}
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="md:col-span-3 p-2 border border-gray-300 rounded"
        >
          {monthNames.map((n, idx) => {
            const mVal = String(idx + 1);
            return (
              <option key={mVal} value={mVal}>
                {n}
              </option>
            );
          })}
        </select>

        {/* Año */}
        <select
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          className="md:col-span-2 p-2 border border-gray-300 rounded"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

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
            Mes actual
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
            onPagoChanged={handlePagoChanged}
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
        imageSrc={toDelete?.foto_url || toDelete?.foto || null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default VentaFuegoYaList;
