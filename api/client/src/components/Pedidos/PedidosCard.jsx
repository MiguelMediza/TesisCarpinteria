// PedidosCard.jsx
import React, { useContext, useMemo, useState } from "react";
import { api } from "../../api";
import { AuthContext } from "../../context/authContext";
import PedidoPDFInline from "./PedidosPDF";

const ESTADOS = ["pendiente", "en_produccion", "listo", "entregado", "cancelado"];

const pillByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-800 ring-yellow-200";
    case "en_produccion":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "listo":
      return "bg-indigo-50 text-indigo-800 ring-indigo-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "cancelado":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
};

const selectClassesByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-900 border-yellow-200";
    case "en_produccion":
      return "bg-blue-50 text-blue-900 border-blue-200";
    case "listo":
      return "bg-indigo-50 text-indigo-900 border-indigo-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "cancelado":
      return "bg-red-50 text-red-900 border-red-200";
    default:
      return "bg-white text-gray-900 border-gray-300";
  }
};

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatMoney = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

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
  } = pedido || {};

  const [estado, setEstado] = useState(pedido?.estado || "pendiente");
  const [changing, setChanging] = useState(false);
  const estadoPill = useMemo(() => pillByEstado(estado), [estado]);

  const handleEstadoChange = async (e) => {
    const nuevo = e.target.value;
    if (nuevo === estado) return;

    const anterior = estado;
    setEstado(nuevo);
    setChanging(true);

    try {
      await api.put(`/pedidos/${id_pedido}/estado`, { estado: nuevo });
      onEstadoChanged?.(id_pedido, nuevo);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      setEstado(anterior);

      const msg = err?.response?.data?.message || "No se pudo actualizar el estado del pedido.";
      const falt = err?.response?.data?.faltantes;
      if (err?.response?.status === 409 && Array.isArray(falt) && falt.length) {
        const detalle = falt
          .map(
            (f) =>
              `• ${f.categoria} #${f.id_item}: requiere ${f.requerido}, disponible ${f.disponible}${
                f.motivo ? ` (${f.motivo})` : ""
              }`
          )
          .join("\n");
        alert(`${msg}\n\n${detalle}`);
      } else {
        alert(msg);
      }
    } finally {
      setChanging(false);
    }
  };

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg flex flex-col
      "
    >
      {/* Header con degradado y título centrado */}
      <div className="relative h-20 w-full bg-gradient-to-r from-sky-50 to-indigo-50">
        <h3
          className="
            absolute inset-0 flex items-center justify-center
            px-4 text-center text-base font-semibold text-slate-900
            leading-tight line-clamp-2
          "
        >
          Pedido #{id_pedido}
        </h3>

        {/* Acciones del header (PDF + estado) */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Botón/acción PDF inline (tu componente) */}
          <PedidoPDFInline pedido={pedido} />

          <span
            className={`px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 shadow-sm ${estadoPill}`}
            title={`Estado: ${estado.replace("_", " ")}`}
          >
            {estado.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Chip de cliente */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <span
            className={`${chipBase} bg-amber-50 text-amber-700 ring-amber-200`}
            title={cliente_display || "Cliente sin nombre"}
          >
            <span className="inline-block size-2.5 rounded-full bg-amber-400" />
            {cliente_display || "Cliente sin nombre"}
          </span>
        </div>

        {/* Fechas en cards suaves */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Fecha realizado</p>
            <p className="text-sm font-medium text-slate-800">
              {fecha_realizado ? formatDate(fecha_realizado) : "No especificada"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Fecha de entrega fijada</p>
            <p className="text-sm font-medium text-slate-800">
              {fecha_de_entrega ? formatDate(fecha_de_entrega) : "No especificada"}
            </p>
          </div>
        </div>

        {/* Comentarios */}
        {comentarios?.toString().trim() && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500 mb-1">Comentarios</p>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </div>
        )}

        {/* Ítems */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-[12px] text-slate-500 mb-2">🧱 Ítems del pedido</p>
          <ul className="list-disc pl-5 text-sm text-slate-800 space-y-2">
            {items.length > 0 ? (
              items.map((it, idx) => (
                <li key={idx}>
                  <div className="flex flex-col">
                    <div>
                      <span className="font-medium">
                        {it.prototipo_titulo || `Prototipo #${it.id_prototipo}`}
                      </span>
                      {it.medidas ? ` — ${it.medidas}` : ""} — {it.cantidad_pallets} u.
                    </div>
                    {(it.numero_lote?.trim() || it.numero_tratamiento?.trim()) && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {it.numero_lote?.trim() && (
                          <span
                            className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}
                            title={`Lote: ${it.numero_lote}`}
                          >
                            <span className="inline-block size-2.5 rounded-full bg-slate-400" />
                            Lote: {it.numero_lote}
                          </span>
                        )}
                        {it.numero_tratamiento?.trim() && (
                          <span
                            className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}
                            title={`Tratamiento: ${it.numero_tratamiento}`}
                          >
                            <span className="inline-block size-2.5 rounded-full bg-slate-400" />
                            Trat.: {it.numero_tratamiento}
                          </span>
                        )}
                      </div>
                    )}
                    {(it.comentarios ?? "").toString().trim() && (
                      <p className="mt-1 text-xs text-slate-600 italic">{it.comentarios}</p>
                    )}
                  </div>
                </li>
              ))
            ) : (
              <li className="text-slate-600">No hay ítems cargados</li>
            )}
          </ul>
        </div>

        {/* Precio (solo admin) */}
        {currentUser?.tipo === "admin" && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">Precio total (materiales actuales)</p>
            <p className="text-base font-semibold text-slate-900">{formatMoney(precio_total)}</p>
          </div>
        )}

        {/* Footer: selector de estado + acciones */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">Estado:</label>
            <select
              className={`text-sm border rounded px-2 py-1 transition ${selectClassesByEstado(
                estado
              )}`}
              value={estado}
              onChange={handleEstadoChange}
              disabled={changing}
              title="Cambiar estado"
            >
              {ESTADOS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "pendiente"
                    ? "⏳"
                    : opt === "en_produccion"
                    ? "🛠️"
                    : opt === "listo"
                    ? "📦"
                    : opt === "entregado"
                    ? "✅"
                    : opt === "cancelado"
                    ? "❌"
                    : "•"}{" "}
                  {opt.replace("_", " ")}
                </option>
              ))}
            </select>
            {changing && <span className="text-xs text-slate-500">Guardando…</span>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(id_pedido)}
              className="
                px-3 py-2 text-sm bg-blue-600 text-white rounded
                hover:bg-blue-700 transition disabled:opacity-60
              "
              title="Editar"
              disabled={changing}
            >
              Editar
            </button>

            <button
              onClick={() => onDelete?.(id_pedido)}
              className="
                px-3 py-2 text-sm bg-red-50 text-red-700 ring-1 ring-red-200 rounded
                hover:bg-red-100 transition disabled:opacity-60
              "
              title="Eliminar"
              disabled={changing}
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedidosCard;
