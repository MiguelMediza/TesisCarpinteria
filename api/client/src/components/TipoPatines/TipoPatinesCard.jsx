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

const TipoPatinesCard = ({ tipoPatin, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const {
    id_tipo_patin,
    titulo,
    medidas,
    precio_unidad,
    stock,
    logo,
    logo_url,
    tabla_padre,
    taco_padre,
    comentarios,
  } = tipoPatin || {};

  const R2 = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  const key = String(logo || "").replace(/^\/+/, "");
  const imageUrl = logo_url || (key ? `${R2}/${key}` : null);

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
        flex flex-col
      "
    >
      {/* Imagen (antd) */}
      {imageUrl ? (
        <div className="relative h-36 w-full overflow-hidden bg-white">
          <Image
            src={imageUrl}
            alt={titulo || "Tipo de patín"}
            preview={{ mask: "Ver" }}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            rootClassName="!block"
            className="transition-transform duration-300 group-hover:scale-[1.02]"
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
          {titulo || "Tipo de patín"}
        </h3>

        <div className="mt-2 flex flex-wrap gap-2">
          <span
            className="
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] bg-sky-50 text-sky-700 ring-1 ring-sky-200
            "
            title={tabla_padre || "N/A"}
          >
            <span className="inline-block size-2.5 rounded-full bg-sky-400" />
            Tabla: <span className="font-medium">{tabla_padre || "N/A"}</span>
          </span>
          <span
            className="
              inline-flex items-center gap-2 rounded-full px-2.5 py-1
              text-[12px] bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200
            "
            title={taco_padre || "N/A"}
          >
            <span className="inline-block size-2.5 rounded-full bg-emerald-400" />
            Taco: <span className="font-medium">{taco_padre || "N/A"}</span>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Medidas</p>
            <p className="text-sm font-medium text-slate-800">{medidas || "—"}</p>
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-[12px] text-slate-500">Precio unitario</p>
              <p className="text-sm text-slate-800">
                {precio_unidad != null ? moneyUYU(precio_unidad) : "—"}
              </p>
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
            onClick={() => onEdit?.(id_tipo_patin)}
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
            onClick={() => onDelete?.(id_tipo_patin)}
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

export default TipoPatinesCard;
