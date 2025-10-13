
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

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const FuegoYaCard = ({ fuegoya, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const { id_fuego_ya, tipo, precio_unidad, stock, foto, foto_url } = fuegoya || {};
  const imgSrc = foto_url || foto || null;

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
          {tipo || "Fuego Ya"}
        </h3>

        {/* Badge de categoría (arriba a la derecha) */}
        <span
          className="
            absolute top-3 right-3 px-2 py-0.5 text-[11px] font-medium
            rounded-full ring-1 shadow-sm bg-sky-50 text-sky-700 ring-sky-200
          "
        >
          Fuego Ya
        </span>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Imagen (antd) */}
        {imgSrc ? (
          <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-50 ring-1 ring-slate-200">
            <Image
              src={imgSrc}
              alt={tipo || "Fuego Ya"}
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
        ) : (
          <div className="w-full h-44 rounded-xl bg-slate-50 ring-1 ring-slate-200 grid place-items-center text-slate-400 text-sm select-none">
            Sin imagen
          </div>
        )}

        {/* Chips de info */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className={`${chipBase} ${colorByStock(stock)}`}
            title="Stock disponible"
          >
            <span className="inline-block size-2.5 rounded-full bg-current/40" />
            Stock: {Number(stock ?? 0)}
          </span>

          {isAdmin && precio_unidad != null && (
            <span
              className={`${chipBase} bg-blue-50 text-blue-700 ring-blue-200`}
              title="Precio unitario"
            >
              <span className="inline-block size-2.5 rounded-full bg-blue-400" />
              {moneyUYU(precio_unidad)} / unid.
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_fuego_ya)}
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
            onClick={() => onDelete?.(id_fuego_ya)}
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

export default FuegoYaCard;
