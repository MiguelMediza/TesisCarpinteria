import React from "react";

const ProveedorCard = ({ proveedor, onEdit, onDelete }) => {
  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-600">RUT</p>
        <p className="mb-2 text-lg font-semibold text-gray-800">{proveedor.rut}</p>

        <p className="text-sm font-medium text-gray-600">Nombre</p>
        <p className="mb-2 text-gray-800">{proveedor.nombre}</p>

        <p className="text-sm font-medium text-gray-600">Empresa</p>
        <p className="mb-2 text-gray-800">{proveedor.nombre_empresa}</p>

        <p className="text-sm font-medium text-gray-600">Teléfono</p>
        <p className="mb-2 text-gray-800">{proveedor.telefono}</p>

        <p className="text-sm font-medium text-gray-600">Email</p>
        <p className="mb-4 text-gray-800">{proveedor.correo_electronico}</p>
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(proveedor.id_proveedor)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(proveedor.id_proveedor)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default ProveedorCard;