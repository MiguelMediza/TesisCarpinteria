import React from "react";
import { useNavigate } from "react-router-dom";

const severityPill = (stock) => {
  const n = Number(stock ?? 0);
  if (n < 100)
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
  if (n < 250)
    return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
  return "bg-orange-50 text-orange-800 ring-1 ring-orange-200";
};

const routeBaseByOrigen = {
  materiaprima: "/materiaprima/listar",
  tipo_tablas: "/tipotablas/listar",
  tipo_tacos: "/tipotacos/listar",
  tipo_patines: "/tipopatines/listar",
  fuego_ya: "/fuegoya/listar",
  pellets: "/pellets/listar",
};

const prettifyOrigen = (o) =>
  (o || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

const StockBajo = ({ item }) => {
  const navigate = useNavigate();
  const origen = item?.origen || "";
  const titulo = item?.titulo || "";
  const stock = Number(item?.stock ?? 0);
  const imgSrc = item?.foto_url || null;

  const goTo = () => {
    const base = routeBaseByOrigen[origen] || "/";
    navigate(base);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goTo();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goTo}
      onKeyDown={onKeyDown}
      title="Ver detalle / editar"
      className="
        group relative overflow-hidden cursor-pointer
        rounded-2xl bg-white shadow-md ring-1 ring-slate-200/70
        transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none
        focus-visible:ring-2 focus-visible:ring-blue-500/70
      "
    >
      <div className="relative h-32 md:h-36 bg-slate-100">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={titulo}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-400 text-sm">
            Sin imagen
          </div>
        )}

        <div className="absolute left-2 top-2">
          <span className="
            inline-flex items-center gap-1 rounded-full
            bg-white/80 backdrop-blur px-2.5 py-1 text-[10px] font-medium
            text-slate-700 ring-1 ring-slate-200
          ">
            {prettifyOrigen(origen)}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">
          {titulo}
        </h3>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">Stock</span>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${severityPill(stock)}`}>
              {stock < 100 ? "Crítico" : stock < 250 ? "Bajo" : "Atención"}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {stock}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockBajo;
