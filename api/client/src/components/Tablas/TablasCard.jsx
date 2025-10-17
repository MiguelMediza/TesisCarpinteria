import React, { useContext } from "react";
import { Image } from "antd";
import { AuthContext } from "../../context/authContext";

const moneyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", { style: "currency", currency: "UYU" });

const colorByStock = (stock) => {
  const n = Number(stock ?? 0);
  if (n < 100) return "bg-red-50 text-red-700 ring-red-200";
  if (n < 250) return "bg-yellow-50 text-yellow-800 ring-yellow-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
};

const TablaCard = ({ tabla, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const {
    id_materia_prima,
    titulo,
    precio_unidad,
    stock,
    foto_url,
    comentarios,
    largo_cm,
    ancho_cm,
    espesor_mm,
    tipo_madera,
    cepilladas,
  } = tabla || {};

  const dimensiones =
    [largo_cm, ancho_cm, espesor_mm].every((v) => v != null)
      ? `${largo_cm} × ${ancho_cm} × ${espesor_mm} cm`
      : "—";

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col
      "
    >
      {foto_url ? (
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={foto_url}
            alt={titulo || "Tabla"}
            preview={{ mask: "Ver" }}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            rootClassName="!block"
            className="!w-full !h-full !object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : (
        <div className="h-36 w-full bg-gradient-to-b from-slate-100 to-slate-50 flex items-center justify-center">
          <div className="text-slate-400 text-sm select-none">Sin imagen</div>
        </div>
      )}

      <div
        className={`
          absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
          rounded-full ring-1 shadow-sm ${colorByStock(stock)}
        `}
        title="Stock disponible"
      >
        Stock: {Number(stock ?? 0)}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
          {titulo || "Tabla"}
        </h3>

        <p className="mt-1 text-[12px] text-slate-500">
          {[tipo_madera, cepilladas != null ? (cepilladas ? "Cepilladas" : "Sin cepillar") : null]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Dimensiones</p>
            <p className="text-sm font-medium text-slate-800">{dimensiones}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Tipo de madera</p>
            <p className="text-sm font-medium text-slate-800">
              {tipo_madera || "—"}
            </p>
          </div>

          {isAdmin && (
            <div className="col-span-2">
              <div
                className="
                  inline-flex items-center gap-2 rounded-full
                  bg-blue-50 text-blue-700 ring-1 ring-blue-200
                  px-2.5 py-1 text-[12px] font-medium
                "
                title="Precio unitario"
              >
                <span className="inline-block size-2.5 rounded-full bg-blue-400" />
                {precio_unidad != null ? `${moneyUYU(precio_unidad)} / unid.` : "—"}
              </div>
            </div>
          )}
        </div>

        {/* Comentarios */}
        {comentarios && comentarios.trim() && (
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500">Comentarios</p>
            <p className="text-sm text-slate-800">{comentarios}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_materia_prima)}
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
            onClick={() => onDelete?.(id_materia_prima)}
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

export default TablaCard;
