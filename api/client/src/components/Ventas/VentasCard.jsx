import React from "react";

const VentasCard = ({ venta, onEdit, onDelete }) => {
  const {
    id_venta,
    fecha_realizada,
    precio_total,
    nombre_cliente,
    apellido_cliente,
    foto,
    comentarios,
  } = venta;

  // Formatear fecha para mostrar
  const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  };
  return (
    <div className="border rounded-lg p-4 flex flex-col justify-between bg-white shadow-sm">
      <div>
        {foto && (
          <img
            src={`/images/ventas/${foto}`}
            alt={`Venta ${id_venta}`}
            className="w-full h-32 object-cover mb-4 rounded"
          />
        )}

        <p className="text-lg font-semibold text-gray-800 mb-2">
          Venta #{id_venta}
        </p>

        <p className="text-sm text-gray-600">Fecha:</p>
        <p className="mb-2 text-gray-800"> {fecha_realizada ? formatDate(fecha_realizada) : "No especificada"}</p>

        <p className="text-sm text-gray-600">Precio Total:</p>
        <p className="mb-2 text-gray-800">{precio_total}</p>

        {nombre_cliente && (
          <>
            <p className="text-sm text-gray-600">Cliente:</p>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-neutral-900">
                {venta.cliente_display || "—"}
              </span>

              {venta.cliente_eliminado && (
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
                  ELIMINADO
                </span>
              )}
            </div>
          </>
        )}

        {comentarios && (
          <>
            <p className="text-sm text-gray-600">Comentarios:</p>
            <p className="mb-2 text-gray-800">{comentarios}</p>
          </>
        )}
      </div>

      <div className="mt-4 flex space-x-2">
        <button
          onClick={() => onEdit(id_venta)}
          className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(id_venta)}
          className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
};

export default VentasCard;
