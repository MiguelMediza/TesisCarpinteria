import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const pillByEstado = (estado) => {
  switch ((estado || "").toLowerCase()) {
    case "recibido":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "realizado":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
};

const getInitials = (empresa = "", id = "") => {
  const base = (empresa || "").trim() || `E${id || ""}`;
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const EncargosCard = ({
  encargo,
  onEdit,
  onDelete,
  onMarkReceived,
  marking = false,
}) => {
  const { currentUser } = useContext(AuthContext); // (por si lo necesitás luego)

  const {
    id_encargo,
    fecha_realizado,
    fecha_prevista_llegada,
    comentarios,
    nombre_empresa,
    estado,
    detalles = [],
  } = encargo || {};

  const initials = getInitials(nombre_empresa, id_encargo);

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/5
        shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col min-h-[280px]
      "
    >
      {/* Header con gradiente, avatar y pill de estado */}
      <div className="relative">
        <div className="h-16 w-full bg-gradient-to-r from-amber-50 to-sky-50" />
        <div
          className="
            absolute top-3 left-4 size-12 rounded-full
            bg-gradient-to-br from-sky-500 to-emerald-500 text-white
            grid place-items-center text-sm font-semibold ring-4 ring-white shadow-md
          "
        >
          {initials}
        </div>
        <div
          className={`
            absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
            rounded-full ring-1 shadow-sm ${pillByEstado(estado)}
          `}
          title={`Estado: ${estado || "Sin estado"}`}
        >
          {estado || "Sin estado"}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 pt-6 flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 leading-snug pr-14">
          Encargo #{id_encargo}
        </h3>

        {/* Proveedor + Fechas */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Proveedor</p>
            <p className="text-sm font-medium text-slate-800">
              {nombre_empresa || "Sin proveedor"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Fecha realizada</p>
            <p className="text-sm text-slate-800">
              {fecha_realizado ? formatDate(fecha_realizado) : "No especificada"}
            </p>
            <p className="mt-2 text-[12px] text-slate-500">
              Fecha prevista de llegada
            </p>
            <p className="text-sm text-slate-800">
              {fecha_prevista_llegada
                ? formatDate(fecha_prevista_llegada)
                : "No especificada"}
            </p>
          </div>
        </div>

        {/* Comentarios */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-[12px] text-slate-500">Comentarios</p>
          <p className="text-sm text-slate-800">
            {comentarios?.trim() || "Sin comentarios"}
          </p>
        </div>

        {/* Detalle de materias primas */}
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              📦 Materias primas incluidas
            </p>
            {Array.isArray(detalles) && detalles.length > 0 && (
              <span className="text-[11px] text-slate-500">
                {detalles.length} ítem{detalles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {Array.isArray(detalles) && detalles.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {detalles.map((item, idx) => (
                <li
                  key={idx}
                  className="
                    flex items-center justify-between gap-3
                    rounded-lg bg-white ring-1 ring-slate-200/60 px-3 py-2
                    hover:bg-slate-50 transition
                  "
                >
                  <span className="text-sm text-slate-800 truncate">
                    {item.titulo}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                    {item.cantidad} unid.
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              No hay materias primas cargadas.
            </p>
          )}
        </div>

        {/* Acciones (siempre al fondo) */}
        <div className="mt-auto pt-4 flex flex-col sm:flex-row gap-2">
          {estado === "realizado" && (
            <button
              type="button"
              onClick={() => onMarkReceived?.(id_encargo)}
              disabled={marking}
              className={`
                inline-flex items-center justify-center rounded-lg
                px-3 py-2 text-sm font-medium text-white
                shadow-sm focus:outline-none focus-visible:ring-2
                focus-visible:ring-emerald-400
                ${marking
                  ? "bg-emerald-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700"}
              `}
              title="Marcar como recibido"
            >
              {marking ? "Marcando…" : "Recibido"}
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit?.(id_encargo)}
            className="
              inline-flex flex-1 items-center justify-center rounded-lg
              bg-blue-600 text-white px-3 py-2 text-sm font-medium
              shadow-sm hover:bg-blue-700 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-400
            "
            title="Editar"
          >
            Editar
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(id_encargo)}
            className="
              inline-flex flex-1 items-center justify-center rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              px-3 py-2 text-sm font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2
              focus-visible:ring-red-300
            "
            title="Eliminar"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
 
export default EncargosCard;
