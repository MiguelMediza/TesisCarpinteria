import React from "react";
import { useNavigate } from "react-router-dom";

const colorByStock = (stock) => {
  const n = Number(stock ?? 0);
  if (n < 100) return "bg-red-50 text-red-700 border-red-200";
  if (n < 250) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-orange-50 text-orange-800 border-orange-200";
};

const routeBaseByOrigen = {
  materiaprima: "/materiaprima/listar",
  tipo_tablas: "/tipotablas/listar",
  tipo_tacos: "/tipotacos/listar",
  tipo_patines: "/tipopatines/listar",
  fuego_ya: "/fuegoya/listar",
  pellets: "/pellets/listar",
};

const StockBajo = ({ item }) => {
  const navigate = useNavigate();
  const origen = item?.origen || "";
  const id = item?.id;
  const titulo = item?.titulo || "";
  const stock = Number(item?.stock ?? 0);
  const pill = colorByStock(stock);
  const imgSrc = item?.foto_url || null;

  const goTo = () => {
    const base = routeBaseByOrigen[origen] || "/";
    navigate(base);
  };

  return (
    <div
      className="border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition"
      onClick={goTo}
      title="Ver detalle / editar"
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={titulo}
          loading="lazy"
          className="w-full h-28 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
          sin imagen
        </div>
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2">{titulo}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pill}`}>
            {origen.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Stock</span>
          <span className="text-sm font-semibold text-gray-900">{stock}</span>
        </div>
      </div>
    </div>
  );
};

export default StockBajo;
