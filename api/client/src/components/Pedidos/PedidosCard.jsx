import React, { useMemo } from "react";
import PedidoPDFInline from "./PedidosPDF";

/**
 * ✅ Estados de entrega (VISUALES) - SOLO estos 3 en el select
 */
const ESTADOS_ENTREGA = [
  { value: "sin_entregas", label: "Sin entregas" },
  { value: "parcial", label: "Parcialmente entregado" },
  { value: "entregado", label: "Entregado" },
];

const estadoEntregaFromDB = (estadoDB) => {
  const e = String(estadoDB || "").toLowerCase();

  // En tu backend vamos a manejar:
  // - pendiente  => sin_entregas
  // - listo      => parcial
  // - entregado  => entregado
  // - cancelado  => se muestra aparte (sin tocar select)
  if (e === "entregado") return "entregado";
  if (e === "listo") return "parcial";
  return "sin_entregas";
};

const pillByEntrega = (entregaKey) => {
  switch (entregaKey) {
    case "sin_entregas":
      return "bg-slate-50 text-slate-700 ring-slate-200";
    case "parcial":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
};

const selectClassesByEntrega = (entregaKey) => {
  switch (entregaKey) {
    case "sin_entregas":
      return "bg-slate-50 text-slate-900 border-slate-200";
    case "parcial":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    default:
      return "bg-white text-gray-900 border-gray-300";
  }
};

const chipBase = "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const formatDate = (value) => {
  if (!value) return "";
  const s = String(value).trim();

  // "YYYY-MM-DD" o "YYYY-MM-DDT..." o "YYYY-MM-DD HH:mm:ss"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const PedidosCard = ({ pedido, onEdit, onDelete }) => {
  const {
    id_pedido,
    fecha_realizado,
    fecha_de_entrega,
    comentarios,
    cliente_display,
    items = [],
    estado: estadoDB,
  } = pedido || {};

  const entregaKey = useMemo(() => estadoEntregaFromDB(estadoDB), [estadoDB]);

  const entregaLabel = useMemo(() => {
    const found = ESTADOS_ENTREGA.find((x) => x.value === entregaKey);
    return found?.label || "Sin entregas";
  }, [entregaKey]);

  const pillClass = useMemo(() => pillByEntrega(entregaKey), [entregaKey]);

  // Cancelado: no entra en el select (requisito: solo 3 estados)
  const isCancelado = String(estadoDB || "").toLowerCase() === "cancelado";

  // Resumen rápido de items (solo total)
  const totalPallets = useMemo(() => {
    let total = 0;
    (items || []).forEach((it) => {
      total += Number(it.cantidad_pallets || 0);
    });
    return total;
  }, [items]);

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg flex flex-col
      "
    >
      {/* Cabecera */}
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

        <div className="absolute top-3 right-3 flex items-center gap-2">
          <PedidoPDFInline pedido={pedido} />

          {/* Pill de estado (visual) */}
          {isCancelado ? (
            <span
              className="px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 shadow-sm bg-red-50 text-red-700 ring-red-200"
              title="Cancelado"
            >
              Cancelado
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 shadow-sm ${pillClass}`}
              title={entregaLabel}
            >
              {entregaLabel}
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Cliente */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <span
            className={`${chipBase} bg-amber-50 text-amber-700 ring-amber-200`}
            title={cliente_display || "Cliente sin nombre"}
          >
            <span className="inline-block size-2.5 rounded-full bg-amber-400" />
            {cliente_display || "Cliente sin nombre"}
          </span>

          {totalPallets > 0 && (
            <span className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`} title="Total pedido">
              <span className="inline-block size-2 rounded-full bg-slate-400" />
              Total: {totalPallets} u.
            </span>
          )}
        </div>

        {/* Fechas */}
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
                      {it.medidas ? ` — ${it.medidas}` : ""}{" "}
                      <span className="text-xs text-slate-600">({Number(it.cantidad_pallets || 0)} u.)</span>
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

        {/* Footer: estado (no editable) + acciones */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-700">Estado:</label>

            {isCancelado ? (
              <input
                value="Cancelado"
                disabled
                className="text-sm border rounded px-2 py-1 bg-red-50 text-red-900 border-red-200 cursor-not-allowed"
                title="Pedido cancelado"
                readOnly
              />
            ) : (
              <select
                className={`text-sm border rounded px-2 py-1 transition cursor-not-allowed ${selectClassesByEntrega(
                  entregaKey
                )}`}
                value={entregaKey}
                disabled
                title="El estado se gestiona automáticamente por entregas"
              >
                {ESTADOS_ENTREGA.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(id_pedido)}
              className="
                px-3 py-2 text-sm bg-blue-600 text-white rounded
                hover:bg-blue-700 transition disabled:opacity-60
              "
              title="Editar"
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
