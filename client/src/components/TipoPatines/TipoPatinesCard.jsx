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
    tabla_padre,
    taco_padre,
    comentarios,
  } = tipoPatin;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {/* Imagen del patín */}
        {logo && (
          <img
            src={`http://localhost:4000/images/tipo_patines/${logo}`}
            alt={titulo}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}

        {/* Título */}
        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>

        {/* Información de padres */}
        <p className="text-sm text-gray-600">Tabla utilizada:</p>
        <p className="mb-2 text-gray-800">{tabla_padre || "N/A"}</p>

        <p className="text-sm text-gray-600">Taco utilizado:</p>
        <p className="mb-2 text-gray-800">{taco_padre || "N/A"}</p>

        {/* Medidas */}
        {medidas && (
          <>
            <p className="text-sm text-gray-600">Medidas:</p>
            <p className="mb-2 text-gray-800">{medidas}</p>
          </>
        )}

        {/* Comentarios */}
        {comentarios && (
          <>
            <p className="text-sm text-gray-600">Comentarios:</p>
            <p className="mb-2 text-gray-800">{comentarios}</p>
          </>
        )}

        {/* Precio solo visible para admin */}
        {currentUser?.tipo === "admin" && (
          <>
            <p className="text-sm text-gray-600">Precio Unitario:</p>
            <p className="mb-2 text-gray-800">${precio_unidad}</p>
          </>
        )}

        {/* Stock */}
        <p className="text-sm text-gray-600">Stock:</p>
        <p className="mb-2 text-gray-800">{stock}</p>
      </div>

      {/* Botones de acción */}
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