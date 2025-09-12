// src/components/Home/LowStockCard.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const colorByStock = (stock) => {
  if (stock < 100)  return "bg-red-50 text-red-700 border-red-200";
  if (stock < 250)  return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-orange-50 text-orange-800 border-orange-200";
};

// Map para navegar rápido a la pantalla adecuada
const routeBaseByOrigen = {
  materiaprima: "/materiaprima/listar",
  tipo_tablas:  "/tipotablas/listar",
  tipo_tacos:   "/tipotacos/listar",
  tipo_patines: "/tipopatines/listar",
  fuego_ya:     "/fuegoya/listar",
  pellets:      "/pellets/listar",
};

const StockBajo = ({ item }) => {
  const navigate = useNavigate();
  const { origen, id, titulo, stock, foto_url } = item;
  const pill = colorByStock(stock);

  const goTo = () => {
    const base = routeBaseByOrigen[origen] || "/";
    navigate(base); // o navigate(`${base}/${id}`) si querés ir directo al detalle/edición
  };

  return (
    <div
      className="border rounded-lg bg-white shadow-sm overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition"
      onClick={goTo}
      title="Ver detalle / editar"
    >
      {foto_url ? (
        <img src={foto_url} alt={titulo} className="w-full h-28 object-cover" />
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
