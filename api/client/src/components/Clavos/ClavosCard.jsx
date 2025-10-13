import React, { useContext } from "react";
import { Image } from "antd";
import { AuthContext } from "../../context/authContext";

const colorByStock = (stock) => {
  const n = Number(stock ?? 0);
  if (n < 100) return "bg-red-50 text-red-700 ring-red-200";
  if (n < 250) return "bg-yellow-50 text-yellow-800 ring-yellow-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
};

const moneyUYU = (n) =>
  Number(n ?? 0).toLocaleString("es-UY", { style: "currency", currency: "UYU" });

const ClavosCard = ({ clavo, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);

  const {
    id_materia_prima,
    titulo,
    precio_unidad,
    stock,
    foto,
    foto_url,
    comentarios,
    tipo,
    medidas,
    material,
  } = clavo || {};

  const imgSrc = foto_url || (foto ? `/images/clavos/${encodeURIComponent(foto)}` : null);

  return (
    <div
      className="
        group relative overflow-hidden rounded-2xl bg-white
        shadow-sm ring-1 ring-slate-900/5 transition
        hover:-translate-y-0.5 hover:shadow-lg
      "
    >
      {/* Imagen (antd) */}
      {imgSrc ? (
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={imgSrc}
            alt={titulo || "Clavos"}
            preview={{ mask: "Ver" }}
            // estilos para que se adapte como <img class="object-cover">
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

      {/* Pill de stock */}
      <div
        className={`absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 shadow-sm ${colorByStock(stock)}`}
        title="Stock disponible"
      >
        Stock: {Number(stock ?? 0)}
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900 leading-snug line-clamp-2">
          {titulo || "Clavos"}
        </h3>

        <p className="mt-1 text-[12px] text-slate-500">
          {[tipo, medidas, material].filter(Boolean).join(" · ")}
        </p>

        {currentUser?.tipo === "admin" && precio_unidad != null && (
          <div
            className="
              mt-3 inline-flex items-center gap-2 rounded-full
              bg-blue-50 text-blue-700 ring-1 ring-blue-200
              px-2.5 py-1 text-[12px] font-medium
            "
            title="Precio unitario"
          >
            <span className="inline-block size-2.5 rounded-full bg-blue-400" />
            {moneyUYU(precio_unidad)} / unid.
          </div>
        )}

        {comentarios && (
          <div className="mt-3">
            <p className="text-[12px] text-slate-500 mb-1">Comentarios</p>
            <p className="text-sm text-slate-800 line-clamp-2">{comentarios}</p>
          </div>
        )}

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

export default ClavosCard;
