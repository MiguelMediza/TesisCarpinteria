import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const FibrasCard = ({ fibra, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const {
    id_materia_prima,
    titulo,
    precio_unidad,
    stock,
    foto,
    comentarios,
    largo_cm,
    ancho_cm
  } = fibra;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {foto && (
          <img
            src={`http://localhost:4000/images/fibras/${foto}`}
            alt={titulo}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}

        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>

        <p className="text-sm text-gray-600">Dimensiones (cm):</p>
        <p className="mb-2 text-gray-800">{`${largo_cm} × ${ancho_cm}`}</p>

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

export default FibrasCard;
