import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const PelletsCard = ({ pellet, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const { id_pellet, titulo, bolsa_kilogramos, precio_unidad, stock, foto_url } = pellet;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {foto_url && (
          <img
            src={foto_url}
            alt={titulo}
            loading="lazy"
            className="w-full h-32 object-cover mb-4 rounded"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>

        <p className="text-sm text-gray-600">Bolsa (kg):</p>
        <p className="mb-2 text-gray-800">{bolsa_kilogramos}</p>

        {currentUser?.tipo === "admin" && (
          <>
            <p className="text-sm text-gray-600">Precio Unitario:</p>
            <p className="mb-2 text-gray-800">{precio_unidad}</p>
          </>
        )}

        <p className="text-sm text-gray-600">Stock:</p>
        <p className="mb-2 text-gray-800">{stock}</p>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(id_pellet)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_pellet)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default PelletsCard;
