import React, { useContext } from "react";
import { AuthContext } from "../../context/authContext";

const EncargosCard = ({ encargo, onEdit, onDelete, onMarkReceived, marking = false }) => {
  const { currentUser } = useContext(AuthContext);

  const {
    id_encargo,
    fecha_realizado,
    fecha_prevista_llegada,
    comentarios,
    nombre_empresa,
    estado,
    detalles = []
  } = encargo;

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const estadoClasses =
    estado === "recibido"
      ? "bg-green-100 text-green-800 border border-green-200"
      : "bg-blue-100 text-blue-800 border border-blue-200";

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between w-full h-full">

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-lg font-semibold text-gray-800">
            Encargo #{id_encargo}
          </p>
          <span
            className={`text-xs px-2 py-1 rounded-full ${estadoClasses}`}
            title={`Estado: ${estado || "sin estado"}`}
          >
            {estado || "Sin estado"}
          </span>
        </div>

        <p className="text-sm text-gray-600">Proveedor:</p>
        <p className="mb-2 text-gray-800">{nombre_empresa || "Sin proveedor"}</p>

        <p className="text-sm text-gray-600">Fecha realizada:</p>
        <p className="mb-2 text-gray-800">
          {fecha_realizado ? formatDate(fecha_realizado) : "No especificada"}
        </p>

        <p className="text-sm text-gray-600">Fecha prevista de llegada:</p>
        <p className="mb-2 text-gray-800">
          {fecha_prevista_llegada ? formatDate(fecha_prevista_llegada) : "No especificada"}
        </p>

        <p className="text-sm text-gray-600">Comentarios:</p>
        <p className="mb-2 text-gray-800">{comentarios || "Sin comentarios"}</p>

        <p className="text-sm font-semibold text-gray-700 mt-4">📦 Materias primas incluidas:</p>
        <ul className="list-disc pl-5 text-gray-800">
          {detalles.length > 0 ? (
            detalles.map((item, index) => (
              <li key={index} className="mt-1">
                {item.titulo} – {item.cantidad} unidades
              </li>
            ))
          ) : (
            <li>No hay materias primas cargadas</li>
          )}
        </ul>
      </div>

      <div className="mt-4 flex space-x-3">
        {estado === "realizado" && (
          <button
            onClick={() => onMarkReceived?.(id_encargo)}
            disabled={marking}
            className={`flex-1 py-2 text-xs rounded text-white transition
              ${marking ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
            title="Marcar como recibido"
          >
            {marking ? "Marcando..." : "Recibido"}
          </button>
        )}
        <button
          onClick={() => onEdit(id_encargo)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          title="Editar"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_encargo)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          title="Eliminar"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default EncargosCard;
