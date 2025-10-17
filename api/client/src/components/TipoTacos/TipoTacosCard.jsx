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

const TipoTacosCard = ({ tipoTaco, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const isAdmin = currentUser?.tipo === "admin";

  const {
    id_tipo_taco,
    titulo,
    largo_cm,
    ancho_cm,
    espesor_mm,
    foto,
    foto_url,
    precio_unidad,
    stock,
  } = tipoTaco || {};

  const R2 = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/, "");
  let imageUrl = null;
  if (foto_url) imageUrl = foto_url;
  else if (typeof foto === "string" && foto) {
    imageUrl = /^https?:\/\//i.test(foto)
      ? foto
      : `${R2}/${String(foto).replace(/^\/+/, "")}`;
  }

  const dimensiones =
    [largo_cm, ancho_cm, espesor_mm].some((v) => v != null)
      ? `${largo_cm ?? "—"} × ${ancho_cm ?? "—"} × ${espesor_mm ?? "—"}`
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
      {imageUrl ? (
        <div className="relative h-36 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={titulo || "Tipo de taco"}
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
          {titulo || "Tipo de taco"}
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
            <p className="text-[12px] text-slate-500">Dimensiones (cm × cm × cm)</p>
            <p className="text-sm font-medium text-slate-800">{dimensiones}</p>
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-[12px] text-slate-500">Precio unitario</p>
              <p className="text-sm text-slate-800">
                {precio_unidad != null ? `${moneyUYU(precio_unidad)} / unid.` : "—"}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onEdit?.(id_tipo_taco)}
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
          onClick={() => onDelete?.(id_tipo_taco)}
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

export default TipoTacosCard;
