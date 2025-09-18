import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const TipoPatinesCard = ({ tipoPatin, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
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
  } = tipoPatin;

  const BASE = (import.meta.env.VITE_R2_PUBLIC_BASE || "").replace(/\/+$/,"");
  const key  = (logo || "").replace(/^\/+/,"");
  const logoUrl = logo_url || (key ? `${BASE}/${key}` : null);

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={titulo}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}
        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>
        <p className="text-sm text-gray-600">Tabla utilizada:</p>
        <p className="mb-2 text-gray-800">{tabla_padre || "N/A"}</p>
        <p className="text-sm text-gray-600">Taco utilizado:</p>
        <p className="mb-2 text-gray-800">{taco_padre || "N/A"}</p>
        {medidas && (
          <>
            <p className="text-sm text-gray-600">Medidas:</p>
            <p className="mb-2 text-gray-800">{medidas}</p>
          </>
        )}
        {comentarios && (
          <>
            <p className="text-sm text-gray-600">Comentarios:</p>
            <p className="mb-2 text-gray-800">{comentarios}</p>
          </>
        )}
        {currentUser?.tipo === "admin" && (
          <>
            <p className="text-sm text-gray-600">Precio Unitario:</p>
            <p className="mb-2 text-gray-800">${precio_unidad}</p>
          </>
        )}
        <p className="text-sm text-gray-600">Stock:</p>
        <p className="mb-2 text-gray-800">{stock}</p>
      </div>
      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(id_tipo_patin)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_tipo_patin)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default TipoPatinesCard;
