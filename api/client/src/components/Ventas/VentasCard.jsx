// VentasCard.jsx
import React from "react";
import { Image } from "antd";

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });

const VentasCard = ({ venta, onEdit, onDelete }) => {
  const {
    id_venta,
    fecha_realizada,
    precio_total,
    nombre_cliente,
    apellido_cliente,
    foto,
    foto_url,          // por si lo tenés disponible
    comentarios,
    cliente_display,
    cliente_eliminado, // boolean opcional
  } = venta || {};

  const imgSrc =
    foto_url || (foto ? `/images/ventas/${encodeURIComponent(foto)}` : null);

  const displayName =
    cliente_display ||
    [nombre_cliente, apellido_cliente].filter(Boolean).join(" ") ||
    "—";

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
          Venta #{id_venta}
        </h3>

        {/* Etiqueta de cliente eliminado si aplica */}
        {cliente_eliminado && (
          <span
            className="
              absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
              rounded-full ring-1 shadow-sm bg-red-50 text-red-700 ring-red-200
            "
            title="El cliente asociado fue eliminado"
          >
            ELIMINADO
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Imagen (antd) */}
        {imgSrc && (
          <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
            <Image
              src={imgSrc}
              alt={`Venta ${id_venta}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
              loading="lazy"
              fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
              preview={{
                mask: <span style={{ fontSize: 12 }}>Click para ampliar</span>,
              }}
            />
          </div>
        )}

        {/* Chips info */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`${chipBase} bg-emerald-50 text-emerald-700 ring-emerald-200`}
            title="Importe total"
          >
            <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
            {formatMoney(precio_total)}
          </span>

          <span
            className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}
            title="Fecha realizada"
          >
            <span className="inline-block size-2.5 rounded-full bg-slate-400" />
            {fecha_realizada ? formatDate(fecha_realizada) : "Sin fecha"}
          </span>

          <span
            className={`${chipBase} bg-amber-50 text-amber-700 ring-amber-200`}
            title="Cliente"
          >
            <span className="inline-block size-2.5 rounded-full bg-amber-400" />
            <span className="truncate max-w-[50vw] sm:max-w-[220px]">
              {displayName}
            </span>
          </span>
        </div>

        {/* Comentarios */}
        {comentarios?.toString().trim() && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500 mb-1">Comentarios</p>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_venta)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-blue-600 text-white px-3 py-2 text-sm font-medium
              shadow-sm hover:bg-blue-700 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
            "
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(id_venta)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              px-3 py-2 text-sm font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-red-300
            "
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VentasCard;
