import React from "react";

const ClientesFuegoYaCard = ({ cliente, onEdit, onDelete }) => {
  const { id_cliente, nombre, telefono, email, estado } = cliente || {};

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        <div className="flex items-start justify-between mb-2">
          <p className="text-lg font-semibold text-gray-800">
            {nombre}
          </p>
        </div>

        <p className="text-sm text-gray-600">Teléfono:</p>
        <p className="mb-2 text-gray-800">{telefono || "No especificado"}</p>

        <p className="text-sm text-gray-600">Email:</p>
        <p className="mb-2 text-gray-800">{email || "No especificado"}</p>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit?.(id_cliente)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete?.(id_cliente)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ClientesFuegoYaCard;
