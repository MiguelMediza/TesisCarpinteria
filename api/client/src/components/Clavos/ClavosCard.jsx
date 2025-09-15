import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const ClavosCard = ({ clavo, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const {
    id_materia_prima,
    titulo,
    precio_unidad,
    stock,
    foto,
    comentarios,
    tipo,
    medidas,
    material
  } = clavo;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {foto && (
          <img
            src={`/images/clavos/${encodeURIComponent(foto)}`}
            alt={titulo}
            loading="lazy"
            onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}

        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>

        <p className="text-sm text-gray-600">Tipo:</p>
        <p className="mb-2 text-gray-800">{tipo}</p>

        <p className="text-sm text-gray-600">Medidas:</p>
        <p className="mb-2 text-gray-800">{medidas}</p>

        <p className="text-sm text-gray-600">Material:</p>
        <p className="mb-2 text-gray-800">{material}</p>

        {currentUser?.tipo === "admin" && (
          <>
            <p className="text-sm text-gray-600">Precio Unitario:</p>
            <p className="mb-2 text-gray-800">{precio_unidad}</p>
          </>
        )}

        <p className="text-sm text-gray-600">Stock:</p>
        <p className="mb-2 text-gray-800">{stock}</p>

        <p className="text-sm text-gray-600">Comentarios:</p>
        <p className="mb-2 text-gray-800">{comentarios}</p>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(id_materia_prima)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_materia_prima)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ClavosCard;
