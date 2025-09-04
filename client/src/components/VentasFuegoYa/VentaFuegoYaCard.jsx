import React, { useContext, useMemo, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/authContext";

// colores para badge de pago
const badgePagoClasses = (estadopago) => {
  switch (estadopago) {
    case "pago":
      return "bg-green-100 text-green-800 border border-green-200";
    case "credito":
    default:
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
  }
};

const buttonPagoClasses = (estadopago, disabled) => {
  if (disabled) return "bg-gray-300 text-gray-700 cursor-not-allowed";
  return estadopago === "pago"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-green-600 hover:bg-green-700 text-white";
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (n) => {
  const num = Number(n ?? 0);
  return num.toLocaleString("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 2,
  });
};

const VentaFuegoYaCard = ({ venta, onEdit, onDelete, onPagoChanged }) => {
  const { currentUser } = useContext(AuthContext);

  const {
    id_ventaFuegoya,
    fecha_realizada,
    precio_total,
    comentarios,
    estadopago: estadoInicial = "credito",
    fechapago,
    cliente_display,
    fuego_ya_tipo,
    foto,
    cantidadbolsas,
  } = venta || {};

  const [estadopago, setEstadopago] = useState(estadoInicial);
  const [fechaPagoLocal, setFechaPagoLocal] = useState(fechapago || null);
  const [changing, setChanging] = useState(false);

  const badgeClasses = useMemo(
    () => badgePagoClasses(estadopago),
    [estadopago]
  );

  const togglePago = async () => {
    if (!id_ventaFuegoya) return;
    const nuevo = estadopago === "pago" ? "credito" : "pago";

    const prevEstado = estadopago;
    const prevFecha = fechaPagoLocal;
    setChanging(true);
    setEstadopago(nuevo);
    const nowLocal = new Date().toISOString();
    setFechaPagoLocal(nuevo === "pago" ? nowLocal : null);

    try {
      await axios.put(
        `http://localhost:4000/api/src/ventafuegoya/${id_ventaFuegoya}/estadopago`,
        { estadopago: nuevo }
      );
      onPagoChanged?.(
        id_ventaFuegoya,
        nuevo,
        nuevo === "pago" ? nowLocal : null
      );
    } catch (err) {
      console.error("Error cambiando estado de pago:", err);
      setEstadopago(prevEstado);
      setFechaPagoLocal(prevFecha);
      alert("No se pudo actualizar el estado de pago.");
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="border rounded-lg bg-white shadow-sm flex flex-col justify-between w-full h-full overflow-hidden">
      {foto && (
        <img
          src={`http://localhost:4000/images/venta_fuegoya/${foto}`}
          alt={`Venta ${id_ventaFuegoya}`}
          className="w-full h-40 object-cover"
        />
      )}

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-lg font-semibold text-gray-800">
                Venta Fuegoya #{id_ventaFuegoya}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Cliente:</span>{" "}
                {cliente_display ? cliente_display : "Sin cliente"}
                {fuego_ya_tipo ? ` • ${fuego_ya_tipo}` : ""}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${badgeClasses}`}
              title={`Estado de pago: ${estadopago}`}
            >
              {estadopago === "pago" ? "Pagado" : "En crédito / Sin pagar"}
            </span>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <div>
              <p className="text-sm text-gray-600">Fecha realizada:</p>
              <p className="text-gray-800">
                {fecha_realizada ? formatDate(fecha_realizada) : "No especificada"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Fecha de pago:</p>
              <p className="text-gray-800">
                {fechaPagoLocal
                  ? formatDateTime(fechaPagoLocal)
                  : "En crédito / Sin pagar"}
              </p>
            </div>
          </div>

          {/* Comentarios */}
          {comentarios && (
            <>
              <p className="text-sm text-gray-600">Comentarios:</p>
              <p className="mb-2 text-gray-800">{comentarios}</p>
            </>
          )}

          {/* Cantidad + Precio en una fila */}
          <div className="flex justify-between items-center mt-2">
{/* Cantidad */}
  {typeof cantidadbolsas !== "undefined" && cantidadbolsas !== null && (
    <span className="inline-block text-sm px-3 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
      🧯 {cantidadbolsas} {Number(cantidadbolsas) === 1 ? "bolsa" : "bolsas"}
    </span>
  )}

  {/* Tipo de bolsa */}
  {fuego_ya_tipo && (
    <span className="text-sm text-gray-700 font-medium text-center flex-1">
      {fuego_ya_tipo}
    </span>
  )}

  {/* Precio (solo admin) */}
  {currentUser?.tipo === "admin" && (
    <div className="text-right">
      <p className="text-xs text-gray-600">Precio total:</p>
      <p className="text-gray-900 font-semibold">{formatMoney(precio_total)}</p>
    </div>
  )}
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <button
            onClick={togglePago}
            disabled={changing}
            className={`px-3 py-2 text-sm rounded transition ${buttonPagoClasses(
              estadopago,
              changing
            )}`}
            title={
              estadopago === "pago" ? "Volver a crédito" : "Marcar como pagado"
            }
          >
            {changing
              ? "Guardando…"
              : estadopago === "pago"
              ? "Volver a crédito"
              : "Marcar como pagado"}
          </button>

          <button
            onClick={() => onEdit?.(id_ventaFuegoya)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60"
            title="Editar"
            disabled={changing}
          >
            Editar
          </button>

          <button
            onClick={() => onDelete?.(id_ventaFuegoya)}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-60"
            title="Eliminar"
            disabled={changing}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VentaFuegoYaCard;
