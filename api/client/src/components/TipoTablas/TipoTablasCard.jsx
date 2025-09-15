import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const TipoTablaCard = ({ tipoTabla, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const {
    id_tipo_tabla,
    titulo,
    largo_cm,
    ancho_cm,
    espesor_mm,
    foto,
    precio_unidad,
    cepillada,
    stock
  } = tipoTabla;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {foto && (
          <img
            src={`http://localhost:4000/images/tipo_tablas/${foto}`}
            alt={titulo}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}

        <p className="text-lg font-semibold text-gray-800 mb-2">{titulo}</p>

        <p className="text-sm text-gray-600">Dimensiones (cm):</p>
        <p className="mb-2 text-gray-800">{`${largo_cm} × ${ancho_cm} × ${espesor_mm}`}</p>

        <p className="text-sm text-gray-600">Cepillada:</p>
        <p className="mb-2 text-gray-800">{cepillada ? "Sí" : "No"}</p>

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
          onClick={() => onEdit(id_tipo_tabla)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_tipo_tabla)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default TipoTablaCard;
