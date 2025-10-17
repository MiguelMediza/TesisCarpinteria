
import React from "react";

const badge = "bg-sky-50 text-sky-700 ring-sky-200";
const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const getInitials = (nombre = "", empresa = "") => {
  const base = (nombre || empresa || "P").trim();
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");
};

const ProveedorCard = ({ proveedor, onEdit, onDelete }) => {
  const {
    id_proveedor,
    rut,
    nombre,
    nombre_empresa,
    telefono,
    correo_electronico,
    comentarios,
  } = proveedor || {};

  const initials = getInitials(nombre, nombre_empresa);

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col
      "
    >
      <div className="relative">
        <div className="h-16 w-full bg-gradient-to-r from-sky-50 to-indigo-50" />
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
            rounded-full ring-1 shadow-sm ${badge}
          `}
        >
          Proveedor
        </div>
      </div>

      <div className="p-4 pt-6 flex flex-col">
        <h3 className="text-base font-semibold text-slate-900 leading-snug pr-16">
          {nombre_empresa || nombre || "Proveedor"}
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={telefono ? `tel:${telefono}` : undefined}
            onClick={(e) => !telefono && e.preventDefault()}
            className={`${chipBase} ${
              telefono ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"
            }`}
            title={telefono || "Sin teléfono"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.23 11.7 11.7 0 003.7.6 1 1 0 011 1v3.6a1 1 0 01-1 1A18.9 18.9 0 013 5a1 1 0 011-1h3.6a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.23 1.1l-2.37 2z" />
            </svg>
            <span className="truncate max-w-[52vw] sm:max-w-[240px]">
              {telefono || "Sin teléfono"}
            </span>
          </a>

          <a
            href={correo_electronico ? `mailto:${correo_electronico}` : undefined}
            onClick={(e) => !correo_electronico && e.preventDefault()}
            className={`${chipBase} ${
              correo_electronico ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-50 text-slate-500 ring-slate-200"
            }`}
            title={correo_electronico || "Sin email"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16a2 2 0 012 2v.4l-10 5.6L2 8.4V8a2 2 0 012-2zm18 4.2V16a2 2 0 01-2 2H4a2 2 0 01-2-2v-5.8l10 5.6 10-5.6z" />
            </svg>
            <span className="truncate max-w-[52vw] sm:max-w-[240px]">
              {correo_electronico || "Sin email"}
            </span>
          </a>

          {rut && (
            <span
              className={`${chipBase} bg-amber-50 text-amber-700 ring-amber-200`}
              title={`RUT: ${rut}`}
            >
              <span className="inline-block size-2.5 rounded-full bg-amber-400" />
              RUT: <span className="font-medium">{rut}</span>
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nombre && (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-[12px] text-slate-500">Nombre</p>
              <p className="text-sm text-slate-800">{nombre}</p>
            </div>
          )}

          {nombre_empresa && (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-[12px] text-slate-500">Empresa</p>
              <p className="text-sm text-slate-800">{nombre_empresa}</p>
            </div>
          )}
        </div>

        {comentarios && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500">Comentarios</p>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_proveedor)}
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
            onClick={() => onDelete?.(id_proveedor)}
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

export default ProveedorCard;
