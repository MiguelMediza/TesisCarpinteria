import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";
import { Image } from "antd";
const FuegoYaCard = ({ fuegoya, onEdit, onDelete }) => {
  const { currentUser } = useContext(AuthContext);
  const { id_fuego_ya, tipo, precio_unidad, stock, foto, foto_url } = fuegoya;
  const imgSrc = foto_url || foto || null;

  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {imgSrc && (
          <div className="w-full h-32 mb-4 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
            <Image
              src={imgSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
              loading="lazy"
              fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>"
              preview={{
                mask: <span style={{ fontSize: 12 }}>Click para ampliar</span>,
              }}
            />
          </div>
        )}

        <p className="text-sm text-gray-600">Tipo:</p>
        <p className="mb-2 text-gray-800">{tipo}</p>

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
          onClick={() => onEdit(id_fuego_ya)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_fuego_ya)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default FuegoYaCard;
