import React from "react";

const ClientesCard = ({ cliente, onEdit, onDelete }) => {
  const {
    id_cliente,
    nombre,
    apellido,
    telefono,
    email,
    es_empresa,
    nombre_empresa,
    direccion_empresa,
    email_empresa
  } = cliente;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        <p className="text-lg font-semibold text-gray-800 mb-2">
          {nombre} {apellido || ""}
        </p>

        <p className="text-sm text-gray-600">Teléfono:</p>
        <p className="mb-2 text-gray-800">{telefono || "No especificado"}</p>

        <p className="text-sm text-gray-600">Email:</p>
        <p className="mb-2 text-gray-800">{email || "No especificado"}</p>

        {/* ✅ Mostrar datos de empresa solo si es_empresa es true */}
        {es_empresa ? (
          <>
            <p className="text-sm text-gray-600">Nombre de Empresa:</p>
            <p className="mb-2 text-gray-800">{nombre_empresa}</p>

            <p className="text-sm text-gray-600">Dirección Empresa:</p>
            <p className="mb-2 text-gray-800">{direccion_empresa}</p>

            <p className="text-sm text-gray-600">Email Empresa:</p>
            <p className="mb-2 text-gray-800">{email_empresa}</p>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(id_cliente)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_cliente)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ClientesCard;
