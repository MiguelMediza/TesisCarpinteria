import React, { useMemo, useRef, useState } from "react";
import { api } from "../../api";
import PedidoPDFInline from "./PedidosPDF";
import ProduccionStockModal from "./ProduccionStockModal";

const ESTADOS = ["pendiente", "en_produccion", "listo", "entregado", "cancelado"];

const pillByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-800 ring-yellow-200";
    case "en_produccion":
      return "bg-blue-50 text-blue-800 ring-blue-200";
    case "listo":
      return "bg-indigo-50 text-indigo-800 ring-indigo-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "cancelado":
      return "bg-red-50 text-red-700 ring-red-200";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
};

const selectClassesByEstado = (estado) => {
  switch (estado) {
    case "pendiente":
      return "bg-yellow-50 text-yellow-900 border-yellow-200";
    case "en_produccion":
      return "bg-blue-50 text-blue-900 border-blue-200";
    case "listo":
      return "bg-indigo-50 text-indigo-900 border-indigo-200";
    case "entregado":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "cancelado":
      return "bg-red-50 text-red-900 border-red-200";
    default:
      return "bg-white text-gray-900 border-gray-300";
  }
};

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] ring-1";

const formatDate = (value) => {
  if (!value) return "";

  const s = String(value).trim();

  // Agarra SIEMPRE la parte YYYY-MM-DD aunque venga con hora/UTC:
  // "2026-01-01" o "2026-01-01T00:00:00.000Z" o "2026-01-01 00:00:00"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`; // es-ES
  }

  // fallback por si viene otra cosa rara
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};


const buildFaltantesAlert = (msg, falt) => {
  const detalle = (falt || [])
    .map(
      (f) =>
        `• ${f.categoria} #${f.id_item}: requiere ${f.requerido}, disponible ${f.disponible}${
          f.motivo ? ` (${f.motivo})` : ""
        }`
    )
    .join("\n");
  return `${msg}\n\n${detalle}`;
};

const PedidosCard = ({ pedido, onEdit, onDelete, onEstadoChanged }) => {
  const {
    id_pedido,
    fecha_realizado,
    fecha_de_entrega,
    comentarios,
    cliente_display,
    items = [],
  } = pedido || {};

  const [estado, setEstado] = useState(pedido?.estado || "pendiente");
  const [changing, setChanging] = useState(false);

  // Modal producción
  const [openProdModal, setOpenProdModal] = useState(false);

  // Guardamos el "estado destino" que el user eligió mientras el modal está abierto
  const pendingEstadoRef = useRef(null);

  const estadoPill = useMemo(() => pillByEstado(estado), [estado]);

  // 🔹 Resumen de pallets: totales, desde stock y a producir
  const resumenPallets = useMemo(() => {
    let total = 0;
    let desdeStock = 0;
    let aProducir = 0;

    (items || []).forEach((it) => {
      const totalItem = Number(it.cantidad_pallets || 0);
      const desdeItem = Number(it.cantidad_desde_stock || 0);
      const producirItem =
        it.cantidad_a_producir != null
          ? Number(it.cantidad_a_producir || 0)
          : Math.max(totalItem - desdeItem, 0);

      total += totalItem;
      desdeStock += Math.max(desdeItem, 0);
      aProducir += Math.max(producirItem, 0);
    });

    return {
      total,
      desdeStock,
      aProducir,
      usaStock: desdeStock > 0,
    };
  }, [items]);

  /**
   * PUT estado con fallback (por si tu router está montado distinto):
   * - Preferimos /pedidos/:id/estado
   * - Si da 404, intentamos /:id/estado
   */
  const doPutEstado = async (nuevoEstado, extraBody = {}) => {
    try {
      await api.put(`/pedidos/${id_pedido}/estado`, {
        estado: nuevoEstado,
        ...extraBody,
      });
    } catch (err) {
      // fallback si montaste el router en /pedidos y en api ya tenés /pedidos
      if (err?.response?.status === 404) {
        await api.put(`/${id_pedido}/estado`, { estado: nuevoEstado, ...extraBody });
      } else {
        throw err;
      }
    }

    onEstadoChanged?.(id_pedido, nuevoEstado);
  };

  const handleEstadoChange = async (e) => {
    const nuevo = e.target.value;
    if (nuevo === estado) return;

    const anterior = estado;

    /**
     * ✅ Interceptar salida de pendiente hacia estados que consumen stock.
     * En tu backend: al pasar de pendiente -> (en_produccion/listo/entregado) se descuentan insumos.
     */
    const requiereModal =
      anterior === "pendiente" && ["en_produccion", "listo", "entregado"].includes(nuevo);

    if (requiereModal) {
      pendingEstadoRef.current = nuevo; // guardamos el destino real
      setOpenProdModal(true);
      return;
    }

    setEstado(nuevo);
    setChanging(true);

    try {
      await doPutEstado(nuevo);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      setEstado(anterior);

      const msg =
        err?.response?.data?.message || "No se pudo actualizar el estado del pedido.";
      const falt = err?.response?.data?.faltantes;

      if (err?.response?.status === 409 && Array.isArray(falt) && falt.length) {
        alert(buildFaltantesAlert(msg, falt));
      } else {
        alert(msg);
      }
    } finally {
      setChanging(false);
    }
  };

  /**
   * Confirmación desde el modal:
   * - manda insumos_stock al endpoint de estado
   * - cambia al estado que el usuario eligió (en_produccion / listo / entregado)
   */
  const confirmProduccion = async ({ insumos_stock }) => {
    const anterior = estado;
    const destino = pendingEstadoRef.current || "en_produccion";

    setChanging(true);

    try {
      await doPutEstado(destino, { insumos_stock });
      setEstado(destino);
      setOpenProdModal(false);
      pendingEstadoRef.current = null;
    } catch (err) {
      // El modal puede mostrar el error si vos haces throw
      console.error("Error iniciando producción/cambio con insumos:", err);

      // restaurar estado visual
      setEstado(anterior);

      // si es faltante, dejamos que el modal lo muestre si quiere:
      throw err;
    } finally {
      setChanging(false);
    }
  };

  /**
   * Si el usuario cierra el modal sin confirmar:
   * - volvemos el select visual al estado anterior (no cambia nada en BD)
   */
  const handleCloseModal = () => {
    setOpenProdModal(false);
    pendingEstadoRef.current = null;
    // no tocamos estado porque nunca lo cambiamos aún (solo se cambia al confirmar)
  };

  return (
    <>
      <div
        className="
          group relative overflow-hidden rounded-2xl bg-white
          shadow-sm ring-1 ring-slate-900/5 transition
          hover:-translate-y-0.5 hover:shadow-lg flex flex-col
        "
      >
        {/* Cabecera con gradiente */}
        <div className="relative h-20 w-full bg-gradient-to-r from-sky-50 to-indigo-50">
          <h3
            className="
              absolute inset-0 flex items-center justify-center
              px-4 text-center text-base font-semibold text-slate-900
              leading-tight line-clamp-2
            "
          >
            Pedido #{id_pedido}
          </h3>

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <PedidoPDFInline pedido={pedido} />

            <span
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 shadow-sm ${estadoPill}`}
              title={`Estado: ${estado.replace("_", " ")}`}
            >
              {estado.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Cliente + info de uso de stock */}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <span
              className={`${chipBase} bg-amber-50 text-amber-700 ring-amber-200`}
              title={cliente_display || "Cliente sin nombre"}
            >
              <span className="inline-block size-2.5 rounded-full bg-amber-400" />
              {cliente_display || "Cliente sin nombre"}
            </span>

            {resumenPallets.usaStock && (
              <span
                className={`${chipBase} bg-sky-50 text-sky-700 ring-sky-200`}
                title="Este pedido utiliza pallets ya existentes en stock."
              >
                <span className="inline-block size-2.5 rounded-full bg-sky-400" />
                Usa stock existente
              </span>
            )}
          </div>

          {/* Fechas */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[12px] text-slate-500">Fecha realizado</p>
              <p className="text-sm font-medium text-slate-800">
                {fecha_realizado ? formatDate(fecha_realizado) : "No especificada"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[12px] text-slate-500">Fecha de entrega fijada</p>
              <p className="text-sm font-medium text-slate-800">
                {fecha_de_entrega ? formatDate(fecha_de_entrega) : "No especificada"}
              </p>
            </div>
          </div>

          {/* Comentarios del pedido */}
          {comentarios?.toString().trim() && (
            <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
              <p className="text-[12px] text-slate-500 mb-1">Comentarios</p>
              <p className="text-sm text-slate-800">{comentarios}</p>
            </div>
          )}

          {/* Ítems */}
          <div className="mt-3 rounded-xl border border-slate-100 bg-white p-3">
            <p className="text-[12px] text-slate-500 mb-2">
              🧱 Ítems del pedido{" "}
              {resumenPallets.total > 0 && (
                <span className="ml-1 text-[11px] text-slate-500">
                  — Total: {resumenPallets.total} u.
                  {resumenPallets.desdeStock > 0 &&
                    ` · Desde stock: ${resumenPallets.desdeStock} u.`}
                  {resumenPallets.aProducir > 0 &&
                    ` · A producir: ${resumenPallets.aProducir} u.`}
                </span>
              )}
            </p>

            <ul className="list-disc pl-5 text-sm text-slate-800 space-y-2">
              {items.length > 0 ? (
                items.map((it, idx) => {
                  const qtyTotal = Number(it.cantidad_pallets || 0);
                  const qtyStock = Number(it.cantidad_desde_stock || 0);
                  const qtyProd =
                    it.cantidad_a_producir != null
                      ? Number(it.cantidad_a_producir || 0)
                      : Math.max(qtyTotal - qtyStock, 0);

                  const muestraDetalleStock =
                    qtyStock > 0 || qtyProd > 0 || qtyTotal > 0;

                  return (
                    <li key={idx}>
                      <div className="flex flex-col">
                        <div>
                          <span className="font-medium">
                            {it.prototipo_titulo || `Prototipo #${it.id_prototipo}`}
                          </span>
                          {it.medidas ? ` — ${it.medidas}` : ""}{" "}
                        </div>

                        {muestraDetalleStock && (
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                            <span className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}>
                              <span className="inline-block size-2 rounded-full bg-slate-400" />
                              Total: {qtyTotal} u.
                            </span>
                            {qtyStock > 0 && (
                              <span className={`${chipBase} bg-sky-50 text-sky-700 ring-sky-200`}>
                                <span className="inline-block size-2 rounded-full bg-sky-400" />
                                Desde stock: {qtyStock} u.
                              </span>
                            )}
                            {qtyProd > 0 && (
                              <span className={`${chipBase} bg-emerald-50 text-emerald-700 ring-emerald-200`}>
                                <span className="inline-block size-2 rounded-full bg-emerald-400" />
                                A producir: {qtyProd} u.
                              </span>
                            )}
                          </div>
                        )}

                        {(it.numero_lote?.trim() || it.numero_tratamiento?.trim()) && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {it.numero_lote?.trim() && (
                              <span
                                className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}
                                title={`Lote: ${it.numero_lote}`}
                              >
                                <span className="inline-block size-2.5 rounded-full bg-slate-400" />
                                Lote: {it.numero_lote}
                              </span>
                            )}
                            {it.numero_tratamiento?.trim() && (
                              <span
                                className={`${chipBase} bg-slate-50 text-slate-700 ring-slate-200`}
                                title={`Tratamiento: ${it.numero_tratamiento}`}
                              >
                                <span className="inline-block size-2.5 rounded-full bg-slate-400" />
                                Trat.: {it.numero_tratamiento}
                              </span>
                            )}
                          </div>
                        )}

                        {(it.comentarios ?? "").toString().trim() && (
                          <p className="mt-1 text-xs text-slate-600 italic">{it.comentarios}</p>
                        )}
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-slate-600">No hay ítems cargados</li>
              )}
            </ul>
          </div>

          {/* Footer: estado + acciones */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-700">Estado:</label>
              <select
                className={`text-sm border rounded px-2 py-1 transition ${selectClassesByEstado(estado)}`}
                value={estado}
                onChange={handleEstadoChange}
                disabled={changing}
                title="Cambiar estado"
              >
                {ESTADOS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "pendiente"
                      ? "⏳"
                      : opt === "en_produccion"
                      ? "🛠️"
                      : opt === "listo"
                      ? "📦"
                      : opt === "entregado"
                      ? "✅"
                      : opt === "cancelado"
                      ? "❌"
                      : "•"}{" "}
                    {opt.replace("_", " ")}
                  </option>
                ))}
              </select>
              {changing && <span className="text-xs text-slate-500">Guardando…</span>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit?.(id_pedido)}
                className="
                  px-3 py-2 text-sm bg-blue-600 text-white rounded
                  hover:bg-blue-700 transition disabled:opacity-60
                "
                title="Editar"
                disabled={changing}
              >
                Editar
              </button>

              <button
                onClick={() => onDelete?.(id_pedido)}
                className="
                  px-3 py-2 text-sm bg-red-50 text-red-700 ring-1 ring-red-200 rounded
                  hover:bg-red-100 transition disabled:opacity-60
                "
                title="Eliminar"
                disabled={changing}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: se abre al salir de pendiente a estados que consumen  stock */}
      <ProduccionStockModal
        isOpen={openProdModal}
        pedidoId={id_pedido}
        onClose={handleCloseModal}
        onConfirm={confirmProduccion}
      />
    </>
  );
};

export default PedidosCard;
