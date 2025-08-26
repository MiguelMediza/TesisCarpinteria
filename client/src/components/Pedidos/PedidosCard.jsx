import React, { useContext, useMemo, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/authContext";

const ESTADOS = ["pendiente", "en_produccion", "listo", "entregado", "cancelado"];

const badgeClassesByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "en_produccion":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "listo":
      return "bg-indigo-100 text-indigo-800 border border-indigo-200";
    case "entregado":
      return "bg-green-100 text-green-800 border border-green-200";
    case "cancelado":
      return "bg-red-100 text-red-700 border border-red-200";
    default:
      return "bg-gray-100 text-gray-700 border border-gray-200";
  }
};

// coloriza el SELECT según el estado
const selectClassesByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-900 border-yellow-200";
    case "en_produccion":
      return "bg-blue-50 text-blue-900 border-blue-200";
    case "listo":
      return "bg-indigo-50 text-indigo-900 border-indigo-200";
    case "entregado":
      return "bg-green-50 text-green-900 border-green-200";
    case "cancelado":
      return "bg-red-50 text-red-900 border-red-200";
    default:
      return "bg-white text-gray-900 border-gray-300";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatMoney = (n) => {
  const num = Number(n ?? 0);
  return num.toLocaleString("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 2 });
};

/**
 * Props:
 *  - pedido: {
 *      id_pedido, estado, fecha_realizado, fecha_de_entrega, precio_total,
 *      comentarios, cliente_display, items?: [{ id_prototipo, prototipo_titulo, medidas, cantidad_pallets }]
 *    }
 *  - onEdit(id_pedido)
 *  - onDelete(id_pedido)
 *  - onEstadoChanged?(id_pedido, nuevoEstado)  // (opcional) callback luego de update OK
 */
const PedidosCard = ({ pedido, onEdit, onDelete, onEstadoChanged }) => {
  const { currentUser } = useContext(AuthContext);
  const {
    id_pedido,
    fecha_realizado,
    fecha_de_entrega,
    comentarios,
    precio_total,
    cliente_display,
    items = [],
  } = pedido;

  // estado local para mostrar cambios y spinner
  const [estado, setEstado] = useState(pedido.estado || "pendiente");
  const [changing, setChanging] = useState(false);
  const estadoClasses = useMemo(() => badgeClassesByEstado(estado), [estado]);

  const handleEstadoChange = async (e) => {
    const nuevo = e.target.value;
    if (nuevo === estado) return;

    // optimistic UI
    const anterior = estado;
    setEstado(nuevo);
    setChanging(true);

    try {
      await axios.put(`http://localhost:4000/api/src/pedidos/${id_pedido}/estado`, { estado: nuevo });
      if (onEstadoChanged) onEstadoChanged(id_pedido, nuevo);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      // rollback
      setEstado(anterior);
      alert("No se pudo actualizar el estado del pedido.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between w-full h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-lg font-semibold text-gray-800">Pedido #{id_pedido}</p>
            <p className="text-sm text-gray-600">{cliente_display || "Cliente sin nombre"}</p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded-full ${estadoClasses}`}
            title={`Estado: ${estado || "sin estado"}`}
          >
            {estado.replace("_", " ")}
          </span>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <div>
            <p className="text-sm text-gray-600">Fecha realizado:</p>
            <p className="text-gray-800">{fecha_realizado ? formatDate(fecha_realizado) : "No especificada"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fecha de entrega fijada:</p>
            <p className="text-gray-800">{fecha_de_entrega ? formatDate(fecha_de_entrega) : "No especificada"}</p>
          </div>
        </div>

        {/* Comentarios */}
        {comentarios && (
          <>
            <p className="text-sm text-gray-600">Comentarios:</p>
            <p className="mb-2 text-gray-800">{comentarios}</p>
          </>
        )}

{/* Ítems */}
<p className="text-sm font-semibold text-gray-700 mt-3">🧱 Ítems del pedido:</p>
<ul className="list-disc pl-5 text-gray-800">
  {items.length > 0 ? (
    items.map((it, idx) => (
      <li key={idx} className="mt-1">
        <span className="font-medium">
          {it.prototipo_titulo || `Prototipo #${it.id_prototipo}`}
        </span>
        {it.medidas ? ` – ${it.medidas}` : ""} — {it.cantidad_pallets} u.
        {/* Chips extra si hay datos */}
        <span className="ml-2 inline-flex gap-2 align-middle">
          {it.numero_lote?.trim() && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
              Lote: {it.numero_lote}
            </span>
          )}
          {it.numero_tratamiento?.trim() && (
            <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
              Trat.: {it.numero_tratamiento}
            </span>
          )}
        </span>
      </li>
    ))
  ) : (
    <li>No hay ítems cargados</li>
  )}
</ul>

        {/* Precio solo admin */}
        {currentUser?.tipo === "admin" && (
          <div className="mt-3">
            <p className="text-sm text-gray-600">Precio total (materiales actuales):</p>
            <p className="text-gray-900 font-semibold">{formatMoney(precio_total)}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
        {/* Cambiar estado (auto-guardado) */}
        <div className="flex items-center gap-2 sm:mr-auto">
          <label className="text-sm text-gray-700">Estado:</label>
          <select
            className={`text-sm border rounded px-2 py-1 transition ${selectClassesByEstado(estado)}`}
            value={estado}
            onChange={handleEstadoChange}
            disabled={changing}
            title="Cambiar estado"
          >
            {ESTADOS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "pendiente" ? "⏳" :
                 opt === "en_produccion" ? "🛠️" :
                 opt === "listo" ? "📦" :
                 opt === "entregado" ? "✅" :
                 opt === "cancelado" ? "❌" : "•"}{" "}
                {opt.replace("_", " ")}
              </option>
            ))}
          </select>
          {changing && <span className="text-xs text-gray-500">Guardando…</span>}
        </div>

        <button
          onClick={() => onEdit?.(id_pedido)}
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60"
          title="Editar"
          disabled={changing}
        >
          Editar
        </button>

        <button
          onClick={() => onDelete?.(id_pedido)}
          className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-60"
          title="Eliminar"
          disabled={changing}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default PedidosCard;
