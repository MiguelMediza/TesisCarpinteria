import React from "react";

const badgeByTipo = (esEmpresa) =>
  esEmpresa
    ? "bg-violet-50 text-violet-700 ring-violet-200"
    : "bg-slate-50 text-slate-700 ring-slate-200";

const getInitials = (nombre = "", apellido = "", nombreEmpresa = "") => {
  const base = (nombre + " " + apellido).trim() || nombreEmpresa || "C";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
};

const ClientesCard = ({ cliente, onEdit, onDelete }) => {
  const {
    id_cliente,
    nombre,
    apellido,
    telefono,
    email,
    es_empresa,
    nombre_empresa,
    direccion_empresa,
    email_empresa,
  } = cliente || {};

  const initials = getInitials(nombre, apellido, nombre_empresa);

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-900/5
        shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col min-h-[260px]
      "
    >
      {/* Header */}
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
            rounded-full ring-1 shadow-sm ${badgeByTipo(!!es_empresa)}
          `}
        >
          {es_empresa ? "Empresa" : "Particular"}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 p-4 pt-6 flex flex-col">{/* ← clave: flex flex-col */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug pr-14">
          {(nombre || "") + (apellido ? ` ${apellido}` : "") || nombre_empresa || "Cliente"}
        </h3>

        {/* Chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={telefono ? `tel:${telefono}` : undefined}
            onClick={(e) => !telefono && e.preventDefault()}
            className={`
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] ring-1 ring-slate-200
              ${telefono ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-500"}
            `}
            title={telefono || "No especificado"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011.1-.23 11.7 11.7 0 003.7.6 1 1 0 011 1v3.6a1 1 0 01-1 1A18.9 18.9 0 013 5a1 1 0 011-1h3.6a1 1 0 011 1 11.7 11.7 0 00.6 3.7 1 1 0 01-.23 1.1l-2.37 2z" />
            </svg>
            <span className="truncate max-w-[50vw] sm:max-w-[220px]">
              {telefono || "Sin teléfono"}
            </span>
          </a>

          <a
            href={email ? `mailto:${email}` : undefined}
            onClick={(e) => !email && e.preventDefault()}
            className={`
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] ring-1 ring-slate-200
              ${email ? "bg-blue-50 text-blue-700" : "bg-slate-50 text-slate-500"}
            `}
            title={email || "No especificado"}
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h16a2 2 0 012 2v.4l-10 5.6L2 8.4V8a2 2 0 012-2zm18 4.2V16a2 2 0 01-2 2H4a2 2 0 01-2-2v-5.8l10 5.6 10-5.6z" />
            </svg>
            <span className="truncate max-w-[50vw] sm:max-w-[220px]">
              {email || "Sin email"}
            </span>
          </a>
        </div>

        {/* Empresa: evita que React pinte 0 */}
        {Boolean(es_empresa) && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            {nombre_empresa && (
              <div className="mb-1">
                <p className="text-[12px] text-slate-500">Empresa</p>
                <p className="text-sm font-medium text-slate-800">{nombre_empresa}</p>
              </div>
            )}
            {direccion_empresa && (
              <div className="mb-1">
                <p className="text-[12px] text-slate-500">Dirección</p>
                <p className="text-sm text-slate-800 line-clamp-2">{direccion_empresa}</p>
              </div>
            )}
            {email_empresa && (
              <div className="mt-1">
                <p className="text-[12px] text-slate-500">Email empresa</p>
                <p className="text-sm text-slate-800">{email_empresa}</p>
              </div>
            )}
          </div>
        )}

        {/* Acciones siempre al fondo */}
        <div className="mt-auto pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_cliente)}
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
            onClick={() => onDelete?.(id_cliente)}
            className="
              flex-1 inline-flex items-center justify-center rounded-lg
              bg-red-50 text-red-700 ring-1 ring-red-200
              px-3 py-2 text-sm font-medium hover:bg-red-100
              focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300
            "
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientesCard;
